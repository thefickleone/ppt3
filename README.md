# Motional EMF Cinematic Presentation

Single-scene, keyboard-controlled browser presentation for Engineering Physics (Motional EMF), built with plain HTML/CSS/JavaScript.

## Files

- `index.html` - Layered presentation shell (`#background`, `#scene`, `#overlay`, `#ui`)
- `style.css` - Dark neon visual theme and animation styling
- `app.js` - Step system, SVG scene construction, and animation runtime

## Controls

- `ArrowRight` or `Space`: next dialogue line (then next step after last line)
- `ArrowLeft`: previous dialogue line (or previous step last line)
- `R`: reload

Steps run from `0` to `6`:

0. Hook
1. Charge separation
2. EMF creation
3. Current flow
4. Lenz's law
5. Energy conversion (mechanical -> electrical)
6. Applications / finale

## Presentation-complete additions

- Clean visual-only physics scene in `#scene`
- Dedicated explanation layer in `#overlay` (`#explanation`)
- Step-synced one-line presenter explanation with smooth fade transitions
- Full script system with per-step `lines[]` dialogue progression
- Current-direction arrows, Lenz resistance behavior, and energy-flow arrows

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

