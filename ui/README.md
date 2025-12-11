# Budget Dashboard (UI)

React + TypeScript + Vite frontend for the Budget Agent API.

## Setup
```bash
cd ui
npm install
```
Optionally create `.env` if your API is not at `http://localhost:8000`:
```bash
echo "VITE_API_URL=http://localhost:8000" > .env
```

## Scripts
- `npm run dev` — start locally on http://localhost:5173
- `npm run build` — production build
- `npm run lint` — lint checks
- `npm run preview` — preview the build

## Data expectations
The dashboard reads from the Budget Agent backend and falls back to `http://localhost:8000` when `VITE_API_URL` is not set. Start the backend and upload at least one statement to populate the charts.

## Troubleshooting
- Missing data: verify the backend is running and `VITE_API_URL` points to it
- Build issues: `rm -rf node_modules package-lock.json && npm install`
