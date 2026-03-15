# Opening Coach

A lightweight chess learning app focused on opening training.

## Features
- 13 opening lessons with variation trees, including: Ruy Lopez, Italian, Sicilian, Caro-Kann, Scotch, King's Indian, Nimzo-Indian, QGD, Slav, two QGA lines, London, and French.
- Choose side, training mode (`Opening Focus` or `Spaced Repetition`), opening, and opponent strength (`1` to `5`).
- Interactive board with legal moves, 1-second opponent move animations, and full playable games.
- Opening coaching with transposition-aware move checking and immediate "better move" feedback.
- Move explanations and opening plan guidance from the current position.
- Local multi-user accounts (create/login/logout) with per-user progress tracking.
- Stats tracked per opening + side + strength, plus spaced-repetition due scheduling.

## Run locally
1. From this folder, start a static file server:
   ```bash
   python3 -m http.server 4173
   ```
2. Open:
   [http://localhost:4173/index.html](http://localhost:4173/index.html)

## Notes
- The frontend imports `chess.js` from CDN for legal move handling.
- Promotions auto-queen.
- Username memory and auth session state are cached locally in the browser, but account data and progress can be served by the backend API.

## Backend scaffold
1. Install backend dependencies:
   ```bash
   cd "/Users/peter/Documents/New project/backend"
   npm install
   ```
2. Create a local env file:
   ```bash
   cp .env.example .env
   ```
3. Put your rotated Neon connection string in `backend/.env` as `DATABASE_URL`.
4. Create the database tables by running `backend/schema.sql` against your Neon database.
5. Start the API:
   ```bash
   npm run dev
   ```

## Deployment notes
- The frontend reads the backend URL from the `<meta name="opening-coach-api-base-url">` tag in [index.html](/Users/peter/Documents/New%20project/index.html). For local development it is `http://localhost:4000`.
- Before deploying the frontend, change that meta tag to your real deployed backend URL.
- The backend accepts one or more allowed frontend origins through `CORS_ORIGIN` in `backend/.env`. Use a comma-separated list if you need both local and deployed frontends, for example:
  ```env
  CORS_ORIGIN=http://localhost:4173,https://your-frontend.vercel.app
  ```
