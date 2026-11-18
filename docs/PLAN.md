# Premium Jeep Rentals: website plan

A React site for Premium Jeep Rentals (dwptllc.com) that books through Wheelbase.
This is revision 2 of Phase 1. Revision 1 had many separate effects; revision 2 is one
experience: **build your trip**.

## The idea

Every visitor arrives with the same three questions: which Jeep, what do I bring, where do I go.
The site answers them in that order, in one frame, and shows the consequence of each choice
on the Jeep itself. When the trip is built, it is one button from checkout.

```
┌──────────────────────────────────────────────┬──────────────────────────┐
│                                              │ 1 Jeep 2 Kit 3 Route 4 Pass  ← stepper, always visible
│                STAGE                         ├──────────────────────────┤
│   3D Jeep in a studio (steps 0, 1, 2, 4)     │   PANEL                  │
│   or the route map (step 3)                  │   the controls for       │
│                                              │   this step              │
│   shows what the panel just changed          ├──────────────────────────┤
│                                              │ Madaket, 4 days  $1,580  │ ← total + next, always visible
└──────────────────────────────────────────────┴──────────────────────────┘
```

On phones the stage sits on top, the panel below, and the stepper and total bar stick to the
screen edges.

## Interaction spec

### Rules that apply everywhere

- **One state.** Place, dates, Jeep, kit and stops live in one store (`src/lib/trip.tsx`). Every
  part of the page reads from it, so nothing can disagree. Price, availability and the route are
  derived from it, never stored.
- **Nothing moves unless the visitor did something**, with one exception: the Jeep turns slowly on
  the first screen until it is touched. Every other animation answers an action and shows what
  changed (paint sweeps, roof slides, kit drops on, the Jeep drives the new leg).
- **Customisation never offers a Jeep that doesn't exist.** Paint and roof narrow down real
  vehicles at the chosen place. Only kit and route are free choices.
- **Availability is visible where the choice is made**: booked days are shaded in the calendar,
  booked paints are struck through, and a booked Jeep offers the free ones instead.
- **Every step is optional except choosing a Jeep.** The stepper lets people jump anywhere;
  "Reserve" only needs dates and a free Jeep, and says what is missing if not.
- `prefers-reduced-motion`: no driving, sweeping or spinning. States change instantly.

### Step 0: Arrival (first screen)

- One full-width scene: sky, a strip of sea and sand, with the 3D Jeep parked on the right.
  The horizon is where the 3D camera says it is (`--horizon`), so the scene and the model always
  agree. The headline sits in the sky; the trip bar (pick-up place, dates, "Build your trip")
  lies on the sand.
- Opening any field of the trip bar turns the space above it into a planner card (the headline
  steps aside): 1 Where shows the chart of the four pick-up places as pins plus the same four
  as a list (Jeeps there, lowest day rate); picking one moves straight on to 2 When, the
  calendar. Picking the return day closes the card and nudges "Build your trip". On phones the
  card opens under the bar.
- The Jeep on the beach is the one waiting at the chosen place: change the place and it repaints;
  its name, where it waits and whether it is free on the chosen dates sit beside it.
- The Jeep turns slowly; dragging takes over and stops the turn for good.
- "Build your trip" does not leave the page: the side panel slides in, the headline slides out,
  the camera re-frames the same Jeep and the stepper drops in at the top of the stage.
- The header turns sky-coloured on this screen and gets its own "Build your trip" button once
  the builder scrolls out of view.

### Builder layout (steps 1 to 4)

- Stage on the left: floating stepper at the top, the Jeep's name and spec bottom left,
  camera views (Front, Side, Rear, Above) bottom right.
- Panel on the right: one title per step, then quiet sections with a label and a hairline.
  Running total and the next action are pinned at the bottom.
- Phones: the stage stays pinned under the header with the stepper below it, so paint and kit
  changes stay visible while the panel scrolls.

### Step 1: Your Jeep

- Pick-up place and dates stay editable at the top. The calendar shades the days the current
  Jeep is already out.
- Paint swatches show only paints at this place; a paint whose Jeeps are all booked on the
  chosen dates is struck through.
- Roof: power sky roof or hardtop. If the current paint doesn't come with that roof here,
  the option says which paints do, and choosing it switches paint.
- The resulting Jeep card: name, model, a line about it, day rate, and availability:
  "Add your dates", "Free for Nov 25 – Nov 29", or "Out on some of those days" with the
  free alternatives as one-tap chips.
- A compact list of every Jeep at this place, with its status, for people who'd rather pick from a list.
- Stage: new paint washes from nose to tail; a hardtop is colour-matched, a sky roof is black.

### Step 2: Kit it out

- A roof toggle: opens the panel over the front seats so people can see it.
- Extras as toggles with day prices. Surfboards and the kayak share the rack: choosing one swaps
  the other, and the card says so before you tap. The rack comes free with roof items.
- Stage: camera moves to a high rear three-quarter view; each item drops on, removed items lift off.

### Step 3: Route

- Stage: the Jeep drives off the edge of the studio and the chart fades in, framed on the
  pick-up island.
