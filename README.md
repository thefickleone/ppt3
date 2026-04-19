# Motional EMF Cinematic Presentation

Single-scene, keyboard-controlled browser presentation for Engineering Physics (Motional EMF), built with plain HTML/CSS/JavaScript.

## Files

- `index.html` - Layered presentation shell (`#background`, `#scene`, `#overlay`, `#ui`)
- `style.css` - Dark neon visual theme and animation styling
- `app.js` - Step system, SVG scene construction, and animation runtime

## Controls

- `ArrowRight` or `Space`: next step
- `ArrowLeft`: previous step
- `R`: reload
- `H`: toggle help hints
- `N`: toggle presenter notes

Steps run from `0` to `5`:

0. Intro
1. Charge separation
2. EMF creation
3. Current flow
4. Lenz's law
5. Applications / finale

## Presentation-complete additions

- Step-specific teaching captions synchronized with transitions
- Equation/state chips for quick concept framing
- Color legend per step (charge/field/current meaning)
- Optional presenter notes overlay for live delivery

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

