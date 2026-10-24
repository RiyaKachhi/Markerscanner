# LabLens: An AR Guide for Every Lab Instrument

**Hackathon Project for Tech Elevate 2026**  
*Team Humpty Dumpty (Mech-ARE)*  
*"Think Big. Innovate Bigger."*

---

## 1. Overview & Official Problem Statement

> **Problem Statement:**  
> *AR-Based Laboratory Equipment Guide: Develop an AR-based system that recognizes laboratory equipment through a smartphone camera and displays its name, specifications, operating instructions, and safety precautions.*

Students frequently handle complex, high-voltage, or delicate laboratory equipment without knowing their names, ratings, or safe operating steps, relying on busy supervisors and dense manuals.

**LabLens** is a mobile-first Progressive Web App (PWA) that recognizes laboratory instruments in real time and overlays virtual 3D instructional guides **anchored directly to the instrument and its specific physical components** (rotary knobs, BNC terminals, scale thimbles, measuring jaws, etc.).

---

## 2. Core Engineering Principles (Addressing Past Pitfalls)

1. **Real AR, Not a Static Popup on a Video:**
   Virtual content (3D arrows, pulsing target rings, and step indicators) is **anchored to the real instrument in 3D camera space**. In marker mode, 6-DoF pose estimation (rotation and translation) calculated from ArUco marker corners and camera intrinsics keeps virtual objects glued to physical components as the phone moves and rotates.
2. **Honest Detection (Zero False Proxy Mapping):**
   COCO-SSD only detects 80 everyday objects (laptops, bottles, phones) and contains zero classes for oscilloscopes, multimeters, or vernier calipers. **LabLens never maps "laptop" to "oscilloscope".** Detection relies on authentic **ArUco 4x4 markers** (primary) and an Ultralytics **custom-trained YOLOv8n detector**, with COCO-SSD strictly restricted to a dev placeholder banner.
3. **Failsafe Safety Architecture:**
   Safety warnings are shown **before any operating instructions unlock**. High-hazard instruments (`hazardLevel: "high"`, such as soldering stations and Bunsen burners) require confidence $\ge 80\%$ or explicit manual confirmation plus mandatory personal protective equipment (PPE) check-off.
4. **Honest, Measurable AI (No Invented Numbers):**
   Includes an evaluation script (`training/eval/evaluate.py`) that calculates real mAP@0.5, mAP@0.5:0.95, and precision/recall curves. If no evaluation has been run, the Model Report page reports *"No evaluation run yet"*—never fabricated claims.

---

## 3. Tech Stack

- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4
- **3D Graphics & Pose Rendering:** Three.js
- **Computer Vision & Tracking:**
  - Standard OpenCV `DICT_4X4_50` ArUco Marker Detector in pure TypeScript (`src/lib/markers.ts`)
  - Planar Homography DLT Pose Estimator (`src/lib/pose.ts`)
  - ByteTrack-style IoU + Velocity-smoothing Object Tracker (`src/lib/tracker.ts`)
- **Database & Offline Storage:** Dexie.js (IndexedDB) with auto-seeding
- **Speech & Audio:** Web Speech API (English & Hindi accents)
- **PWA & Offline:** `vite-plugin-pwa` with service worker precaching
- **Icons:** Lucide React
- **Testing:** Vitest

---

## 4. File Structure

