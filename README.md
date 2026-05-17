# NotchX

**NotchX** is a high-fidelity, interactive desktop utility for Windows built with Electron, React, Tailwind CSS, and Framer Motion. Inspired by the Dynamic Island, NotchX acts as a persistent, floating heads-up display at the top center of your screen, seamlessly integrating with your Windows Operating System.

## ✨ Features

- **Live Hardware Telemetry**: Monitors real-time CPU and RAM usage and displays them natively via fluid progress bars.
- **Scroll-to-Volume**: Change your Windows master volume instantly by hovering over the pill and using your mouse scroll wheel.
- **Universal Drag & Drop Hub**: Drag any file from your desktop towards the pill to activate the dropzone and share/stash files instantly.
- **Smart Power Awareness**: Automatically pops open the battery state to notify you when your laptop is plugged in or disconnected from power.
- **Media Controller**: Control your currently playing media, complete with an audio visualizer and seamless transitions.
- **Liquid Physics & Animations**: Powered by Framer Motion and SVG Goo filters, the overlay smoothly expands, splits, and morphs between states just like liquid.
- **Z-Axis Notification Stacking**: Elegantly handles multiple system notifications with a slick, layered 3D view. *(Currently toggled off for standard list view)*

## 🚀 Tech Stack

- **Frontend**: React, TypeScript, Framer Motion, Tailwind CSS
- **Backend / Bridge**: Electron, Node.js (`main.cjs` / `preload.cjs`)
- **Native OS Hooks**: `systeminformation` (CPU/RAM), `loudness` (Volume), `electron-power-monitor` (Battery)

## 📦 Getting Started

### Prerequisites
Make sure you have Node.js and `npm` installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adhityamac/Notchx.git
   cd Notchx
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development environment. This will compile the frontend via Vite and boot the Electron backend simultaneously:
   ```bash
   npm run dev:electron
   ```

## 🎨 Design

The original prototype concept design is available at: [NotchX Figma](https://www.figma.com/design/JOU14dgiSnDckoGLCrFxBH/notchX). 
The application prioritizes "liquid" interactions, using `feColorMatrix` SVG filters to give elements a premium, gooey merge effect when splitting into separate pill segments.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/adhityamac/Notchx/issues).