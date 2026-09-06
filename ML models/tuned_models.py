import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error

from fuel_farm_model import load_energy, load_fuel, merge as merge_fuel

PARAM_GRID = {
    "n_estimators": [200, 300, 400],
    "max_depth": [8, 10, 14, None],
    "min_samples_leaf": [1, 2, 4],
    "max_features": ["sqrt", 0.6, 1.0],
}


def tune(X, y, n_iter=10):
    tscv = TimeSeriesSplit(n_splits=3)
    search = RandomizedSearchCV(
        RandomForestRegressor(random_state=42),
        PARAM_GRID,
        n_iter=n_iter,
        cv=tscv,
        scoring="neg_mean_absolute_error",
        random_state=42,
        n_jobs=-1,
    )
    search.fit(X, y)
    return search.best_estimator_, search.best_params_


def richer_lag_features(series, aux=None, lags=(1, 2, 3, 6, 12, 24, 48, 72, 96)):
    feat = pd.DataFrame(index=series.index)
    for lag in lags:
        feat[f"lag{lag}"] = series.shift(lag)
    feat["roll_mean_24"] = series.shift(1).rolling(24).mean()
    feat["roll_std_24"] = series.shift(1).rolling(24).std()
    feat["roll_min_24"] = series.shift(1).rolling(24).min()
    feat["roll_max_24"] = series.shift(1).rolling(24).max()
    feat["roll_mean_72"] = series.shift(1).rolling(72).mean()
    feat["hour"] = series.index.hour
    feat["day_of_week"] = series.index.dayofweek
    if aux is not None:
        for name, s in aux.items():
            feat[name] = s
    feat["target"] = series
    return feat.dropna()


def evaluate_split(feat, model, test_frac=0.15):
    n_test = int(len(feat) * test_frac)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train.drop(columns="target"), train["target"]
    X_test, y_test = test.drop(columns="target"), test["target"]
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    return mean_absolute_error(y_test, pred), model, X_train.columns


def tune_fuel_level():
    print("=== Fuel level forecast ===")
    energy = load_energy()
    fuel = load_fuel()
    df = merge_fuel(energy, fuel)

    baseline_feat_old = pd.DataFrame(index=df.index)
    for lag in (1, 2, 3, 6, 12, 24, 48):
        baseline_feat_old[f"lag{lag}"] = df["fuel_level_l"].shift(lag)
    baseline_feat_old["power_lag1"] = df["total_power_kw"].shift(1)
    baseline_feat_old["hour"] = df.index.hour
    baseline_feat_old["target"] = df["fuel_level_l"]
    baseline_feat_old = baseline_feat_old.dropna()
    baseline_mae, _, _ = evaluate_split(baseline_feat_old, RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42))
    print(f"baseline MAE: {baseline_mae:.2f} L")

    feat = richer_lag_features(
        df["fuel_level_l"],
        aux={
            "power_lag1": df["total_power_kw"].shift(1),
            "day_of_cycle": pd.Series((df.index - df.index[0]).days % 14, index=df.index),
        },
    )
    n_test = int(len(feat) * 0.15)
    train = feat.iloc[:-n_test]
    X_train, y_train = train.drop(columns="target"), train["target"]
    best_model, best_params = tune(X_train, y_train)
    print("best params:", best_params)

    tuned_mae, tuned_model, cols = evaluate_split(feat, best_model)
    print(f"tuned MAE: {tuned_mae:.2f} L  (improvement: {baseline_mae - tuned_mae:+.2f} L)")
    return tuned_model, cols


def tune_equipment_health():
    print("\n=== Equipment health_score ===")
    df = pd.read_csv("03_equipment_telemetry.csv", parse_dates=["timestamp"])
    df = pd.get_dummies(df, columns=["equipment_type"], prefix="type")
    type_cols = [c for c in df.columns if c.startswith("type_")]
    features = ["runtime_hours", "temperature_c", "vibration_mm_s", "power_kw", "pressure"] + type_cols

    n_test = int(len(df) * 0.15)
    train, test = df.iloc[:-n_test], df.iloc[-n_test:]

    baseline = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
    baseline.fit(train[features], train["health_score"])
    baseline_mae = mean_absolute_error(test["health_score"], baseline.predict(test[features]))
    print(f"baseline MAE: {baseline_mae:.3f}")

    best_model, best_params = tune(train[features], train["health_score"])
    print("best params:", best_params)
    best_model.fit(train[features], train["health_score"])
    tuned_mae = mean_absolute_error(test["health_score"], best_model.predict(test[features]))
    print(f"tuned MAE: {tuned_mae:.3f}  (improvement: {baseline_mae - tuned_mae:+.3f})")
    return best_model, features


def tune_water_level():
    print("\n=== Water tank_level_pct forecast ===")
    df = pd.read_csv("05_water_telemetry.csv", parse_dates=["timestamp"])
    station = df.groupby("timestamp").agg(
        tank_level_pct=("tank_level_pct", "mean"),
        output_flow_lpm=("output_flow_lpm", "mean"),
    )

    baseline_feat = pd.DataFrame(index=station.index)
    for lag in (1, 2, 3, 6, 12, 24):
        baseline_feat[f"lag{lag}"] = station["tank_level_pct"].shift(lag)
    baseline_feat["output_flow_lpm"] = station["output_flow_lpm"]
    baseline_feat["hour"] = station.index.hour
    baseline_feat["target"] = station["tank_level_pct"]
    baseline_feat = baseline_feat.dropna()
    baseline_mae, _, _ = evaluate_split(baseline_feat, RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42))
    print(f"baseline MAE: {baseline_mae:.4f} pct points")

    feat = richer_lag_features(station["tank_level_pct"], aux={"output_flow_lpm": station["output_flow_lpm"]})
    n_test = int(len(feat) * 0.15)
    train = feat.iloc[:-n_test]
    X_train, y_train = train.drop(columns="target"), train["target"]
    best_model, best_params = tune(X_train, y_train)
    print("best params:", best_params)

    tuned_mae, tuned_model, cols = evaluate_split(feat, best_model)
    print(f"tuned MAE: {tuned_mae:.4f} pct points  (improvement: {baseline_mae - tuned_mae:+.4f})")
    return tuned_model, cols


if __name__ == "__main__":
    tune_fuel_level()
    tune_equipment_health()
    tune_water_level()