```
/
├── public/
│   ├── favicon.svg             # Emerald target reticle logo
│   ├── models/lablens/         # Target folder for fine-tuned TF.js model
│   └── robots.txt
├── src/
│   ├── __tests__/              # Vitest unit test suites
│   │   ├── tracker.test.ts     # IoU tracking & occlusion survival tests
│   │   ├── safety.test.ts      # High-hazard gates & user confirmation tests
│   │   ├── anchors.test.ts     # 3-tier anchor resolution hierarchy tests
│   │   └── schema.test.ts      # Database integrity & targetPartId tests
│   ├── components/
│   │   ├── ARCanvas.tsx        # 2D canvas overlay (boxes, crosshairs, edge indicators)
│   │   ├── ThreeOverlay.tsx    # Transparent Three.js 3D AR anchor renderer
│   │   ├── SafetyGate.tsx      # Safety card with PPE verification checklist
│   │   ├── StepPanel.tsx       # Step walkthrough with part target highlights & audio
│   │   ├── CandidateSheet.tsx  # Top-3 candidates sheet with real model probabilities
│   │   ├── DebugHUD.tsx        # Live latency ms, FPS, backend, and tracking readout
│   │   └── Header.tsx          # Brand emblem, online/offline, language & bookmark nav
│   ├── config/
│   │   └── model.config.ts     # Single-point configuration for model swapping & thresholds
│   ├── data/
│   │   ├── equipment.json      # 15 core lab instruments with 3D parts & steps
│   │   └── aruco_4x4_50.json   # Authentic OpenCV DICT_4X4_50 bit patterns
│   ├── lib/
│   │   ├── camera.ts           # MediaStream, facingMode flip, torch, freeze frame
│   │   ├── markers.ts          # Pure TS ArUco detector & SVG marker generator
│   │   ├── pose.ts             # 6-DoF planar pose decomposition & camera intrinsics
│   │   ├── tracker.ts          # IoU + Kalman motion prediction & occlusion memory
│   │   ├── anchors.ts          # 3-tier anchor fallback resolution & edge checks
│   │   ├── detection.ts        # Throttled recognition pipeline & latency benchmarks
│   │   ├── db.ts               # Dexie IndexedDB CRUD, history, and bookmarks
│   │   ├── tts.ts              # Web Speech API speech synthesis
│   │   └── i18n.ts             # English & Hindi translations
│   ├── pages/
│   │   ├── Home.tsx            # Scan launcher, categories, recent scans
│   │   ├── Scan.tsx            # Main AR camera screen with live tracking & guide
│   │   ├── Library.tsx         # Searchable, filterable catalog of all instruments
│   │   ├── Detail.tsx          # Camera-free equipment inspection with 3D anchor table
│   │   ├── PrintMarkers.tsx    # Printable A4 marker sheet generator & calibration
│   │   ├── ModelReport.tsx     # Evaluation report viewer & live device benchmark
│   │   ├── Admin.tsx           # Password-protected instructor admin & review sign-off
│   │   └── Onboarding.tsx      # 3-slide interactive tutorial on first launch
│   ├── types/
│   │   └── equipment.ts        # TypeScript schemas for Equipment, Parts, and Steps
│   ├── App.tsx                 # Main routing and global state
│   ├── index.css               # Tailwind v4 theme, tokens & glassmorphism styling
│   └── main.tsx                # Application entry point
├── training/
│   ├── README_TRAINING.md      # Data collection, scene splitting, and Colab guide
│   ├── train.ipynb             # Colab notebook fine-tuning YOLOv8n on lab tools
│   ├── export_tfjs.sh          # Export script converting YOLOv8 to TF.js
│   ├── latency_benchmark.html  # Standalone client-side hardware latency benchmark
│   ├── class_map.json          # Mapping of detector classes to equipment IDs
│   └── eval/
│       └── evaluate.py         # Official mAP, PR curves, and threshold calculator
├── package.json
├── vite.config.ts
└── README.md
```

---

## 5. Quickstart & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Installation
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) on your desktop browser or mobile phone (on same Wi-Fi using `npm run dev -- --host`).

### 3. Run Unit Tests
```bash
npm test
```
Executes all 17 unit tests verifying tracker occlusion survival, safety gates, anchor resolution, and database schema integrity.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in `/dist` with service worker precaching for full offline PWA execution.

---

## 6. How Real AR Anchoring Works

Virtual objects in LabLens are not static 2D screen overlays. Anchoring is resolved through a 3-tier hierarchy:

```
[Camera Video Frame]
        │
        ▼
   Does an ArUco marker exist?
  ┌─────┴─────────────────────────┐
  │ YES                           │ NO
  ▼                               ▼
[Tier 1: Marker-Anchored]   Is part detector active?
- Compute homography H        ┌─────┴─────────────────┐
- Decompose (R, T) via        │ YES                   │ NO
  camera intrinsics K         ▼                       ▼
- Three.js 3D Arrow & Ring   [Tier 2: Part-Detected] [Tier 3: Approximate]
  placed at:                 - Center 2D box over     - Scale database
  MarkerPose + PartOffset      detected sub-part        bboxAnchor (0..1)
  (Glued in 3D camera space)                            to equipment box
```

The active mode is prominently shown in the AR badge:
- **`Marker-anchored (3D Pose)`**: 6-DoF rigid transform. Virtual content tracks phone rotation and pitch.
- **`Part-detected (Visual Box)`**: Visual bounding box around detected component.
- **`Approximate (Relative)`**: Normalized bounding box coordinates from database.

---

## 7. How to Add a New Instrument in Under 2 Minutes

### Option A: Via the Admin Portal (No Code)
1. Navigate to `/admin` (or click **Instructor Admin** in footer).
2. Enter instructor password (`admin123`).
3. Click **Add New Instrument**.
4. Fill in name, Hindi translation, ArUco marker ID (0-49), category, and parts with offsets.
5. Click **Save Changes**. The instrument is immediately persisted to IndexedDB.

