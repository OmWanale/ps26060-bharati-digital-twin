import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, classification_report

OUT = "outputs"
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------------------
# EQUIPMENT: health_score regression + anomaly classification
# ---------------------------------------------------------------------------
def equipment_models():
    df = pd.read_csv("03_equipment_telemetry.csv", parse_dates=["timestamp"])
    df = pd.get_dummies(df, columns=["equipment_type"], prefix="type")
    type_cols = [c for c in df.columns if c.startswith("type_")]
    features = ["runtime_hours", "temperature_c", "vibration_mm_s", "power_kw", "pressure"] + type_cols

    n_test = int(len(df) * 0.15)
    train, test = df.iloc[:-n_test], df.iloc[-n_test:]

    health_model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)
    health_model.fit(train[features], train["health_score"])
    pred = health_model.predict(test[features])
    print(f"[equipment health_score] MAE={mean_absolute_error(test['health_score'], pred):.2f}")

    anomaly_model = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=42)
    anomaly_model.fit(train[features], train["anomaly"])
    apred = anomaly_model.predict(test[features])
    print("[equipment anomaly] classification report:")
    print(classification_report(test["anomaly"], apred, zero_division=0))

    latest = df.sort_values("timestamp").groupby("equipment_id").tail(1)
    snapshot = []
    for _, row in latest.iterrows():
        x = row[features].to_frame().T
        snapshot.append({
            "equipment_id": row["equipment_id"],
            "predicted_health_score": round(float(health_model.predict(x)[0]), 1),
            "predicted_anomaly": bool(anomaly_model.predict(x)[0]),
            "failure_risk_pct": round(float(row["failure_risk"]), 1),
        })
    with open(f"{OUT}/equipment_snapshot.json", "w") as f:
        json.dump(snapshot, f, indent=2)
    print("Equipment snapshot ->", snapshot)


# ---------------------------------------------------------------------------
# HVAC: heating_load_kw forecast (station-wide, recursive)
# ---------------------------------------------------------------------------
def hvac_model(hours_ahead=72):
    df = pd.read_csv("04_hvac_telemetry.csv", parse_dates=["timestamp"])
    station = df.groupby("timestamp").agg(
        heating_load_kw=("heating_load_kw", "sum"),
        outdoor_temp_c=("outdoor_temp_c", "mean"),
        indoor_temp_c=("indoor_temp_c", "mean"),
        co2_ppm=("co2_ppm", "mean"),
    )

    feat = pd.DataFrame(index=station.index)
    for lag in (1, 2, 3, 6, 12, 24):
        feat[f"load_lag{lag}"] = station["heating_load_kw"].shift(lag)
    feat["outdoor_temp_c"] = station["outdoor_temp_c"]
    feat["hour"] = station.index.hour
    feat["target"] = station["heating_load_kw"]
    feat = feat.dropna()

    n_test = int(len(feat) * 0.15)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train.drop(columns="target"), train["target"]
    X_test, y_test = test.drop(columns="target"), test["target"]

    model = RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    print(f"[hvac heating_load_kw] MAE={mean_absolute_error(y_test, pred):.2f} kW")

    history = station[["heating_load_kw", "outdoor_temp_c"]].copy()
    start = history.index[-1]
    trajectory = []
    for step in range(1, hours_ahead + 1):
        t = start + pd.Timedelta(hours=step)
        row = {f"load_lag{lag}": history["heating_load_kw"].iloc[-lag] for lag in (1, 2, 3, 6, 12, 24)}
        row["outdoor_temp_c"] = history["outdoor_temp_c"].iloc[-24:].mean()
        row["hour"] = t.hour
        pred_load = model.predict(pd.DataFrame([row])[X_train.columns])[0]
        history.loc[t] = [pred_load, row["outdoor_temp_c"]]
        trajectory.append({"timestamp": t.isoformat(), "heating_load_kw": round(float(pred_load), 1)})

    with open(f"{OUT}/hvac_forecast.json", "w") as f:
        json.dump(trajectory, f, indent=2)
    print("HVAC forecast, first/last:", trajectory[0], trajectory[-1])


# ---------------------------------------------------------------------------
# WATER: tank_level_pct forecast (station-wide, recursive)
# ---------------------------------------------------------------------------
def water_model(hours_ahead=72):
    df = pd.read_csv("05_water_telemetry.csv", parse_dates=["timestamp"])
    station = df.groupby("timestamp").agg(
        tank_level_pct=("tank_level_pct", "mean"),
        output_flow_lpm=("output_flow_lpm", "mean"),
        inlet_flow_lpm=("inlet_flow_lpm", "mean"),
    )

    feat = pd.DataFrame(index=station.index)
    for lag in (1, 2, 3, 6, 12, 24):
        feat[f"level_lag{lag}"] = station["tank_level_pct"].shift(lag)
    feat["output_flow_lpm"] = station["output_flow_lpm"]
    feat["hour"] = station.index.hour
    feat["target"] = station["tank_level_pct"]
    feat = feat.dropna()

    n_test = int(len(feat) * 0.15)
    train, test = feat.iloc[:-n_test], feat.iloc[-n_test:]
    X_train, y_train = train.drop(columns="target"), train["target"]
    X_test, y_test = test.drop(columns="target"), test["target"]

    model = RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    print(f"[water tank_level_pct] MAE={mean_absolute_error(y_test, pred):.2f} pct points")

    history = station[["tank_level_pct", "output_flow_lpm"]].copy()
    start = history.index[-1]
    trajectory = []
    for step in range(1, hours_ahead + 1):
        t = start + pd.Timedelta(hours=step)
        row = {f"level_lag{lag}": history["tank_level_pct"].iloc[-lag] for lag in (1, 2, 3, 6, 12, 24)}
        row["output_flow_lpm"] = history["output_flow_lpm"].iloc[-24:].mean()
        row["hour"] = t.hour
        pred_level = model.predict(pd.DataFrame([row])[X_train.columns])[0]
        history.loc[t] = [pred_level, row["output_flow_lpm"]]
        trajectory.append({"timestamp": t.isoformat(), "tank_level_pct": round(float(pred_level), 1)})

    with open(f"{OUT}/water_forecast.json", "w") as f:
        json.dump(trajectory, f, indent=2)
    print("Water forecast, first/last:", trajectory[0], trajectory[-1])


if __name__ == "__main__":
    print("=== EQUIPMENT ===")
    equipment_models()
    print("\n=== HVAC ===")
    hvac_model()
    print("\n=== WATER ===")
    water_model()
