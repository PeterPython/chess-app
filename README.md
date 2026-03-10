# Opening Coach

A lightweight chess learning app focused on opening training.

## Features
- 5 high-value openings: Ruy Lopez, Italian Game, Sicilian Defense, Queen's Gambit Declined, French Defense.
- Choose your side (`White` or `Black`) and opening from dropdowns.
- Click-to-move interactive board.
- Immediate feedback if you play a suboptimal move in the opening line.
- Full game play after opening phase with a heuristic opponent.

## Run locally
1. From this folder, start a static file server:
   ```bash
   python3 -m http.server 4173
   ```
2. Open:
   [http://localhost:4173/index.html](http://localhost:4173/index.html)

## Notes
- The app imports `chess.js` from CDN for full legal move handling.
- Promotions auto-queen.
