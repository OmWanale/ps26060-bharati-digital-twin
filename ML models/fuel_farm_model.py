import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUT, exist_ok=True)


def load_energy(path=os.path.join(BASE_DIR, "01_energy_telemetry.csv")):
    e = pd.read_csv(path, parse_dates=["timestamp"])
    agg = e.groupby("timestamp").agg(
        total_power_kw=("total_power_kw", "sum"),
        avg_load_pct=("generator_load_pct", "mean"),
        avg_gen_temp=("generator_temp_c", "mean"),
        max_gen_temp=("generator_temp_c", "max"),
        n_maintenance=("status", lambda s: (s == "MAINTENANCE").sum()),
    ).reset_index()
    return agg


def load_fuel(path=os.path.join(BASE_DIR, "02_fuel_inventory.csv")):
    return pd.read_csv(path, parse_dates=["timestamp"])


def merge(energy, fuel):
    return pd.merge(energy, fuel, on="timestamp", how="inner").set_index("timestamp")


# ---------------------------------------------------------------------------
# 1. Fuel consumption ~ energy demand (regression)
# ---------------------------------------------------------------------------
def consumption_vs_power_model(df, test_frac=0.15):
    features = ["total_power_kw", "avg_load_pct", "avg_gen_temp", "max_gen_temp", "n_maintenance"]
    X, y = df[features], df["fuel_consumption_lph"]
    n_test = int(len(df) * test_frac)
    X_train, X_test = X.iloc[:-n_test], X.iloc[-n_test:]
    y_train, y_test = y.iloc[:-n_test], y.iloc[-n_test:]

    model = RandomForestRegressor(n_estimators=300, max_depth=8, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    r2 = model.score(X_test, y_test)
    print(f"[fuel-consumption-from-energy] MAE={mae:.2f} L/hr  RMSE={rmse:.2f}  R2={r2:.3f}")

    importances = pd.Series(model.feature_importances_, index=features).sort_values()
    plt.figure(figsize=(7, 4))
    importances.plot(kind="barh")
    plt.title("Feature importance: predicting fuel_consumption_lph from energy telemetry")
    plt.tight_layout()
    plt.savefig(f"{OUT}/fuel_from_energy_importance.png", dpi=140)
    plt.close()

    plt.figure(figsize=(10, 4))
    plt.scatter(df["total_power_kw"], df["fuel_consumption_lph"], s=4, alpha=0.4)
    plt.xlabel("total_power_kw")
    plt.ylabel("fuel_consumption_lph")
    plt.title("Energy demand vs fuel consumption (raw correlation)")
    plt.tight_layout()
    plt.savefig(f"{OUT}/energy_vs_fuel_scatter.png", dpi=140)
    plt.close()

    return model, {"mae": mae, "rmse": rmse, "r2": r2}


# ---------------------------------------------------------------------------
# 2. Fuel level forecast (time series, with energy as exogenous feature)
# ---------------------------------------------------------------------------
def make_forecast_features(df, target="fuel_level_l", lags=(1, 2, 3, 6, 12, 24, 48)):
    feat = pd.DataFrame(index=df.index)
    for lag in lags:
        feat[f"{target}_lag{lag}"] = df[target].shift(lag)
    feat["power_lag1"] = df["total_power_kw"].shift(1)
    feat["power_roll_mean_24"] = df["total_power_kw"].shift(1).rolling(24).mean()
    feat["hour"] = df.index.hour
    feat["day_of_cycle"] = (df.index - df.index[0]).days % 14
    feat["target"] = df[target]
    return feat.dropna()


def fuel_level_forecast_model(df, test_frac=0.15):
    feat = make_forecast_features(df)
    n_test = int(len(feat) * test_frac)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train.drop(columns="target"), train["target"]
    X_test, y_test = test.drop(columns="target"), test["target"]

    model = RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    print(f"[fuel-level-forecast] MAE={mae:.1f} L  RMSE={rmse:.1f} L")

    plt.figure(figsize=(11, 4))
    plt.plot(y_test.index, y_test.values, label="actual", linewidth=1)
    plt.plot(y_test.index, pred, label="predicted", linewidth=1, alpha=0.8)
    plt.title("Fuel level forecast vs actual (test set)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"{OUT}/fuel_level_forecast.png", dpi=140)
    plt.close()

    return model, {"mae": mae, "rmse": rmse}


# ---------------------------------------------------------------------------
# 3. Resupply-within-24h classifier
# ---------------------------------------------------------------------------
def resupply_timing_model(df, test_frac=0.15):
    df = df.copy()
    df["resupply_flag"] = (df["resupply_status"] == "SCHEDULED").astype(int)
    df["resupply_next_24h"] = (
        df["resupply_flag"].shift(-1).rolling(24, min_periods=1).max().shift(-23).fillna(0).astype(int)
    )

    features = ["fuel_level_l", "estimated_days_remaining", "fuel_consumption_lph", "total_power_kw"]
    feat = df[features + ["resupply_next_24h"]].dropna()

    n_test = int(len(feat) * test_frac)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train[features], train["resupply_next_24h"]
    X_test, y_test = test[features], test["resupply_next_24h"]

    model = RandomForestClassifier(n_estimators=300, max_depth=6, class_weight="balanced", random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    print("[resupply-within-24h] classification report:")
    print(classification_report(y_test, pred, zero_division=0))

    return model


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    energy = load_energy()
    fuel = load_fuel()
    df = merge(energy, fuel)

    print("--- Model 1: fuel consumption predicted from energy demand ---")
    consumption_vs_power_model(df)

    print("\n--- Model 2: fuel level forecast (time series) ---")
    fuel_level_forecast_model(df)

    print("\n--- Model 3: resupply-within-24h classifier ---")
    resupply_timing_model(df)

    print("\nDone. Plots written to", OUT)