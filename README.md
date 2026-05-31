# GesturePulse

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/AnnaeshaDebnath/gesturepulse?color=2cc55e&logo=github&style=flat-square)](https://github.com/AnnaeshaDebnath/gesturepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Platform: Web](https://img.shields.io/badge/Platform-Web-orange?style=flat-square)](#)

GesturePulse is a highly optimized, client-side web application designed for real-time computer vision-based tracking. Developed by **[Annaesha Debnath](https://github.com/AnnaeshaDebnath)** using advanced geometric landmark calculations on top of the MediaPipe Holistic framework, the application interprets complex hand gestures and facial expressions directly inside a browser context, delivering a fluid telemetry stream with zero server overhead.

---

## 📌 Features

### 🧠 Adaptive Facial Geometry Matrix
* **Automated Baseline Calibration:** Scans the user's natural resting face during the first 30 frames to calculate dynamic, personalized thresholds rather than relying on fixed numbers.
* **5-State Expression Engine:** Evaluates horizontal elongation and inner lip vertical split gaps to accurately toggle between **Neutral 😐**, **Smile 😊**, **Happy 😁** (teeth exposed), **Excited 😮**, and **Pout 😗**.
* **Anti-Mirrored UI Overlays:** Projects an un-mirrored, forward-reading canvas text flag right above a custom-padded face bounding box container.

### ✋ Precision Hand Analytics Skeletal View
* **White Thin Skeletal Rendering:** Swaps heavy default colored visualizers for a sleek, thin white geometric layout (`lineWidth: 1.5`) with micro-red joint anchors.
* **Mirror-Compensated Logic:** Features an inverted thumb calculation mechanism to ensure reliable finger counting on front-facing webcams without boundary clipping errors.
* **Custom Gesture Modulators:** Out-of-the-box hardware processing support for:
  * 🤟 **Rockstar Sign** (Index & Pinky up, Middle & Ring curled)
  * 👍 **Thumbs Up** / 👎 **Thumbs Down** (Rotational vector orientation tracking)
  * 🫶 **Heart Gesture** (Dual-hand profile integration metrics)
  * ✋ **Slap Gesture / Four-Finger Hand** (Tight finger spread check)

---
## Developed by- Annaesha Debnath

