# Antarctic Research Station Digital Twin - Dataset Documentation

## 🏔️ Project Overview

This dataset collection simulates 3 months (January-March 2024) of operational telemetry from India's Antarctic research stations:
- **Maitri Station** (established 1989): 3 generators, 3 climate zones
- **Bharati Station** (established 2012): 2 generators, 2 climate zones

**Total Records**: 50,164 across 8 integrated datasets
**Time Period**: 2024-01-01 to 2024-03-31 (Antarctic summer operations)
**Temporal Resolution**: Hourly (energy, equipment, HVAC, water, occupancy) | Daily (inventory) | Event-based (resupply)

---

## 📊 Datasets Overview

### 1️⃣ `01_energy_telemetry.csv` (10,805 records)
**Frequency**: Hourly | **Use Case**: Generator load forecasting, power generation prediction

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | 2024-01-01 to 2024-03-31 | Measurement timestamp (hourly) |
| generator_id | string | GEN_M01-M03, GEN_B01-B02 | 5 total generators (Maitri: 3, Bharati: 2) |
| total_power_kw | float | 20-125 kW | Real-time power output |
| generator_load_pct | float | 20-95% | Generator capacity utilization |
| voltage | float | 395-405 V | Three-phase voltage stability |
| current | float | 30-110 A | Load current |
| frequency | float | 49.9-50.1 Hz | Grid frequency (±0.1 Hz variation) |
| power_factor | float | 0.85-0.98 | Efficiency metric (0-1 scale) |
| generator_temp_c | float | -20 to +70°C | Operating temperature (affected by ambient -30°C conditions) |
| runtime_hours | float | 5000-15000 hrs | Cumulative operating hours |
| status | string | RUNNING / MAINTENANCE | Operational status |

**Key Patterns**:
- Higher loads 6-18h (working hours) vs. 18-6h (night/low activity)
- Temperature varies with Antarctic season
- Regular maintenance cycles every 2-4 weeks

---

### 2️⃣ `02_fuel_inventory.csv` (2,161 records)
**Frequency**: Hourly | **Use Case**: Fuel depletion forecasting, resupply scheduling

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | Hourly | Measurement time |
| fuel_level_l | float | 5,000-100,000 L | Current diesel storage capacity |
| fuel_consumption_lph | float | 200-600 L/h | Hourly consumption rate |
| inflow_l | float | 0-25,000 L | Resupply inflow (when ships arrive) |
| estimated_days_remaining | float | 5-50 days | Days until empty (at current consumption) |
| reorder_threshold_l | float | 30,000 L | Safety stock threshold |
| resupply_status | string | NORMAL / SCHEDULED | Current logistics status |

**Critical Events**:
- Resupply events: Day 1, 15, 28 of month (every 2-3 weeks)
- Each resupply: +20,000-30,000 L
- Emergency warning when <30,000 L (critical in isolated Antarctic location)

**Business Rules**:
- Average consumption: 450 L/hour
- Generator runtime: ~24 hours/day at 60-70% load
- One fuel tanker capacity: 25,000 L per resupply event

---

### 3️⃣ `03_equipment_telemetry.csv` (10,805 records)
**Frequency**: Hourly | **Use Case**: Predictive maintenance, failure risk assessment

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | Hourly | Measurement time |
| equipment_id | string | EQ_M001-M003, EQ_B001-B002 | 5 critical equipment items |
| equipment_type | string | Compressor / Water Pump / Air Handler | Equipment category |
| runtime_hours | float | 5000-12000 hrs | Cumulative operating hours |
| temperature_c | float | -25 to +75°C | Equipment operating temperature |
| vibration_mm_s | float | 0.5-8 mm/s | Vibration amplitude (ISO 10816 standard) |
| power_kw | float | 10-30 kW | Power consumption |
| pressure | float | 2.5-7 bar | Operating pressure |
| health_score | float | 20-100 | Overall equipment health (100=new, 20=critical) |
| anomaly | int | 0 / 1 | Anomaly detection flag (1=anomaly present) |
| failure_risk | float | 0-100% | Probability of failure (next 30 days) |

**Equipment List**:
1. **EQ_M001** - Compressor (Maitri) - Critical for air supply
2. **EQ_M002** - Water Pump (Maitri) - Potable water circulation
3. **EQ_M003** - Air Handler (Maitri) - HVAC core unit
4. **EQ_B001** - Compressor (Bharati) - Air supply
5. **EQ_B002** - Water Pump (Bharati) - Water circulation

