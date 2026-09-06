"""
Bharati Station Analysis Pipeline
==================================
Inputs : iig_bharati.csv, imd_bharati_fixed_hour.csv (real weather sensor data)
Outputs: trained models + risk indicator tables saved to /outputs

IMPORTANT — READ BEFORE USING SECTIONS 4-8
-------------------------------------------
Sections 1-3 are REAL models trained on real sensor data (weather forecasting,
sensor fault/discrepancy detection).

Sections 4-8 (energy, fuel, equipment, inventory, resupply) have NO source
data in these two files. There is no way to predict them honestly from
weather alone. What's implemented instead are PROXY RISK INDICATORS: simple,
transparent formulas that turn weather into an "operational stress score"
(e.g. colder + windier = higher assumed heating/logistics stress). These are
NOT trained models and NOT real predictions of actual energy/fuel/equipment/
inventory levels. The formulas and coefficients are placeholders you must
replace with real station data (fuel logs, power meter readings, maintenance
records, stock counts) before treating any of their output as meaningful.
Each proxy function says exactly what real data would replace it with.
"""

import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.metrics import mean_absolute_error, mean_squared_error

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------------------
# 1. LOAD + CLEAN
# ---------------------------------------------------------------------------
def load_iig(path=os.path.join(BASE_DIR, "iig_bharati.csv")):
    df = pd.read_csv(path)
    df["obstime"] = pd.to_datetime(df["obstime"])
    return df.set_index("obstime").sort_index()


def load_imd(path=os.path.join(BASE_DIR, "imd_bharati_fixed_hour.csv")):
    df = pd.read_csv(path)
    df["obstime"] = pd.to_datetime(df["obstime"], format="%d-%m-%Y %H:%M")
    return df.set_index("obstime").sort_index()


def clean(df, cols=("tempr", "ap", "ws", "wd", "rh")):
    df = df[list(cols)].copy()
    df = df[~df.index.duplicated(keep="first")]
    df = df.asfreq("h")
    df[list(cols)] = df[list(cols)].interpolate(method="time", limit_direction="both")
    return df


# ---------------------------------------------------------------------------
# 2. WEATHER FORECASTING (real model, real data)
# ---------------------------------------------------------------------------
def make_lag_features(df, target, lags=(1, 2, 3, 6, 12, 24)):
    feat = pd.DataFrame(index=df.index)
    for lag in lags:
        feat[f"{target}_lag{lag}"] = df[target].shift(lag)
    feat["hour"] = df.index.hour
    feat["month"] = df.index.month
    feat["roll_mean_6"] = df[target].shift(1).rolling(6).mean()
    feat["roll_std_6"] = df[target].shift(1).rolling(6).std()
    feat["target"] = df[target]
    return feat.dropna()