- Tap a pin or a chip to add a stop; tap again to remove. The planner routes over a real road and
  ferry network (Dijkstra by time), loops back to the pick-up, and the little Jeep drives the new
  leg while the line draws behind it. It turns into a ferry on crossings.
- Panel: the itinerary with miles and time per leg, tags for car ferries and sand permits, totals
  (miles, time behind the wheel, days needed), a warning if the plan doesn't fit the rental, and
  "Reorder to save N min" when a shorter order exists (brute force, up to 7 stops).
- Changing pick-up place clears stops on other islands and says so.
- "See the whole map" zooms out to everything; "Back to…" returns.

### Step 4: Trip pass

- Stage: the Jeep drives back in from behind, wearing everything chosen.
- Panel: a ticket with dates, place, Jeep, kit, route as passport stamps, and the price breakdown.
- Actions: Reserve (primary), copy a share link (`?trip=…` restores the whole trip), send the trip
  to the team (pre-fills the contact form).
- Reserve, Phase 1: a sheet that says online checkout is being connected and offers to send the
  trip. Phase 2: the same button opens the live Wheelbase store with the dates passed through.

### Below the builder

Places: the four pick-up points as crops of the route chart, with what is nearby, how many Jeeps are there and the lowest day rate. Choosing one starts the builder there.

Then deliberately quiet: how pickup works (3 steps), about the company, the contact form, footer.

## How it's built

| Area | Where | Notes |
|---|---|---|
| 3D Jeep | `src/stage/` | Dependency-free WebGL2: GLB loader, physically based shader with clear-coat paint, analytic studio lighting, baked floor shadow, orbit with inertia. Draws only when something changes. Falls back to the 2D illustration if WebGL2 or the model is unavailable. |
| Model | `public/models/jeep.glb` (2 MB) | Converted from the client's `3dModel/jeep-rubicon` by `tools/dae2glb.py`: centred, metric, parts named for animation (wheels, body, roof panel), textures packed and resized to 1024 px. |
| Accessories | `src/stage/accessories.ts` | Simple modelled shapes positioned on the Jeep. Replace with modelled assets later if wanted. |
| Route map | `src/components/RouteMap.tsx` | SVG chart; pins, labels and the marker are HTML laid over it so text stays crisp while the view glides. |
| Routing | `src/data/roads.ts`, `src/lib/route.ts` | Real coordinates, coarse waypoints with a winding factor; typical ferry times. |
| State | `src/lib/trip.tsx` | Reducer, derived values, share-link encoding. |

**Why not three.js:** the session building this couldn't install packages, and the job is narrow
(one model, one studio). The renderer sits behind one class (`JeepRenderer`) with a seven-method
API; moving to three.js later means reimplementing that class only.

**Other 3D models in the folder:** `DAE/Suv_4x4.dae` is a generic SUV and `Military-Jeep.fbx`
(229 MB) is far too heavy and the wrong vehicle; neither is used.

## Placeholders to replace

- **Fleet** (`src/data/fleet.ts`): 14 invented Jeeps with names, paints, roofs, rates and bookings,
  spread so each place has real choices. Real data comes from Wheelbase in Phase 2.
- **Extras** (`src/data/extras.ts`): the client confirmed they rent extras; the list and prices are mine.
- **Spot notes, permit wording, handover steps**: drafts for the client to confirm.
- **The 3D model is the 2-door Wrangler.** If the fleet is 4-door, we need a 4-door model.
- The contact form validates but doesn't send.

## Phases

**1. UI (this revision).** Done, pending client review.

**1.5. Client review and real inputs (about 1 week).** Fleet list (paints, roofs, where each lives,
rates), extras and prices, 2-door or 4-door, handover process, sand-permit policy, contact details,
and whether Turo stays as a booking route.

**2. Wheelbase (about 2 weeks).**
1. Dealer ID and a test listing; set `VITE_WHEELBASE_DEALER_ID` and check Reserve opens the live store.
2. Map each fleet entry to its Wheelbase listing ID; open `<listing-details rental-id>` for the
   chosen Jeep instead of the whole store.
3. **Open question for Wheelbase:** is listing and availability data available through an API? If
   yes, `fleet.ts` and availability are fed live and the builder stays as designed. If not, the
   builder becomes a planner that hands off to the widget, which then owns availability.
4. Map extras to Wheelbase add-ons so kit chosen in the builder carries into checkout.
5. End-to-end tests on phone and desktop: build, reserve, pay, confirmation, cancellation.

**3. Content, SEO, plumbing (1–2 weeks).** Form delivery, self-hosted fonts, a page per pick-up
place, structured data, analytics through the widget, accessibility audit, performance budget
(the 2 MB model loads after first paint; consider Draco compression).

**4. Launch (a few days).** Firebase Hosting staging, sign-off, domain cutover, redirects from
the old Squarespace URLs.

## Questions for the client

- Is "Premium Jeep Rentals" the long-term name, given it uses another company's trademark?
- 2-door or 4-door Wranglers, or both?
- Which extras do you rent, at what prices?
- Can renters take the Jeep on a car ferry, and onto sand? Who arranges permits?
- How does handover work in each place?