### Option B: Via `src/data/equipment.json`
Add an entry to the JSON array:
```json
{
  "id": "centrifuge_benchtop",
  "name": "Microcentrifuge",
  "nameHi": "माइक्रोसेंट्रीफ्यूज",
  "category": "Measurement",
  "aliases": ["Centrifuge", "Spin Meter"],
  "markerId": 15,
  "hazardLevel": "medium",
  "specs": {
    "Max Speed": "14,000 RPM (16,000 x g)",
    "Rotor Capacity": "12 x 1.5/2.0 mL tubes"
  },
  "parts": [
    {
      "id": "rotor_lid",
      "name": "Aerosol-Tight Rotor Lid",
      "nameHi": "रोटर ढक्कन",
      "bboxAnchor": { "x": 0.5, "y": 0.4 },
      "markerOffset": { "x": 0.0, "y": 0.5, "z": 0.1 },
      "detectorClass": null
    },
    {
      "id": "speed_dial",
      "name": "RPM Speed Control Knob",
      "nameHi": "स्पीड कंट्रोल नॉब",
      "bboxAnchor": { "x": 0.3, "y": 0.8 },
      "markerOffset": { "x": -1.0, "y": -1.2, "z": 0.1 },
      "detectorClass": null
    },
    {
      "id": "timer_knob",
      "name": "Digital Run Timer Knob",
      "nameHi": "टाइमर नॉब",
      "bboxAnchor": { "x": 0.7, "y": 0.8 },
      "markerOffset": { "x": 1.0, "y": -1.2, "z": 0.1 },
      "detectorClass": null
    }
  ],
  "operatingSteps": [
    {
      "stepNumber": 1,
      "text": "Load sample tubes in strictly balanced opposing pairs across the rotor.",
      "textHi": "ट्यूबों को रोटर में आमने-सामने संतुलित करके लगाएं।",
      "targetPartId": "rotor_lid",
      "arrow": "down"
    }
  ],
  "safetyPrecautions": [
    "NEVER run an unbalanced rotor; severe vibration can shatter the drive spindle."
  ],
  "requiredPPE": ["Safety Glasses", "Lab Coat"],
  "commonMistakes": ["Centrifuging odd numbers of tubes without a counter-balance."],
  "imageUrl": "https://images.unsplash.com/photo-1581092160607-ee22621dd758",
  "manualLink": "https://en.wikipedia.org/wiki/Centrifuge",
  "staffReviewed": null
}
```

---

## 8. What the Team Must Do Manually

1. **Print Physical Markers:**
   - Go to the **Print Markers** page in the app.
   - Print the generated A4 sheet on a standard office printer.
   - Recommended size: **5.0 cm x 5.0 cm** (cut along the borders).
   - Attach with double-sided tape flat near the front panel of each instrument away from reflective glare.
2. **Collect & Label Training Images:**
   - Photograph each instrument from at least 15 angles with diverse lighting.
   - Label boxes in Roboflow or LabelImg using the names in `class_map.json`.
   - Ensure the 70/20/10 split is partitioned **by recording session / scene**.
3. **Execute Training on Google Colab:**
   - Open `training/train.ipynb`.
   - Run the notebook to fine-tune YOLOv8n.
   - Export to TF.js and place files into `public/models/lablens/`.
   - Set `activeModelConfig.type = 'custom-tfjs-detector'` in `src/config/model.config.ts`.
4. **Real-world Lighting Check:**
   - In harsh fluorescent lighting, use the in-app **Freeze Frame** button to inspect a glare-free snapshot.

---

## 9. Known Limitations (Honest Disclosure)

1. **Camera Intrinsics:**
   Smartphone cameras have slight variations in focal length and lens distortion. Without per-device checkerboard camera calibration, 3D pose depth is calculated assuming a nominal $60^\circ$ FOV. The in-app **Marker Calibration tool** lets users input the exact printed marker size (in cm) to scale 3D depth accurately.
2. **Marker Requirement in Primary Mode:**
   Marker mode requires a physical ArUco tag attached to the instrument. If no marker is attached, the app switches to custom ML detection or Simulated Demo Mode.
3. **WebXR Availability:**
   WebXR `immersive-ar` is currently supported in Android Google Chrome, but not in iOS Safari. For iPhone users, LabLens runs on the camera feed overlay with Three.js rendering, providing cross-platform parity.

---

## 10. Future Roadmap

- **On-Device OCR Reading Verification:** Integrate CRNN / Tesseract.js to read the live 7-segment LCD digits on multimeters and compare them with the expected value in each step.
- **Part-Level Keypoint Detector:** Secondary lightweight MobileNet model to detect sub-components (terminal ports, knobs) directly in the camera crop.
- **Cloud Synchronization:** Optional Supabase sync for cross-university lab equipment databases.
- **WebXR Depth Occlusion:** Occlude virtual 3D arrows behind real physical hands using WebXR Depth API where supported.