def train_forecast_model(df, target="tempr", horizon_hours=1, test_frac=0.15):
    feat = make_lag_features(df, target)
    n_test = int(len(feat) * test_frac)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train.drop(columns="target"), train["target"]
    X_test, y_test = test.drop(columns="target"), test["target"]

    model = RandomForestRegressor(n_estimators=300, max_depth=12, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    print(f"[forecast:{target}] MAE={mae:.3f}  RMSE={rmse:.3f}")

    plt.figure(figsize=(11, 4))
    plt.plot(y_test.index, y_test.values, label="actual", linewidth=1)
    plt.plot(y_test.index, pred, label="predicted", linewidth=1, alpha=0.8)
    plt.title(f"{target} forecast vs actual (test set)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"{OUT}/forecast_{target}.png", dpi=140)
    plt.close()

    return model, {"mae": mae, "rmse": rmse}


# ---------------------------------------------------------------------------
# 3. SENSOR FAULT / DISCREPANCY DETECTION (real, uses both datasets)
# ---------------------------------------------------------------------------
def sensor_discrepancy(iig, imd, cols=("tempr", "ap", "ws", "rh")):
    merged = iig.join(imd, how="inner", lsuffix="_iig", rsuffix="_imd")
    for c in cols:
        merged[f"{c}_resid"] = merged[f"{c}_iig"] - merged[f"{c}_imd"]

    resid_cols = [f"{c}_resid" for c in cols]
    iso = IsolationForest(contamination=0.03, random_state=42)
    merged["anomaly"] = iso.fit_predict(merged[resid_cols])
    merged["anomaly"] = merged["anomaly"].map({1: 0, -1: 1})

    print(f"[fault-detection] {merged['anomaly'].sum()} flagged of {len(merged)} "
          f"overlapping hours ({merged['anomaly'].mean()*100:.1f}%)")

    fig, axes = plt.subplots(len(cols), 1, figsize=(11, 2.5 * len(cols)), sharex=True)
    for ax, c in zip(axes, cols):
        ax.plot(merged.index, merged[f"{c}_resid"], linewidth=0.7)
        flagged = merged[merged["anomaly"] == 1]
        ax.scatter(flagged.index, flagged[f"{c}_resid"], color="red", s=8, zorder=5)
        ax.set_ylabel(c)
    plt.suptitle("IIG - IMD residuals (red = flagged anomaly)")
    plt.tight_layout()
    plt.savefig(f"{OUT}/sensor_discrepancy.png", dpi=140)
    plt.close()

    return merged


# ---------------------------------------------------------------------------
# 4. ENERGY DEMAND + FUEL DEPLETION  -- PROXY ONLY, NO REAL DATA
# ---------------------------------------------------------------------------
def energy_fuel_proxy(df, base_load_kw=50.0, heating_coeff_kw_per_degC=1.8,
                       wind_chill_coeff=0.15, generator_efficiency_kwh_per_L=3.5):
    """
    Placeholder physics-flavoured formula, NOT a trained model:
        energy_kw  = base_load + heating_coeff * max(0, -tempr) + wind_chill_coeff * ws
        fuel_L_per_hr = energy_kw / generator_efficiency_kwh_per_L
    Replace base_load_kw / heating_coeff / generator_efficiency with the
    station's actual generator specs and metered load once available.
    Real modeling requires: historical power-meter logs and fuel tank telemetry.
    """
    proxy = pd.DataFrame(index=df.index)
    proxy["est_energy_kw"] = (
        base_load_kw
        + heating_coeff_kw_per_degC * df["tempr"].clip(upper=0).abs()
        + wind_chill_coeff * df["ws"]
    )
    proxy["est_fuel_L_per_hr"] = proxy["est_energy_kw"] / generator_efficiency_kwh_per_L
    proxy["est_cumulative_fuel_L"] = proxy["est_fuel_L_per_hr"].cumsum()
    return proxy


# ---------------------------------------------------------------------------
# 5. WEATHER -> ENERGY -> FUEL -> LOGISTICS IMPACT -- PROXY ONLY
# ---------------------------------------------------------------------------
def logistics_impact_proxy(weather_df, energy_fuel_df,
                            wind_shutdown_threshold=15.0, temp_shutdown_threshold=-30.0):
    """
    Combines the weather-derived energy/fuel proxy above into a single
    illustrative "logistics stress score" per hour. Coefficients are
    arbitrary weights, not fitted to any outcome data.
    Real modeling requires: historical logistics/operations logs showing
    when weather actually disrupted supply movement or fieldwork.
    """
    proxy = pd.DataFrame(index=weather_df.index)
    proxy["fuel_burn_rate"] = energy_fuel_df["est_fuel_L_per_hr"]
    proxy["wind_risk"] = (weather_df["ws"] / wind_shutdown_threshold).clip(upper=2)
    proxy["cold_risk"] = (weather_df["tempr"] / temp_shutdown_threshold).clip(lower=0, upper=2)
    proxy["logistics_stress_score"] = (
        0.4 * proxy["fuel_burn_rate"] / proxy["fuel_burn_rate"].max()
        + 0.3 * proxy["wind_risk"]
        + 0.3 * proxy["cold_risk"]
    )
    proxy["field_ops_advisable"] = proxy["logistics_stress_score"] < 0.5
    return proxy


# ---------------------------------------------------------------------------
# 6. EQUIPMENT ANOMALY / FAILURE RISK  -- PROXY, reuses sensor discrepancy
# ---------------------------------------------------------------------------
def equipment_risk_proxy(discrepancy_df, window="24h"):
    """
    Uses the *sensor* anomaly rate from Section 3 as a stand-in for
    equipment health, on the assumption that instruments drifting from
    each other may indicate sensor/equipment stress. This is NOT the same
    as a real equipment failure model.
    Real modeling requires: maintenance logs, failure timestamps, and
    equipment telemetry (vibration, temperature, runtime hours) per asset.
    """
    risk = discrepancy_df["anomaly"].rolling(window).mean().rename("equipment_risk_score")
    return risk.to_frame()


# ---------------------------------------------------------------------------
# 7. INVENTORY DEPLETION + REORDER -- PROXY ONLY
# ---------------------------------------------------------------------------
def inventory_proxy(energy_fuel_df, starting_stock_L=50000, reorder_threshold_L=10000):
    """
    Simple running drawdown of an assumed starting fuel stock using the
    Section 4 burn-rate proxy. Flags a reorder point once stock crosses
    an arbitrary threshold. Replace starting_stock_L / reorder_threshold_L
    with real tank capacity and reorder policy.
    Real modeling requires: actual stock/inventory counts over time.
    """
    proxy = pd.DataFrame(index=energy_fuel_df.index)
    proxy["remaining_stock_L"] = starting_stock_L - energy_fuel_df["est_cumulative_fuel_L"]
    proxy["reorder_flag"] = proxy["remaining_stock_L"] < reorder_threshold_L
    return proxy


# ---------------------------------------------------------------------------
# 8. RESUPPLY DELAY / RISK -- PROXY ONLY
# ---------------------------------------------------------------------------
def resupply_risk_proxy(weather_df, wind_delay_threshold=20.0, temp_delay_threshold=-35.0):
    """
    Flags hours where weather alone (high wind or extreme cold) would
    plausibly delay a resupply operation (flight/ship/vehicle transfer).
    No historical resupply schedule or delay outcomes were available to
    fit this against.
    Real modeling requires: historical resupply schedules and actual
    delay/cancellation records to train a real risk classifier.
    """
    proxy = pd.DataFrame(index=weather_df.index)
    proxy["weather_delay_risk"] = (
        (weather_df["ws"] > wind_delay_threshold) | (weather_df["tempr"] < temp_delay_threshold)
    ).astype(int)
    proxy["risk_score_7d_avg"] = proxy["weather_delay_risk"].rolling("7D").mean()
    return proxy


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    iig_raw = load_iig()
    imd_raw = load_imd()
    iig = clean(iig_raw)
    imd = clean(imd_raw)

    print("\n--- Section 2: weather forecasting (real) ---")
    for target in ["tempr", "ws", "ap"]:
        train_forecast_model(iig, target=target)

    print("\n--- Section 3: sensor discrepancy / fault detection (real) ---")
    discrepancy = sensor_discrepancy(iig, imd)

    print("\n--- Sections 4-8: PROXY indicators (weather-derived, not real predictions) ---")
    energy_fuel = energy_fuel_proxy(iig)
    logistics = logistics_impact_proxy(iig, energy_fuel)
    equipment_risk = equipment_risk_proxy(discrepancy)
    inventory = inventory_proxy(energy_fuel)
    resupply = resupply_risk_proxy(iig)

    energy_fuel.to_csv(f"{OUT}/proxy_energy_fuel.csv")
    logistics.to_csv(f"{OUT}/proxy_logistics_impact.csv")
    equipment_risk.to_csv(f"{OUT}/proxy_equipment_risk.csv")
    inventory.to_csv(f"{OUT}/proxy_inventory.csv")
    resupply.to_csv(f"{OUT}/proxy_resupply_risk.csv")

    print("\nDone. Forecast/discrepancy plots and proxy CSVs written to", OUT)