# 👁️ PaarvAI × Madello — Store Intelligence & Privacy AI Vision System

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-AI%20Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![YOLO](https://img.shields.io/badge/YOLO-Ultralytics-orange?logo=yolo)](https://github.com/ultralytics/ultralytics)
[![OpenCV](https://img.shields.io/badge/OpenCV-YuNet%20%2B%20SFace-5C3EE8?logo=opencv)](https://opencv.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

**PaarvAI × Madello** (*Paarvai* — Tamil for *vision* or *sight*) is an enterprise-grade, privacy-preserving AI computer vision and store intelligence system. It combines real-time YOLO person detection, deep facial identification (YuNet + SFace), automatic privacy masking for anonymous shoppers, video file upload analysis, and a modern, high-performance web dashboard.

---

## 🌟 Key Capabilities

### 🎥 1. Real-Time Vision Feed (Live Webcam)
- **Ultra-Fast Frame Analysis (~85ms latency)**: Optimized YOLO26 (`imgsz=384`) + OpenCV face recognition pipeline delivering near real-time (~5 FPS) movement tracking.
- **Registered Staff Recognition**: Accurately recognizes registered store team members and highlights them in purple bounding boxes with role badges:
  - 💻 **Lakshana** (`EMP-001` · Hacker / Technical Operations Lead)
  - ✨ **Tejas** (`EMP-004` · Visionary / Store Operations Lead)
  - ⚡ **Shirley** (`EMP-002` · Hustler / Sales & POS Lead)
  - 💻 **Mehaa** (`EMP-003` · Hacker / Tech Merchandising)
  - ⚡ **Rithika** (`EMP-005` · Hustler / Beauty Advisor & Sales)
- **Automatic Privacy Masking**: Unregistered visitors and customers are automatically rendered with dark-gray bounding boxes and an active facial privacy mask ("MASKED") over their head.
- **Strict Deduplication & NMS**: Spatial non-maximum suppression prevents duplicate overlapping boxes on the same individual.
- **Smooth CSS Motion Gliding**: Bounding boxes smoothly glide across the viewport as people move without flickering.

### 📹 2. Video Upload & Analysis (Dedicated Tab)
- **Universal Video Upload**: Upload any store CCTV footage, surveillance file, or mobile recording (`.mp4`, `.webm`, `.mov`, `.mkv`, `.avi`).
- **Full Video Playback**: Integrated player with play/pause, volume, fullscreen, and timeline scrubbing.
- **Scrubbing & Continuous Inference**: Moving the video scrubber immediately re-evaluates the active frame. In playback mode, auto-scan continuously tracks people in the video.
- **One-Click Sample Loader**: Includes a pre-bundled store CCTV sample video for instant zero-configuration testing.

### 👥 3. Database — Workers Registry
- Manage registered employee profiles, roles, departments, badge codes, and visual cues.
- Live CRUD interface to add, update, or remove employees with instant badge collision protection.

### 📊 4. Statistics, Logs & Operational Insights
- Filterable telemetry log of all detections with employee vs. customer breakdown.
- Visual breakdown of store zones (Floor Operations, Checkout & Service, Store Management).
- Privacy notice guarantees: customer facial biometrics are never stored to disk.

---

## 🏗️ System Architecture

```text
       ┌────────────────────────────────────────────────────────┐
       │                PaarvAI × Madello UI                   │
       │   React 19 + TypeScript + Vite + Tailwind CSS (v4)    │
       │              http://127.0.0.1:3000                     │
       └───────────────────────────┬────────────────────────────┘
                                   │
              Fetch (/api/vision/analyze) [~25KB frame]
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Node.js / Express Gateway                  │
       │           server.ts (Dual-Stack IPv4/IPv6)             │
       │      Non-blocking In-Memory Event State Cache          │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │               FastAPI AI Vision Service                │
       │                 http://127.0.0.1:8000                  │
       ├────────────────────────────────────────────────────────┤
       │  1. YOLO Person Detection (yolo26n.pt @ imgsz=384)     │
       │  2. Spatial Box Overlap Suppression (NMS IoU=0.40)     │
       │  3. OpenCV YuNet (Face Detection in Upper Head Crop)   │
       │  4. OpenCV SFace (Deep Cosine Similarity Recognition)  │
       │  5. Staff Identity Deduplication & Privacy Masking     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │              SQLite Storage (store.db)                 │
       │            Events, Dwell Times & Workers               │
       └────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
Paarvai-X-Madello/
├── app/
│   ├── main.py              # FastAPI server & /api/vision/analyze endpoint
│   ├── database.py          # SQLAlchemy SQLite configuration
│   ├── models.py            # Pydantic schemas & database models
│   ├── analytics.py         # Customer occupancy & dwell analytics
│   ├── crowding.py          # Crowding threshold detection
│   └── kpi.py               # Store performance KPIs
│
├── pipeline/
│   ├── vision_service.py    # Core high-speed inference engine (YOLO + YuNet/SFace)
│   ├── face_recognizer.py   # Thread-safe face detector & recognizer
│   ├── person_classifier.py # Role classifier & styling
│   ├── track_and_identify.py# ByteTrack CLI video pipeline
│   └── zones.py             # Store operational zone definitions
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── WebcamDemo.tsx        # Live webcam feed with bounding box HUD
│   │   │   ├── VideoUploadView.tsx   # Video file upload & interactive analysis player
│   │   │   ├── WorkersDatabaseView.tsx # Employee directory & CRUD forms
│   │   │   ├── StatisticsLogsView.tsx # Real-time event log & zone metrics
│   │   │   └── InsightsView.tsx      # Operational AI retail insights
│   │   ├── AppWorkspace.tsx          # Main dashboard navigation & state
│   │   └── StoryExperience.tsx       # Architectural introduction & story view
│   ├── types/vision.ts               # Core TypeScript data schemas
│   └── index.css                     # Global design styles & typography
│
├── known_people/            # Reference photos of registered team members
│   ├── Lakshana_EMP-001.jpg
│   ├── Tejas_EMP-004.jpg
│   ├── Shirley_EMP-002.jpg
│   ├── Mehaa_EMP-003.jpg
│   └── Rithika_EMP-005.jpg
│
├── models/                  # Pretrained ONNX vision models
│   ├── face_detection_yunet_2023mar.onnx
│   └── face_recognition_sface_2021dec.onnx
│
├── sample_data/             # Sample store CCTV clips for testing
├── yolo26n.pt               # YOLO neural network weights
├── server.ts                # Express backend & API gateway
├── vite.config.ts           # Vite bundler configuration
├── package.json             # Node dependencies
└── requirements.txt         # Python dependencies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python**: 3.10 or 3.11+
- **Node.js**: v18+ (Node 20+ or 24 recommended)
- **Webcam**: (Optional, for live camera feed)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/lakshana-gs/Paarvai-X-Madello.git
cd Paarvai-X-Madello

# Install Python requirements
pip install -r requirements.txt

# Install Node requirements
npm install --legacy-peer-deps
```

### 3. Launching the Application

Run the Python AI Vision Backend and the Web Dashboard:

#### Terminal 1 — Start Python AI Vision Service:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*(Runs on `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`)*

#### Terminal 2 — Start Web Application:
```bash
npm run dev
```
*(Runs on `http://127.0.0.1:3000`)*

Open your browser to:
👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## 🔌 API Reference

### Vision Analysis
- `POST /api/vision/analyze`: Evaluates a single frame (base64 image) using YOLO26 and face recognition. Returns detected person bounding boxes, employee identifications, confidence scores, and privacy masks.

### Store Telemetry & Events
- `GET /api/workers`: Retrieves registered store staff list.
- `POST /api/workers`: Registers a new employee into the database.
- `PATCH /api/workers/:id`: Updates an employee profile or role.
- `DELETE /api/workers/:id`: Removes an employee record.
- `GET /api/events`: Fetches recorded store observation events.
- `DELETE /api/events`: Clears session event history.

---

## 🛡️ Privacy & Compliance Guarantees

1. **Zero Customer Facial Storage**: No facial features, embeddings, or biometric templates are ever recorded or stored for non-registered shoppers.
2. **Ephemeral Inference**: Raw video frames are processed in memory and discarded immediately after inference.
3. **Automated Head Masking**: Customer faces in the UI are concealed with a solid privacy mask overlay.
4. **Local On-Premises Processing**: All vision models (YOLO, YuNet, SFace) execute 100% locally on the host machine without transmitting video to any third-party cloud.

---

## 👩‍💻 Author & Repository

- **Author**: [Lakshana G S](https://github.com/lakshana-gs)
- **Repository**: [https://github.com/lakshana-gs/Paarvai-X-Madello](https://github.com/lakshana-gs/Paarvai-X-Madello)
- **License**: MIT License
