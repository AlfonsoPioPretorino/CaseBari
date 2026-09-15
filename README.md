# CaseBari: a map-first rental tracker

A small web app for keeping track of houses and apartments you are considering renting in one city (Bari by default).
You open it, you see the map. You drop rentals and your own points of interest (office, university, gym…) on it,
and you see how far everything is from everything else.

It is intentionally **not** a real-estate CRM. A rental stores only a title, address, location, monthly rent, floor,
listing URL, notes, pros and cons.

---

## Quick start

Requirements: **Node.js 20.19+** (or 22.12+) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173. This starts two processes:

| Process | URL | What it does |
| --- | --- | --- |
| API (`server/server.js`) | http://127.0.0.1:3001 | REST API over `server/data/data.json` |
| Vite dev server | http://localhost:5173 | React app; forwards `/api` to the API |

### Production

```bash
npm run build   # builds the frontend into dist/
npm start       # one Node process serves the API and dist/ on http://127.0.0.1:3001
```

To use it from your phone on the same network, run `HOST=0.0.0.0 npm start` and open `http://<your-computer-ip>:3001`.
There is no authentication, so only do this on a network you trust.

### Configuration

Copy `.env.example` to `.env.local` to change the city, map center, currency, locale, tile server, routing or geocoding
service. Server options (`PORT`, `HOST`, `DATA_FILE`) are environment variables. Rebuild after changing `VITE_*` values.

---

## Using the app

| Task | How |
| --- | --- |
| Explore | Pan and zoom the map, or use **Find a place** (top-left) to jump to an address. |
| Add a rental | **+ Rental**, then click the map. The address is suggested from the pin, and every field except the location is optional. You can also search a place and pick **Add rental here**. |
| See a rental | Click its price marker for a compact popup, then **View details** for the full panel. |
| Edit / move / delete | Pencil and trash icons in the details panel. While editing, click the map or drag the pin to move it. Deleting always asks for confirmation. |
| Pros & cons | Add as many as you like in the form. Each one can be edited inline or removed. |
| Search | The toolbar search matches title, address, notes, URL, pros and cons. |
| Filter | **Filters** tab: rent range, floor range, location/neighborhood text (matched against address and title), visible map area only, and distance from one of your points. |
| My points | **+ Point** (orange diamond markers), click the map, and give it a name plus an optional category and notes. Edit, move (drag) or delete it from its panel. |
| Distances | In a rental's panel, tick the points you care about. Straight-line distances appear right away. Switch on **Walking & driving routes** for route distance and time. Under **Show on map**, choose **Straight** for a dashed line, or **Walking path** / **Driving path** to draw the actual street route with its distance and time. |
| Point → rentals | A point's panel lists every rental ranked by straight-line distance, walking time or driving time. |
| Point → point | A point's panel also measures distances to your other points, with the same map options. |
| Radius search | In a point's panel, set a radius and press **Show rentals within**. Or in Filters choose a point, **Straight-line** and a max km. The circle is drawn on the map. |
| Travel-time filter | In Filters choose a point, then **Walking time** or **Driving time** and a max number of minutes. |
| Compare | Tick **Compare** on rentals, then press **Compare** in the toolbar. You can pick which points to show distances for. |

On mobile, the side panel becomes a bottom sheet. Tap the handle or a tab to expand or collapse it.

---

## Architecture

```
├── index.html
├── vite.config.js            # React plugin + /api proxy for development
├── server/
│   ├── server.js             # Express app: REST routes, error handling, serves dist/ in production
│   ├── store.js              # single-file JSON store (queue + atomic writes)
│   ├── validation.js         # whitelists and validates rental / point fields
│   └── data/data.json        # ← the only persistent data
└── src/
    ├── App.jsx               # app state, layout, wiring between map and panels
    ├── config.js             # city, currency, tile/routing/geocoding settings
    ├── components/           # MapView, PropertyList/Details/Form, PointList/Details/Form,
    │                         # DistanceSection, FiltersPanel, CompareModal, PlaceSearch, …
    ├── hooks/
    │   ├── useCollection.js  # load + CRUD state for a REST collection
    │   └── useTravelMetrics.js # on-demand route distance/time and street paths (not stored)
    ├── services/
    │   ├── api.js            # fetch wrapper
    │   ├── properties.js     # /api/properties
    │   ├── points.js         # /api/points
    │   ├── routing.js        # OSRM table (distance/time) and route (path) requests, cache, queue
    │   └── geocoding.js      # Nominatim search / reverse geocoding
    └── utils/
        ├── geo.js            # coordinate validation, Turf straight-line distance
        ├── filters.js        # search, filters, sorting
        └── format.js         # rent, floor, distance, duration formatting
```

### Dependencies and why they are here

| Package | Purpose |
| --- | --- |
| `react`, `react-dom` | UI |
| `vite`, `@vitejs/plugin-react` | Dev server and build |
| `leaflet`, `react-leaflet` | Interactive map, markers, popups, circles, lines, dragging |
| `@turf/distance`, `@turf/helpers` | Straight-line (great-circle) distance |
| `express` | Lightweight REST API and static file serving |
| `write-file-atomic` | Crash-safe writes (temp file + fsync + rename) |
| `lucide-react` | Icons (tree-shaken, only used icons are bundled) |
| `concurrently` (dev) | Runs API and Vite together with `npm run dev` |

