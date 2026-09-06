# 🇮🇳 Bharati Antarctic Research Station — Digital Twin Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://ps26060-bharati-digital-twin.vercel.app/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **SIH Problem Statement PS26060**: *"Digital Platform for efficient remote management of Indian Antarctic Research Stations"*  
> **Organization**: Ministry of Earth Sciences (**MoES**)  
> **Department**: National Centre for Polar and Ocean Research (**NCPOR**)  
> **Theme**: Smart Automation & Autonomous Polar Infrastructure

---

## 🌐 Live Deployment

🚀 **Access the live interactive application on Vercel:**  
### **[https://ps26060-bharati-digital-twin.vercel.app/](https://ps26060-bharati-digital-twin.vercel.app/)**

---

## 🧭 Project Overview

**Bharati Station** ($69^\circ 24' 28''\text{S}, 76^\circ 11' 14''\text{E}$) in the Larsemann Hills, East Antarctica, operates in one of the most extreme and isolated environments on Earth. During harsh polar winters, ground intervention is limited, making automated digital twins essential for energy efficiency, life support resilience, and station autonomy.

This platform provides a centralized, interactive **2D Architectural Blueprint & SCADA Remote Operations Interface** designed to mirror the actual physical systems of Bharati Station.

---

## 📐 Key Capabilities

### 1. Zero-Collision Architectural Blueprint Vector Engine
- **Multi-Level CAD Navigation**:
  - **Level 1**: Heavy Logistics, Tracked PistenBully Garage, Mechanical Workshop (CNC, Milling, Hyd. Press), 10T Crane Hoist Bay.
  - **Level 2**: Power & Life Support — CHP Generators (3x 100kVA interactive units), Reverse Osmosis Potable Water Plant, Wastewater MBR Ultrafiltration Plant, Scientific Research Labs (Atmospheric, Seismic, Cryo-Helium).
  - **Level 3**: Command & Habitat — BMS SCADA Dispatch, 415V MLVD Switchgear, Medical OT / Telemedicine, Ku-Band Satellite Communication (SatCom), Galley/Mess, Reefer Cold Storage, Crew Accommodation Berths.
  - **Level 4**: Climate Penthouse & Lookout — Central AHU & VAC System (dual blowers, glycol reheat), 360° Panoramic Observation Deck & Aurora Imaging Bridge.
  - **External Systems**: Bulk Fuel Farm (190,000L Polar Diesel), Trace-Heated Seawater Intake Pumphouse, Aviation Helipad, Independent Emergency Survival Shelter.
- **Precision Label Hierarchy**:
  - Stacked vertical room header cards (`ROOM NAME` / `small ROOM ID`) with zero collisions.
  - Intelligent word-boundary SVG text wrapping (`<tspan>`).
  - Strict layout zoning (Zone 1 Header, Zone 2 Equipment, Zone 3 Status, Zone 4 Badged Annotations).
  - Door swing-arc avoidance and wall boundary enforcement.
  - 8–12px minimum clearance between status text and indicators.

### 2. Smart Automation AI Recommendation Engine
- Embedded polar operational rules that continuously monitor telemetry and diagnose anomalies.
- Proactive mitigation recommendations with 1-click autonomous execution.

### 3. Interactive Remote Management & 6 Simulation Scenarios
- **1. Generator Overheating**: Lead generator coolant exceeds 95°C $\rightarrow$ AI recommends shedding non-essential loads and engaging standby unit.
- **2. High Power Demand**: Switchgear bus approaches peak grid load $\rightarrow$ Automated selective circuit breaker tripping.
- **3. Fuel Level Low**: Bulk day tank reserve dips under 18% during blizzard $\rightarrow$ Automated fuel transfer from bulk reserve.
- **4. Water Plant Failure**: RO high-pressure booster pump trips $\rightarrow$ Engage backup booster pump & initiate backwash.
- **5. Communication Link Degraded**: Ku-band ionospheric jitter detected $\rightarrow$ Failover to polar Inmarsat BGAN transceiver.
- **6. Extreme External Temperature**: Katabatic wind chill (-46°C) $\rightarrow$ Recirculate 85% indoor air and boost glycol heat loop.

### 4. Live Hardware Remote Command Execution (Real Digital Twin Loop)
The platform closes the physical ↔ digital loop with a **real ESP32 node** controllable from the UI:

