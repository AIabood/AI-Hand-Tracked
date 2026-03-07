<div align="center">

# 🖐️ AI Hand-Tracked Voxel Builder

**A gesture-driven 3D voxel building experience powered by AI hand tracking**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r173-000000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-4285F4?logo=google&logoColor=white)](https://mediapipe.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)

Build 3D structures using nothing but your hands — no mouse, no keyboard, no controller.

</div>

---

## ✨ Features

### 🎮 Gesture Controls

| Gesture | Hand | Action |
|---------|------|--------|
| ☝️ Index finger | Right | Aim cursor position |
| ✌️ Index + Middle | Right | Place voxels continuously |
| ✊ Fist drag | Left | Rotate the 3D scene |
| 🤏 Pinch + drag | Left | Pan the scene |
| 🤌 Pinch (scale) | Left | Zoom in/out |

### 🏆 Challenge System

Three tiers of challenges to test your skills:

- **🏗️ Shape Challenges** — Replicate target shapes with precision
- **⚡ Speed Challenges** — Build against the clock
- **🎯 Precision Challenges** — Place voxels at exact coordinates

Each challenge features:

- 🕐 3-2-1 countdown with sound effects
- 📊 Live progress bar and timer
- ⭐ Star rating system (1-3 stars)
- 📈 Performance metrics (accuracy, stability, mistakes)
- 👶 Kids mode with easier tolerances

### 🎨 Premium UI

- Glassmorphism design with animated gradients
- Real-time webcam feed with scanning overlay
- Ghost target voxels with glow effects
- Sound effects via Web Audio API

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- A **webcam** (built-in or external)
- **Google Chrome** recommended (best MediaPipe support)

### Installation

```bash
# Clone the repository
git clone https://github.com/AIabood/AI-Hand-Tracked.git
cd AI-Hand-Tracked

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open **<http://localhost:5173>** in your browser and allow camera access.

---

## 🏗️ Project Structure

```
src/
├── components/          # UI components
│   ├── UIOverlay.jsx        # Main HUD overlay
│   ├── GuidedUI.jsx         # Challenge selector & dashboard
│   ├── ChallengeHUD.jsx     # Countdown, timer, progress bar
│   └── ChallengeResults.jsx # Star rating & results screen
├── handTracking/        # MediaPipe integration
│   ├── HandTracker.jsx      # Hand detection & gesture recognition
│   └── GestureDetector.js   # Gesture classification logic
├── scene/               # 3D scene components
│   ├── VoxelScene.jsx       # Main R3F scene renderer
│   ├── SceneInteraction.jsx # Gesture → 3D action mapping
│   └── TrackpadInteraction.jsx # Fallback mouse controls
├── voxel/               # Voxel system
│   ├── useVoxelStore.js     # Zustand state management
│   ├── Voxel.jsx            # Individual voxel renderer
│   ├── GhostModel.jsx       # Ghost target visualization
│   ├── GhostVoxel.jsx       # Placement preview voxel
│   └── challenges.json      # 8 built-in challenges
├── utils/
│   └── sounds.js            # Web Audio API sound effects
└── index.css            # Global styles & design system
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **React Three Fiber** | Declarative 3D rendering |
| **Three.js** | 3D graphics engine |
| **MediaPipe Hands** | Real-time hand tracking |
| **Zustand** | Lightweight state management |
| **Vite** | Build tool & dev server |
| **Lucide React** | Icon library |
| **Web Audio API** | Sound effects |

---

## 🎯 Built-in Challenges

| # | Challenge | Type | Difficulty | Time Limit |
|---|-----------|------|------------|------------|
| 1 | Single Voxel | 🎯 Precision | Easy | ∞ |
| 2 | Row of 3 | 🏗️ Shape | Easy | ∞ |
| 3 | L-Shape | 🏗️ Shape | Easy | 60s |
| 4 | Staircase | 🏗️ Shape | Medium | 90s |
| 5 | Cube 2×2×2 | 🏗️ Shape | Medium | 120s |
| 6 | House | 🏗️ Shape | Hard | 180s |
| 7 | Speed Row | ⚡ Speed | Medium | 30s |
| 8 | Precision Dot | 🎯 Precision | Hard | 45s |

---

## 🧠 How It Works

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  Webcam  │ →  │  MediaPipe   │ →  │   Gesture    │ →  │  Three.js │
│  Input   │    │  Hand Model  │    │  Classifier  │    │  Scene   │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                          ↓
                                   ┌──────────────┐
                                   │   Zustand     │
                                   │   Store       │
                                   └──────────────┘
```

1. **Webcam** captures video at 640×480
2. **MediaPipe Hands** detects 21 hand landmarks per hand
3. **GestureDetector** classifies gestures (pinch, fist, point, etc.)
4. **SceneInteraction** maps gestures to 3D actions
5. **Zustand Store** manages state reactively
6. **React Three Fiber** renders the 3D scene at 60fps

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using AI Hand Tracking**

[⬆ Back to Top](#️-ai-hand-tracked-voxel-builder)

</div>
