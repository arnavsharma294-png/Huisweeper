# Huisweeper

Authentic Indian sweets Minesweeper logic puzzle with Rajasthani Ghewar and Soan Papdi.

## Overview

Huisweeper replaces traditional Minesweeper hazards and numbers with authentic Indian festival confections:
- **Soan Papdi Hazards**: Dangerous flaky sweet boxes hidden across the grid. Clicking one triggers detonation.
- **Rajasthani Ghewar Counts**: Safe revealed tiles display golden honeycomb Ghewars matching the exact count of adjacent hazards (1 to 8 in dice pip arrangements).
- **Zero Hazards**: Safe blank tiles cascade and reveal surrounding neighbors automatically.

## Features

- **Classic Mechanics**: Safe first click, flood-fill cascading, flag markers, and tile chording.
- **Difficulty Levels**:
  - Beginner: 9x9 grid, 10 hazards
  - Medium: 12x12 grid, 22 hazards
  - Expert: 14x18 grid, 45 hazards
- **Pure Client-Side Audio**: Synthesized sound effects using the Web Audio API with zero external audio assets.
- **Touch and Desktop Controls**: Supports desktop right-click, touch screen long-press, and a mobile-friendly Flag Mode toggle.
- **Design System**: Refined dark slate theme with crisp geometry, custom vector SVGs, and zero tracking.
- **Compliance & Privacy**: Dedicated Privacy Policy (`privacy.html`), Terms of Service (`terms.html`), and custom domain configuration (`CNAME` for `huisweeper.com`).

## Local Development

To run Huisweeper locally:

```bash
# Start a simple HTTP server in the repository directory
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in your browser.

## License

Personal and non-commercial entertainment use.