**ML Features**:
- Health Score Degradation: Linear decline with runtime
- Vibration Threshold: >5.5 mm/s indicates anomaly
- Temperature Stress: Equipment degrades faster in extreme cold
- Failure Risk Calculation: Composite of age, vibration, temperature

---

### 4️⃣ `04_hvac_telemetry.csv` (10,805 records)
**Frequency**: Hourly | **Use Case**: HVAC load prediction, zone temperature control

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | Hourly | Measurement time |
| zone_id | string | ZONE_M01-M03, ZONE_B01-B02 | 5 climate zones |
| indoor_temp_c | float | 15-22°C | Zone temperature setpoint tracking |
| indoor_humidity_pct | float | 20-60% | Relative humidity (low in Antarctic) |
| outdoor_temp_c | float | -30 to -5°C | Ambient Antarctic temperature |
| co2_ppm | float | 300-1200 ppm | CO₂ concentration (occupancy indicator) |
| airflow_m3h | float | 500-2500 m³/h | Air circulation rate |
| heating_load_kw | float | 2-15 kW | Thermal energy demand per zone |
| fan_speed_pct | float | 20-95% | Fan modulation percentage |
| ahu_status | string | RUNNING | Air handling unit status |

**Zone Details**:
- **ZONE_M01, M02, M03**: Maitri station (laboratory, living, storage)
- **ZONE_B01, B02**: Bharati station (laboratory, living quarters)

**Key Patterns**:
- Setpoint: 20°C (occupied) / 16°C (unoccupied)
- Heating load = f(outdoor_temp - setpoint) × occupancy
- CO₂ rises with occupancy (≈+30 ppm per person)
- Fan speed modulates with heating demand

---

### 5️⃣ `05_water_telemetry.csv` (4,322 records)
**Frequency**: Hourly | **Use Case**: Water system anomaly detection, tank level forecasting

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | Hourly | Measurement time |
| system_id | string | WATER_M01, WATER_B01 | One system per station |
| tank_level_pct | float | 5-100% | Water storage percentage |
| inlet_flow_lpm | float | 0-50 L/min | Inflow rate (resupply or recycling) |
| output_flow_lpm | float | 0-20 L/min | Outflow/consumption rate |
| pressure_bar | float | 2.5-4 bar | System pressure |
| tds_ppm | float | 100-800 ppm | Total Dissolved Solids (water quality) |
| pump_status | string | RUNNING | Pump operational status |
| wastewater_flow_lpm | float | 0-15 L/min | Wastewater generation (≈80% of consumption) |
| quality_status | string | GOOD / MONITOR | Water quality assessment |

**System Specifications**:
- Tank Capacity: 10,000-15,000 L per station
- Daily Consumption: ~500-700 L/day
- Resupply Events: Day 5 and 20 of each month
- TDS Threshold: <500 ppm = GOOD, >500 ppm = MONITOR

**Anomaly Scenarios**:
- Pressure drop: Indicates leak
- TDS surge: Water contamination
- Tank level <10%: Critical warning
- Pump failure: Zero flow at high pressure

---

### 6️⃣ `06_inventory.csv` (455 records)
**Frequency**: Daily | **Use Case**: Supply chain depletion forecasting, reorder optimization

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| date | date | 2024-01-01 to 2024-03-31 | Calendar date |
| item_id | string | ITEM_* | 5 inventory items tracked |
| category | string | Food / Energy / Spares / Medical | Item category |
| opening_stock | float | Varies | Beginning of day inventory |
| received_qty | float | Varies | Inbound from resupply |
| consumed_qty | float | Varies | Daily consumption |
| closing_stock | float | Varies | End of day inventory |
| daily_usage | float | Varies | Average daily usage rate |
| reorder_level | float | 100-300 units | Minimum safe stock |
| days_remaining | float | 1-60+ days | Days until stockout |
| reorder_flag | int | 0 / 1 | Alert flag (1=order now) |

**Inventory Items**:
1. **ITEM_FOOD001** - Staple Foods (consumption: 45-50/day)
2. **ITEM_FUEL001** - Diesel (consumption: 450-500/hour)
3. **ITEM_SPARE001** - Generator Parts (consumption: episodic)
4. **ITEM_SPARE002** - HVAC Components (consumption: episodic)
5. **ITEM_MED001** - Medical Supplies (consumption: 1-2/day)