```
React UI ──REST POST──► Bridge Server (Node + ws) ──WebSocket──► ESP32 (built-in LED, GPIO 2)
   ▲                          │                                       │
   └──── WS live telemetry ───┘◄────────── 1 Hz telemetry + acks ─────┘
```

- **ESP32 LED Control panel** (right sidebar): shows device ONLINE/OFFLINE, live LED state, WiFi signal (RSSI), uptime, command count, plus a live command log with ack latency (ms).
- **Remote commands**: `LED_START_BLINK` / `LED_STOP_BLINK` — sent via `POST /api/device/command`, relayed over WebSocket, acknowledged by the real device.
- **Cross-network**: the ESP32 connects *outbound* to the cloud bridge, so it can sit on a mobile hotspot while the UI runs anywhere.
- **Safety**: LED auto-stops on link loss; commands fail loudly (409 device offline / 504 ack timeout) instead of silently pretending.
- **Components**:
  - `firmware/esp32_led/esp32_led.ino` — ESP32 firmware (WebSocket client, JSON commands, telemetry)
  - `server/deviceBridge.js` — WebSocket bridge: device registry, command relay with 5s ack timeout, command log
  - `server/deviceSimulator.js` — fake device for testing without hardware
  - `src/components/Esp32LedPanel.jsx` — live hardware control panel UI

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + Vite |
| **Styling & Theme** | Tailwind CSS (Enterprise Architectural Light Mode) |
| **Vector Floor-Plan** | Pure Scalable Vector Graphics (SVG) with CAD Pan & Zoom |
| **Iconography** | Lucide React |
| **Hardware Bridge** | Node.js `ws` (WebSocket relay) + ESP32 firmware |
| **Deployment** | Vercel Serverless Edge |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ installed on your machine.

### Installation

```bash
# 1. Clone repository
git clone https://github.com/OmWanale/ps26060-bharati-digital-twin.git

# 2. Navigate to project folder
cd ps26060-bharati-digital-twin

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔌 Live Hardware Demo — Setup Guide (ESP32)

### A. Local test without hardware (2 minutes)

```bash
# Terminal 1: bridge server (REST + WebSocket on :3001)
npm run start:bridge

# Terminal 2: fake ESP32
npm run sim

# Terminal 3: UI
npm run dev
```
Open the app → the **ESP32 LED Control** panel in the right sidebar shows **ONLINE** → click **Start Blink** → watch the command log show `SENT LED_START_BLINK` + `ACK ... status=ok`.

### B. Real ESP32 (DevKit V1)

1. Open `firmware/esp32_led/esp32_led.ino` in Arduino IDE (ESP32 core + `WebSockets` by Links2004 + `ArduinoJson` required — already installed).
2. Edit the config block at the top: `WIFI_SSID`, `WIFI_PASS` (mobile hotspot), `BRIDGE_HOST`/`BRIDGE_PORT`/`BRIDGE_TLS`.
   - Local: `BRIDGE_HOST` = your laptop's IP, port `3001`, TLS `false` (both devices on the same WiFi/hotspot).
   - Cloud (Railway): host = `your-app.up.railway.app`, port `443`, TLS `true` — works across networks.
3. Select **ESP32 Dev Module** + correct port → Upload → Serial Monitor (115200).
4. `DEVICE_TOKEN` in the firmware must match `DEVICE_AUTH_TOKEN` in the server `.env`.

### C. Cloud bridge deployment (Railway, free)

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Add environment variables: `DEVICE_AUTH_TOKEN` (a long random string), `ALLOWED_ORIGIN=https://ps26060-bharati-digital-twin.vercel.app`.
4. Railway injects `PORT` automatically. Enable **TCP Proxy** on port `443` for the public `wss://` URL.
5. Set `VITE_BRIDGE_URL=https://your-app.up.railway.app` in **Vercel** project settings and redeploy.
6. Update `BRIDGE_HOST`/`BRIDGE_TLS` in the firmware, re-flash the ESP32 — now the live site controls hardware across any network.

---

## 👥 Authors & Acknowledgments

- **Om Wanale** — [GitHub Profile](https://github.com/OmWanale)
- Developed for **Smart India Hackathon (SIH)** • **PS26060**
- Dedicated to the researchers and wintering teams of the **National Centre for Polar and Ocean Research (NCPOR)** at Bharati Station, Antarctica.
