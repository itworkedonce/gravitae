# Gravitae (Alpha) 🍎

Simple 2D physics for Adobe After Effects.

---

## About the Project

Gravitae is an open-source tool designed to bring straightforward physics simulations to After Effects

* **Complex Shapes:** It uses actual shape paths to handle concave and convex shapes.
* **Smart Anchors:** It automatically calculates the center of mass and moves the anchor point for you.
* **Keyframe Everything:** You can animate transformations (position, scale, rotation) and physics properties (density, friction, bounce) on both Static and Dynamic objects.
* **Timeline Sync:** The engine follows your In/Out points. It only simulates objects while they are visible on the timeline.
* **Live Expressions:** No keyframe baking. It uses expressions to link the simulation to your layers.
* **Automatic Cleanup:** If you delete a layer from your After Effects timeline, it’s automatically removed from the simulation.

---

## Interface Guide

![Gravitae Interface](Screenshot%202026-02-04%20at%2018.01.34.png)

### Toolbar
* ➕ **Dynamic:** Converts a shape layer into a physical object that falls and bounces. 
* 🔘 **Static:** Converts a shape layer into a physical object that isn't affected by gravity.
* 🌍 **Gravity:** Creates a control layer to tweak global settings like gravity strength, direction and drag.

### Simulation Controls
* **Sim Progress:** A live readout of your composition time and simulation progression.
* **PLAY:** Preview the simulation inside the panel before committing.
* **APPLY:** Hook up the simulation to your AE layers via expressions. It's non-destructive.
* **RESET:** Kill the current simulation and start fresh.
* **World Status:** Shows your current Gravity Angle, World Scale, and Air Drag.

### Layer List
* ❌ **Remove:** Click the "X" next to any layer in the list to remove it from the physics engine.

### Logger
* 📜 **Log Panel:** Toggle this to show or hide the console. Bugs are expected—check here if things get weird.

---

## Built With

* **[Bolt CEP](https://github.com/hyperbrew/bolt-cep):** The foundation for this React-based extension.
* **[Matter.js](https://brm.io/matter-js/):** The engine handling all the 2D rigid body dynamics.
* **[Space Grotesk](https://floriankarsten.github.io/space-grotesk/):** Includes Space Grotesk by Florian Karsten

---

## Installation

### 1. Install the Extension
* **Automatic:** Use a ZXP installer (like aescripts) and drag the `gravitae.zxp` file.
* **Manual:** Unzip the ZXP and paste the folder here:
   * **Win:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
   * **Mac:** `/Library/Application Support/Adobe/CEP/extensions/`

### 2. Install the Physics Presets (Required)
For the plugin to create control sliders, you must copy `gravitaeBody.ffx` [cite: 1] [cite_start]and `gravitaeWorld.ffx` [cite: 3] to your **User Presets** folder:

**Windows:**
`Documents\Adobe\After Effects [Version]\User Presets`

**macOS:**
`Documents/Adobe/After Effects [Version]/User Presets`

**Important:** If these files are missing, the plugin will use default values and you won't be able to animate or customize the physical properties of your objects.

---

> **Note:** This is an Alpha release. I’m aware of some bugs (like switching from Static to Dynamic). If you want to help or just tinker with the code to make it better, feel free!