**Reorder Thresholds**:
- Food: 100 units (2-3 days safety stock)
- Fuel: 30,000 L (≈2.5 days at full load)
- Spares: 300 units (critical in isolated location)
- Medical: 100 units

---

### 7️⃣ `07_resupply.csv` (6 records)
**Frequency**: Per Event | **Use Case**: Logistics risk assessment, supply chain optimization

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| shipment_id | string | SHIP_001 to SHIP_006 | Unique shipment identifier |
| planned_date | date | Event-based | Original scheduled departure |
| estimated_arrival | date | Planned ± 2-4 days | Expected delivery date |
| weather_risk | string | LOW / MEDIUM / HIGH | Antarctic weather impact likelihood |
| inventory_urgency | string | LOW / MEDIUM / HIGH | Supply criticality level |
| route_status | string | ON_SCHEDULE / DELAYED | Current logistics status |
| delay_risk | float | 5-50% | Probability of delays (weather-dependent) |
| final_status | string | PLANNED / IN_TRANSIT / COMPLETED | Shipment progress |

**Resupply Events** (6 events over 3 months):
- Scheduled: Day 5, 20 of each month
- Transit Time: 2-4 days
- Weather Risk: 20% HIGH, 30% MEDIUM, 50% LOW
- Typical Cargo: ~25,000 L fuel + 1,000 kg supplies + spares

**Critical Logistics**:
- Antarctic resupply ships rare (summer season only)
- Weather can add 1-2 week delays
- Multiple backup inventory required
- Communication critical due to isolation

---

### 8️⃣ `08_station_occupancy.csv` (10,805 records)
**Frequency**: Hourly | **Use Case**: Occupancy-energy coupling, zone-level load forecasting

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| timestamp | datetime | Hourly | Measurement time |
| zone_id | string | ZONE_M01-M03, ZONE_B01-B02 | Climate zone identifier |
| occupancy | float | 0.0-1.0 | Occupancy ratio (0=empty, 1=full capacity) |
| indoor_temp_c | float | 15-23°C | Zone temperature |
| outdoor_temp_c | float | -30 to -5°C | Ambient temperature |
| heating_load_kw | float | 0.2-15 kW | Thermal energy requirement |

**Occupancy Patterns**:
- **Working Hours (6-22h)**: 0.65 average occupancy (13 people per zone)
- **Night Hours (22-6h)**: 0.15 average occupancy (3 people per zone)
- **Max Capacity**: ~20 people per zone
- **Correlation**: Occupancy → CO₂ ↑, Temperature ↑, Heating Load ↑

**ML Use Cases**:
- Predict occupancy from CO₂ levels
- Forecast heating demand from occupancy
- Optimize HVAC scheduling
- Room-level comfort metrics

---

## 🎯 Digital Twin Applications

### 1. **Predictive Maintenance System**
```
Equipment Telemetry (03) → Health Score Trends → Failure Prediction
├─ Temperature degradation tracking
├─ Vibration anomaly detection (ISO 10816)
├─ Runtime hours correlation with failure risk
└─ Alert generation: >80% failure risk
```

### 2. **Energy Management & Load Forecasting**
```
Energy (01) + Occupancy (08) + HVAC (04) → Power Demand Forecast
├─ Hourly generator load optimization
├─ Seasonal pattern recognition
├─ Multi-generator load balancing
└─ Fuel consumption prediction
```

### 3. **Supply Chain Optimization**
```
Fuel (02) + Inventory (06) + Resupply (07) → Smart Reordering
├─ Depletion forecasting (days_remaining)
├─ Logistics risk assessment
├─ Optimal reorder point calculation
└─ Emergency alert generation
```

### 4. **HVAC & Thermal Management**
```
HVAC (04) + Occupancy (08) + Water (05) → Zone Comfort Optimization
├─ Setpoint recommendation
├─ Fan speed optimization
├─ Humidity control
└─ Energy-comfort trade-off analysis
```

### 5. **Water System Monitoring**
```
Water (05) → Anomaly Detection + Forecasting
├─ Leak detection (pressure drop correlation)
├─ Quality assessment (TDS trends)
├─ Tank level forecasting
└─ Contamination alerts
```

