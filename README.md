# Motional EMF Cinematic Presentation

Single-scene, keyboard-controlled browser presentation for Engineering Physics (Motional EMF), built with plain HTML/CSS/JavaScript.

## Files

- `index.html` - Layered presentation shell (`#background`, `#scene`, `#overlay`, `#ui`)
- `style.css` - Dark neon visual theme and animation styling
- `app.js` - Step system, SVG scene construction, and animation runtime

## Controls

- `ArrowRight` or `Space`: next page
- `ArrowLeft`: previous page
- `R`: reload
- Page 6 includes an interactive `Velocity (v)` slider

Pages run from `0` to `11`:

0. Intro
1. Examples
2. Rod question
3. Motion
4. EMF
5. Derivation
6. Simulation
7. Current
8. Lenz
9. Energy
10. Applications
11. Eddy currents

## Presentation-complete additions

- Clean visual-only physics scene in `#scene`
- Dedicated explanation layer in `#overlay` (`#explanation`)
- Page-synced chapter explanation with smooth fade transitions
- Full page-based chapter system (`0-11`) with explicit `page*` render functions
- Current-direction arrows, Lenz resistance behavior, and energy-flow arrows
- Interactive simulation page showing how `v` changes rod speed, charge separation, and EMF intensity

## Run locally

```bash
cd /home/milanm/WebstormProjects/ppt3
npm run start
```

Open:

- `http://localhost:8080/index.html`

## Quick checks

```bash
cd /home/milanm/WebstormProjects/ppt3
npm test
```

