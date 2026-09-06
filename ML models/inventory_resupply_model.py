import json
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

OUT = "outputs"
os.makedirs(OUT, exist_ok=True)


def inventory_model():
    df = pd.read_csv("06_inventory.csv", parse_dates=["date"])
    df = pd.get_dummies(df, columns=["category"], prefix="cat")
    cat_cols = [c for c in df.columns if c.startswith("cat_")]
    features = ["opening_stock", "received_qty", "consumed_qty", "daily_usage", "days_remaining"] + cat_cols

    n_test = int(len(df) * 0.2)
    train, test = df.iloc[:-n_test], df.iloc[-n_test:]

    model = RandomForestClassifier(n_estimators=200, max_depth=6, class_weight="balanced", random_state=42)
    model.fit(train[features], train["reorder_flag"])
    pred = model.predict(test[features])
    print("[inventory reorder_flag] classification report:")
    print(classification_report(test["reorder_flag"], pred, zero_division=0))

    latest = df.sort_values("date").groupby("item_id").tail(1)
    snapshot = []
    for _, row in latest.iterrows():
        x = row[features].to_frame().T
        snapshot.append({
            "item_id": row["item_id"],
            "closing_stock": round(float(row["closing_stock"]), 1),
            "days_remaining": round(float(row["days_remaining"]), 1),
            "predicted_reorder_needed": bool(model.predict(x)[0]),
        })
    with open(f"{OUT}/inventory_snapshot.json", "w") as f:
        json.dump(snapshot, f, indent=2)
    print("Inventory snapshot ->", snapshot)


def resupply_risk_heuristic(weather_risk, inventory_urgency, route_status):
    """
    Only 6 historical shipments exist in 07_resupply.csv -- far too few rows
    to train a real ML classifier (any model would just memorize 6 points).
    This is a transparent rule-based score instead, calibrated by eye against
    the historical delay_risk values in that file. Replace with a trained
    model once dozens+ of real shipment records exist.
    """
    risk_map = {"LOW": 5, "MEDIUM": 10, "HIGH": 20}
    score = risk_map.get(weather_risk, 10) + risk_map.get(inventory_urgency, 10) / 2
    if route_status == "DELAYED":
        score += 15
    return min(score, 100)


if __name__ == "__main__":
    inventory_model()
    print()
    print("[resupply heuristic example]",
          resupply_risk_heuristic("MEDIUM", "MEDIUM", "ON_SCHEDULE"))