---

## 📈 Data Characteristics

### Time Series Features
- **Temporal Granularity**: Hourly (most streams), Daily (inventory), Event-based (resupply)
- **Seasonality**: Antarctic summer season (Jan-Mar) with gradual daylight/temperature changes
- **Trend Components**:
  - Generator load: Daily cycles (6h peak, 18h low)
  - Temperature: Seasonal warming (-30°C → -5°C) plus daily cycles
  - Occupancy: Working hour peaks (6-22h), night troughs
  - Fuel: Linear depletion with periodic resupply spikes

### Anomaly Events
- **Equipment Anomalies**: 2-5% of records flagged
- **Maintenance Windows**: Status='MAINTENANCE' (realistic scheduling)
- **Resupply Delays**: Delay_risk varies by weather (0-50%)
- **Sensor Noise**: ±0.5-2% random variation added to realistic values

### Missing Value Strategy
- **No deliberate missing values** in dataset (realistic for automated systems)
- **Exception**: Resupply table has only 6 events (sparse but realistic)

---

## 🔧 Data Loading Examples

### Python (Pandas)
```python
import pandas as pd

# Load all datasets
energy = pd.read_csv('01_energy_telemetry.csv', parse_dates=['timestamp'])
fuel = pd.read_csv('02_fuel_inventory.csv', parse_dates=['timestamp'])
equipment = pd.read_csv('03_equipment_telemetry.csv', parse_dates=['timestamp'])
hvac = pd.read_csv('04_hvac_telemetry.csv', parse_dates=['timestamp'])
water = pd.read_csv('05_water_telemetry.csv', parse_dates=['timestamp'])
inventory = pd.read_csv('06_inventory.csv', parse_dates=['date'])
resupply = pd.read_csv('07_resupply.csv', parse_dates=['planned_date', 'estimated_arrival'])
occupancy = pd.read_csv('08_station_occupancy.csv', parse_dates=['timestamp'])

# Example: Merge energy + occupancy for correlation
merged = energy.merge(
    occupancy, 
    on=['timestamp', 'zone_id'],  # Note: Zone mapping needed
    how='inner'
)
```

### Time Series Analysis
```python
# Resample to daily and calculate statistics
daily_energy = energy.groupby('generator_id').resample('D', on='timestamp').agg({
    'total_power_kw': ['mean', 'min', 'max'],
    'generator_load_pct': 'mean',
    'generator_temp_c': 'max'
})

# Detect anomalies in equipment
anomalies = equipment[equipment['anomaly'] == 1].groupby('equipment_id').size()
```

---

## 📋 Quality Assurance Checks

✅ **Performed Checks**:
- Time continuity: No gaps in hourly data
- Physical bounds: All values within realistic ranges
- Interdependencies: Fuel consumption correlates with generator load
- Occupancy-energy coupling: Verified positive correlation
- Resupply timing: Realistic ship arrival windows
- Seasonal trends: Temperature gradient from Jan → Mar

⚠️ **Known Limitations**:
- Synthetic data (not real sensor readings)
- Simplified anomaly injection (real equipment failures more complex)
- No sensor failures/data quality issues
- Resupply events are deterministic (every 15 days)

---

## 🚀 Next Steps

### For ML Model Development:
1. **Feature Engineering**: Time-based features (hour, day, season), lagged values
2. **Dimensionality Reduction**: PCA on equipment sensor suite
3. **Multi-task Learning**: Predict multiple targets (load, failures, anomalies)
4. **Transfer Learning**: Pre-train on historical Antarctic station data

### For Digital Twin Implementation:
1. **Simulation Framework**: Discrete event simulation of resupply events
2. **Real-time Dashboard**: Visualize current system state
3. **Scenario Planning**: "What if" analysis (e.g., equipment failure, delayed resupply)
4. **Optimization**: Linear programming for fuel/supply scheduling

---

## 📞 Dataset Questions?

Each CSV file contains 45,000-50,000+ rows suitable for:
- Time series forecasting (ARIMA, Prophet, neural networks)
- Anomaly detection (Isolation Forest, Autoencoders)
- Classification (maintenance prediction, risk categorization)
- Clustering (equipment health groups, occupancy patterns)
- Root cause analysis (correlation between systems)

Generated: January 2024
Antarctic Research Stations: Maitri & Bharati (India)
