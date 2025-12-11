# Budget Dashboard - Quick Start Guide

## 🚀 Get Started (3 steps)

1) Install dependencies
```bash
cd ui
npm install
```

2) Configure environment (optional)
```bash
echo "VITE_API_URL=http://localhost:8000" > .env
```
If you skip this, the app defaults to `http://localhost:8000`. Make sure the backend is running there or update `VITE_API_URL`.

3) Start the dashboard
```bash
npm run dev
```
Open http://localhost:5173.

---

## Dashboard highlights
- KPI cards: total income, outgoings, purchases, and net position
- Recurring transactions card with projected balance and next income date
- Balance over time chart
- Spending by category and top merchants

---

## Recurring calculations
- Picks the largest income as the anchor
- Groups transactions by `day_of_month` to spot repeats
- Averages recurring items and projects balance after expenses

---

## Configuration
- API URL: set `VITE_API_URL` in `.env` if your backend is not on `http://localhost:8000`
- Theme: edit `src/theme/theme.ts`

---

## Need data?
1) Start the backend
```bash
cd ../agent
python run_server.py
```
2) Upload a statement
```bash
curl -X POST http://localhost:8000/upload-statement \
  -F "file=@your-statement.csv"
```
3) Refresh the dashboard.

---

## Scripts
- `npm run dev` - start locally
- `npm run build` - production build
- `npm run lint` - lint checks
- `npm run preview` - preview production build
