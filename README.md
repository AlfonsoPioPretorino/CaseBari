# CaseBari: a map-first rental tracker

A small web app for keeping track of houses and apartments you are considering renting in one city (Bari by default).
You open it, you see the map. You drop rentals and your own points of interest (office, university, gym…) on it,
and you see how far everything is from everything else.

It is intentionally **not** a real-estate CRM. A rental stores only a title, address, location, monthly rent, floor,
listing URL, notes, pros and cons.

---

## Quick start

Requirements: **Node.js 20.19+** (or 22.12+), npm and a free Firebase project (see [Firebase setup](#firebase-setup)).

```bash
npm install
cp .env.example .env.local   # then fill in the VITE_FIREBASE_* values
npm run dev
```

Open http://localhost:5173 and sign in with Google, or create an account with email and password.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Builds, then serves `dist/` locally |

The app is fully static: the browser talks directly to Firebase, so `dist/` can be hosted anywhere (e.g. GitHub Pages).

### Firebase setup

Everything below fits in the free **Spark** plan.

1. **Create a project** at https://console.firebase.google.com (Google Analytics is not needed).
2. **Firestore**: *Build → Firestore Database → Create database*. Pick the *Standard* edition, a location close to you
   (e.g. `europe-west8`, Milan; it cannot be changed later) and *production mode*.
3. **Rules**: *Firestore → Rules*, replace the content with [`firestore.rules`](firestore.rules) and press *Publish*.
   (Or with the Firebase CLI: `firebase deploy --only firestore:rules --project <project-id>`.)
4. **Sign-in methods**: *Build → Authentication → Get started → Sign-in method*. Enable **Email/Password** (leave
   *Email link* off) and **Google**.
5. **Members**: in *Firestore → Data*, create a collection `members` and add one document per allowed person.
   The **document ID is the account email in lowercase** (e.g. `someone@gmail.com`); the document can have any
   field, e.g. `name: "Me"`. Nobody else can read or change the data.
6. **Web app config**: *Project settings → General → Your apps → Web (`</>`)*. Register an app (no Hosting needed) and copy
   `apiKey`, `authDomain`, `projectId` and `appId` into `.env.local`.
7. When the site is published, add its domain (e.g. `<user>.github.io`) under *Authentication → Settings → Authorized domains*.
   `localhost` is authorized by default.

### Configuration

`.env.local` also sets the city, map center, currency, locale, tile server, routing and geocoding service
(see `.env.example`). Rebuild or restart after changing `VITE_*` values.

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
├── vite.config.js
├── firestore.rules           # who can access the data + field validation (publish in the Firebase console)
├── firebase.json             # lets the Firebase CLI deploy firestore.rules
└── src/
    ├── App.jsx               # app state, layout, wiring between map and panels
    ├── config.js             # city, currency, tile/routing/geocoding settings
    ├── firebase.js           # Firebase app, Auth and Firestore from VITE_FIREBASE_* values
    ├── components/           # AuthGate (access / verify-email screens), SignInPanel (email, password, Google), MapView, PropertyList/Details/Form,
    │                         # PointList/Details/Form, DistanceSection, FiltersPanel, CompareModal, PlaceSearch, …
    ├── hooks/
    │   ├── useAuth.js        # sign-in, registration, password reset, email verification, membership check
    │   ├── useCollection.js  # live list + CRUD for a Firestore collection
    │   └── useTravelMetrics.js # on-demand route distance/time and street paths (not stored)
    ├── services/
    │   ├── firestore.js      # Firestore subscribe / create / update / delete helpers
    │   ├── properties.js     # "properties" collection
    │   ├── points.js         # "points" collection
    │   ├── routing.js        # OSRM table (distance/time) and route (path) requests, cache, queue
    │   └── geocoding.js      # Nominatim search / reverse geocoding
    └── utils/
        ├── validation.js     # whitelists and validates rental / point fields before saving
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
| `firebase` | Google sign-in (Auth) and database (Firestore) |
| `lucide-react` | Icons (tree-shaken, only used icons are bundled) |

IDs are Firestore's auto-generated document IDs.

### External free services

| Service | Used for | Notes |
| --- | --- | --- |
| Firebase (Spark plan) | Sign-in and data storage | Free quota: 50k reads / 20k writes / 20k deletes per day and 1 GiB stored, far above what this app uses. |
| OpenStreetMap tiles | Map background | [Tile usage policy](https://operations.osmfoundation.org/policies/tiles/): light use with attribution. For heavier use, set `VITE_TILE_URL` to another provider. |
| FOSSGIS OSRM (`routing.openstreetmap.de`) | Walking and driving distance, time and street paths | Free, fair use. Requests are made only on demand, one at a time, and cached in memory. Distances and times for many destinations are batched with the OSRM *table* API. Paths use the *route* API, one request per selected point. |
| Nominatim | Place search and address suggestion | [Usage policy](https://operations.osmfoundation.org/policies/nominatim/): max 1 request/s, no search-as-you-type. The app throttles and caches requests and searches only on Enter. |

---

## Data

### Storage

Data lives in **Cloud Firestore** in two top-level collections, `properties` and `points`, plus `members`
(who is allowed in). Every member sees and edits the same data, and changes appear live on all open devices.

A rental document:

```json
{
  "title": "Bright flat near the station",
  "address": "Via Giuseppe Capruzzi 148, Carrassi",
  "latitude": 41.1165,
  "longitude": 16.87,
  "rent": 850,
  "floor": 3,
  "url": "https://example.com/listing",
  "notes": "Quiet street, close to public transport.",
  "pros": ["Close to the station", "Bright"],
  "cons": ["Small kitchen", "No elevator"],
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

A point document has `name`, `category`, `notes`, `latitude`, `longitude`, `createdAt`, `updatedAt`.
The document ID is the item's `id`. `createdAt` keeps lists in insertion order and is not shown in the app.

| Field | Rules |
| --- | --- |
| `latitude`, `longitude` | **Required.** Numbers within −90…90 / −180…180. |
| `title`, `address`, `notes`, `url` | Optional strings (`""` when empty). `url` must be `http(s)://`. |
| `rent` | Optional number ≥ 0, or `null`. |
| `floor` | Optional whole number from −10 to 300 (0 = ground floor, negative = basement), or `null`. |
| `pros`, `cons` | Optional lists of short strings (`[]` when empty), at most 100 each. |
| Point `name` | Required. `category` and `notes` are optional. |

Rentals and points are separate lists with no references between them.
**Distances are never stored**: they are calculated from coordinates whenever they are shown, so moving a point
immediately updates every distance.

### How the data is protected

- Only signed-in accounts with a verified email listed in `members` can read or write. Anyone can create an
  account, but it sees nothing until its email is added to `members`.
- Email/password accounts must open the verification link Firebase sends after registration. Without this, someone
  could register a member's address before the member does. Google accounts are already verified.
- The app validates every change before saving ([`src/utils/validation.js`](src/utils/validation.js)), and
  [`firestore.rules`](firestore.rules) enforces the same fields, types and limits on the server, so a malformed or
  unknown field is rejected even if it bypasses the app.
- A rejected or failed save shows an error and the app goes back to the last saved data.
- Records with invalid coordinates, for example from manual edits in the console, are kept. The app lists them with a warning, leaves them off the map and lets you fix them.

To back up your data, use *Firestore → Import/Export* (requires the paid Blaze plan) or copy documents from the console.

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