IDs come from Node's built-in `crypto.randomUUID()`.

### External free services

| Service | Used for | Notes |
| --- | --- | --- |
| OpenStreetMap tiles | Map background | [Tile usage policy](https://operations.osmfoundation.org/policies/tiles/): light use with attribution. For heavier use, set `VITE_TILE_URL` to another provider. |
| FOSSGIS OSRM (`routing.openstreetmap.de`) | Walking and driving distance, time and street paths | Free, fair use. Requests are made only on demand, one at a time, and cached in memory. Distances and times for many destinations are batched with the OSRM *table* API. Paths use the *route* API, one request per selected point. |
| Nominatim | Place search and address suggestion | [Usage policy](https://operations.osmfoundation.org/policies/nominatim/): max 1 request/s, no search-as-you-type. The app throttles and caches requests and searches only on Enter. |

---

## Data

### File format

Everything lives in **`server/data/data.json`**. No database, IndexedDB or localStorage is used.

```json
{
  "properties": [
    {
      "id": "0d6f1c1e-5a0b-4d51-9b8e-2c7f0f0b7e11",
      "title": "Bright flat near the station",
      "address": "Via Giuseppe Capruzzi 148, Carrassi",
      "latitude": 41.1165,
      "longitude": 16.87,
      "rent": 850,
      "floor": 3,
      "url": "https://example.com/listing",
      "notes": "Quiet street, close to public transport.",
      "pros": ["Close to the station", "Bright"],
      "cons": ["Small kitchen", "No elevator"]
    }
  ],
  "points": [
    {
      "id": "6b0f8a52-2f35-4a55-8f3d-4a1d2a2f9c3e",
      "name": "Office",
      "category": "Work",
      "notes": "",
      "latitude": 41.129,
      "longitude": 16.864
    }
  ]
}
```

| Field | Rules |
| --- | --- |
| `latitude`, `longitude` | **Required.** Numbers within −90…90 / −180…180. |
| `title`, `address`, `notes`, `url` | Optional strings (`""` when empty). `url` must be `http(s)://`. |
| `rent` | Optional number ≥ 0, or `null`. |
| `floor` | Optional whole number (0 = ground floor, negative = basement), or `null`. |
| `pros`, `cons` | Optional lists of short strings (`[]` when empty). |
| Point `name` | Required. `category` and `notes` are optional. |

Unknown fields in requests are discarded. Rentals and points are separate lists with no references between them.
**Distances are never stored**: they are calculated from coordinates whenever they are shown, so moving a point
immediately updates every distance.

### How the file is kept safe

- All writes go through a single in-process queue, so concurrent requests cannot overwrite each other.
- Each change re-reads the file, applies only that change and writes the whole document back.
- Writes are atomic (temp file, fsync, rename). A crash leaves either the old file or the new one, never a half-written file.
- A `PUT` or `DELETE` for an unknown id returns 404 and does not touch the file.
- If `data.json` is invalid JSON, the server **refuses to start** and never overwrites it. Fix or move the file, then restart.
  A missing file is created empty.
- Records with invalid coordinates, for example from manual edits, are kept. The app lists them with a warning, leaves them off the map and lets you fix them.

To back up your data, copy `server/data/data.json`.

---

## REST API

Base path `/api`. JSON in, JSON out. Errors return `{ "error": "message" }` with a 4xx or 5xx status.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/properties` | | `200` array of rentals |
| GET | `/api/properties/:id` | | `200` rental, or `404` |
| POST | `/api/properties` | rental fields | `201` created rental with `id` |
| PUT | `/api/properties/:id` | rental fields (full replacement) | `200` updated rental, or `404` |
| DELETE | `/api/properties/:id` | | `204`, or `404` |
| GET | `/api/points` | | `200` array of points |
| GET | `/api/points/:id` | | `200` point, or `404` |
| POST | `/api/points` | point fields | `201` created point with `id` |
| PUT | `/api/points/:id` | point fields (full replacement) | `200` updated point, or `404` |
| DELETE | `/api/points/:id` | | `204`, or `404` |

Example:

```bash
curl -X POST http://127.0.0.1:3001/api/points \
  -H 'Content-Type: application/json' \
  -d '{"name":"Office","latitude":41.129,"longitude":16.864}'
```

---

## Distances

- **Straight-line**: great-circle distance from `@turf/distance`, calculated in the browser. Always available, even offline from routing.
  Labeled *straight-line* everywhere.
- **Route (walking / driving)**: distance and duration returned by OSRM. The app shows exactly what the service returns
  and never estimates or invents values. If routing fails, the app says so, keeps showing straight-line distances and does not
  apply time-based filters. If no route exists, it shows *no route found*.
- **Paths on map**: *Walking path* / *Driving path* draw the street route geometry from the OSRM *route* service, labelled with
  that route's distance and time. While a path is loading, or if routing fails or no route exists, a dashed straight line
  labelled *straight* is shown instead, with a message in the panel.
- Route results and paths are cached in memory for the session only.
