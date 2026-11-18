# Premium Jeep Rentals

Phase 1 UI for the new Premium Jeep Rentals site: React 19, TypeScript, Vite, plain CSS,
and a small built-in WebGL2 renderer for the 3D Jeep. No runtime dependencies beyond React.

The plan and the interaction spec are in [`docs/PLAN.md`](docs/PLAN.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
```

To look without installing anything, open `preview/index.html`: a single-file build with the
model embedded.

## Turn on live booking

Copy `.env.example` to `.env.local` and set `VITE_WHEELBASE_DEALER_ID`. "Reserve" then opens the
live Wheelbase store, themed from `src/config/site.ts`, instead of the Phase 1 request sheet.

## Where things are

```
src/
  components/Hero.tsx      first screen: headline, trip bar, the Where/When planner, the beach scene
  components/PlaceMap.tsx  the chart of the four pick-up places used by the planner
  components/Builder.tsx   the trip builder frame: stepper, stage, panel, total bar, checkout
  components/Places.tsx    the Places section below the builder
  components/steps/        one file per step
  components/JeepStage.tsx React wrapper for the 3D Jeep (2D fallback in Jeep.tsx)
  components/RouteMap.tsx  the route chart
  stage/                   WebGL2 renderer, shaders, GLB loader, accessories
  lib/trip.tsx             all trip state, derived prices/availability/route, share links
  lib/route.ts             routing over the road and ferry network
  data/                    PLACEHOLDER fleet and extras; real places, roads, coastline
public/models/jeep.glb     the Jeep, converted from 3dModel/jeep-rubicon
tools/dae2glb.py           the converter (python3, numpy, Pillow)
```

## Re-converting the model

```bash
python3 tools/dae2glb.py path/to/model.dae path/to/textures public/models/jeep.glb
```

The script expects the jeep-rubicon part names; another model needs its part mapping updated
in `group_of()`.
