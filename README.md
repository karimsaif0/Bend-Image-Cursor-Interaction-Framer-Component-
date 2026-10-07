<div align="center">

# Bend Image — Cursor Interaction for Framer

### Static images, dynamic personality.

**WebGL-powered elastic distortion · Cursor tracking · Fluid motion**

[![Live Preview](https://img.shields.io/badge/Live_Preview-Explore_the_Interaction-0055FF?style=for-the-badge)](https://bendimagecursor.framer.website/)
[![Framer](https://img.shields.io/badge/Platform-Framer-111111?style=for-the-badge)](https://www.framer.com/)
[![Creator](https://img.shields.io/badge/Created_by-Karim_Saif-F0B429?style=for-the-badge)](https://x.com/karimsaif0)

**[↗ Experience the live demo](https://bendimagecursor.framer.website/)**

</div>

---

## Meet Bend Image

**Bend Image** brings motion and personality to ordinary imagery. Move your cursor and the image follows with gentle easing, curves in response to pointer velocity, and settles naturally when you move away.

Created for Framer designers who want tactile, expressive visuals without building a custom graphics pipeline from scratch.

## Highlights

| Experience | Details |
| --- | --- |
| 🌀 **Elastic bending** | GPU-driven mesh deformation responds to pointer movement |
| 🖱️ **Fluid cursor tracking** | Adjustable follow speed for expressive or subtle motion |
| ↩️ **Smooth return** | Tunable recovery when the pointer leaves |
| 🎛️ **Framer controls** | Customize imagery, sizing, strength, bend limits, and motion |
| 🧊 **Pixelated mode** | Optional nearest-neighbor sampling for a digital aesthetic |
| 📐 **Responsive display** | Adapts image dimensions to the component |
| ♿ **Motion aware** | Respects reduced-motion settings and supplies accessible labeling |
| ⚡ **Efficient animation** | Stops animating when settled, offscreen, or in hidden tabs |
| 🖼️ **Static rendering** | Image fallback for static previews and unsupported WebGL |
| 🧹 **Resource lifecycle** | Resize, context restoration, and unmount cleanup |

## [Live preview →](https://bendimagecursor.framer.website/)

Try moving your cursor slowly, then quickly. The difference in speed changes the deformation, turning a static image into an interactive composition.

## Install in Framer

1. Create a new **Code Component** in your Framer project.
2. Open [`KarimSaifBendImage.tsx`](./KarimSaifBendImage.tsx) and copy its contents into the component file.
3. Add **Karim Saif Bend Image** to your canvas.
4. Select an image from the properties panel.
5. Tune the controls and preview the interaction.

> This is a Framer code component, not a standalone React application. It uses Framer's code-component APIs.

## Customize your interaction

| Control | Description |
| --- | --- |
| **Image** | Choose the image displayed on the canvas |
| **Width / Height** | Set the intended image dimensions |
| **Follow Speed** | Choose how quickly the image approaches the cursor |
| **Bend Strength** | Increase or soften elastic deformation |
| **Max Bend** | Set a maximum deformation limit |
| **Return Speed** | Adjust how smoothly the image returns to center |
| **Pixelated** | Enable crisp pixel-like texture filtering |
| **Interaction** | Toggle cursor interactions |
| **Max DPR** | Control rendering resolution and GPU workload |
| **Alt Text** | Describe the image accessibly |

### Creative starting points

- **Editorial subtlety** — dial down Bend Strength, keep a soft Return Speed, and let the imagery lead.
- **Experimental portfolio** — push Bend Strength and Max Bend for a stronger sense of physicality.
- **Digital playground** — turn on Pixelated mode to explore a graphic, retro-inspired feel.

## Perfect for

Creative portfolios · Design agencies · Photography showcases · Digital galleries · Fashion & lifestyle websites · Landing-page hero sections · Experimental web experiences

## Under the hood

The component renders an image on a WebGL mesh and applies cursor-responsive displacement through a vertex shader. It includes a static image fallback, supports reduced-motion preferences, clamps device pixel ratio, pauses when outside the viewport, and releases graphics resources on unmount.

For WebGL rendering, use an image URL that allows browser texture loading. If WebGL cannot initialize, the component can display an HTML image fallback.

## Support

Have feedback or an idea for the next interaction? Get in touch:

- **X:** [@karimsaif0](https://x.com/karimsaif0)
- **Email:** [karimsaif0102@gmail.com](mailto:karimsaif0102@gmail.com)
- **Live demo:** [bendimagecursor.framer.website](https://bendimagecursor.framer.website/)

---

<div align="center">

**Made with 💛 by Karim Saif**

*Every movement can be an interaction.*

</div>
