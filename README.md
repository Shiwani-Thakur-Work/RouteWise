# RouteWise

> **Plan the journey, not just the destination.**

RouteWise is an AI-assisted multi-stop journey planner that helps people combine everyday errands with an existing trip while respecting time, budget and preference constraints.

**Problem:** Existing map experiences make it easy to find individual places, but planning several errands around an existing journey still requires manual search, comparison and route planning.

**Hypothesis:** If users can describe what they need to accomplish in natural language, RouteWise can reduce the effort required to create a practical multi-stop itinerary.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 2. Worker (Cloudflare Workers)

```bash
cd worker
npm install

# Add your Gemini API key to .dev.vars:
# GEMINI_API_KEY=your_key_here

npm run dev
# → http://localhost:8787
```

---

## Project Structure

```
routewise/
├── frontend/          React + Vite + Leaflet frontend
├── worker/            Cloudflare Workers API
│   ├── src/
│   │   ├── index.js           API entry point
│   │   ├── nlProcessor.js     Gemini NLU
│   │   ├── placeFinder.js     OSM / Nominatim
│   │   ├── detourCalculator.js OSRM routing
│   │   ├── candidateScorer.js  Scoring algorithm
│   │   ├── routeOptimizer.js   Stop ordering
│   │   ├── explainer.js        Explanation generator
│   │   └── analyticsLogger.js  Cloudflare D1
│   └── schema.sql
└── docs/
    ├── ProblemStatement.md
    ├── Architecture.md
    └── ImplementationPlan.md
```

---

## Tech Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite | Free |
| Map | Leaflet + OpenStreetMap | Free |
| AI / NLU | Gemini API (free tier) | Free |
| Backend | Cloudflare Workers | Free |
| Database | Cloudflare D1 | Free |
| Geocoding | Nominatim (OSM) | Free |
| Routing | OSRM | Free |

---

## Docs

- [Problem Statement](docs/ProblemStatement.md)
- [Architecture](docs/Architecture.md)
- [Implementation Plan](docs/ImplementationPlan.md)
