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

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + Vite |
| **Styling & Theme** | Tailwind CSS (Enterprise Architectural Light Mode) |
| **Vector Floor-Plan** | Pure Scalable Vector Graphics (SVG) with CAD Pan & Zoom |
| **Iconography** | Lucide React |
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

## 👥 Authors & Acknowledgments

- **Om Wanale** — [GitHub Profile](https://github.com/OmWanale)
- Developed for **Smart India Hackathon (SIH)** • **PS26060**
- Dedicated to the researchers and wintering teams of the **National Centre for Polar and Ocean Research (NCPOR)** at Bharati Station, Antarctica.
