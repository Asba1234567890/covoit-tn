# Covoit TN — MVP scaffold

## What this is
This is milestone 1 of the build: architecture + database schema + the first
vertical slice (Sign up → Profile → Search → Ride details → Booking). It's a
real, runnable Next.js/TypeScript/Prisma codebase, not pseudocode — but a
production carpooling platform is a multi-week engineering effort, so this is
a solid foundation to keep building on together across sessions rather than
a finished product.

## Stack decisions (per spec §34, with rationale)
- **Next.js 14 + TypeScript** — single codebase for frontend + API routes, matches spec's default recommendation.
- **PostgreSQL + Prisma** — relational fits the domain (rides, bookings, geospatial queries); Prisma gives type-safe queries and migrations.
- **Tailwind + shadcn/ui pattern** — fast to build a clean mobile-first UI without fighting CSS.
- **Map provider: Google Maps Platform** (`lib/map/GoogleMapProvider.ts`) — Geocoding, Directions, and Places APIs server-side, Maps JavaScript API for the client-side route preview (`components/RouteMap.tsx`). It sits entirely behind `MapProvider` (`lib/map/MapProvider.ts`), so swapping vendors again later means writing one new class, not touching matching/search/booking logic. Needs `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (see `.env.example`) and billing enabled on the associated Google Cloud project.
- **Payment provider: cash only for MVP** — behind `PaymentProvider` (`lib/payment/PaymentProvider.ts`). Booking status and payment status are separate models by design (spec §15), so adding Flouci/Stripe/etc. later doesn't change the booking state machine.
- **Auth: phone + OTP, no password** — `server/auth/otp.ts`. The in-memory OTP store is dev-only; production needs Redis or a DB-backed table (noted in the file).

## What's implemented
- Full Prisma schema (`prisma/schema.prisma`) covering all entities from spec §31, with Country/Currency/City/PlatformSetting as configuration — nothing Tunisia-specific is hardcoded into business logic (spec §32).
- Seed data for the 12 Tunisian launch cities + default platform settings (`config/countries.ts`, `prisma/seed.ts`).
- Matching engine (`lib/matching/matchingEngine.ts`) that scores route overlap, pickup/drop-off proximity, time compatibility, and detour — not exact-match-only search (spec §10).
- Pricing engine (`lib/pricing/pricingEngine.ts`) reading commission % from `PlatformSetting`, not hardcoded (spec §16).
- Booking service (`server/bookings/bookingService.ts`) using a row-locked transaction so two passengers can't both book the last seat (spec §50's required test case).
- First vertical slice: signup page + OTP API route, search page + search API (using the matching engine), ride details page, booking API route.

## What's next (in order, matching spec §53)
1. ~~Wire up real seat/vehicle creation flow for drivers ("Offer a ride").~~ Done (milestone 2, see below).
2. Messaging (Conversation/Message models exist; needs UI + API routes).
3. Reviews UI + moderation queue.
4. Admin dashboard (users, rides, bookings, reports — role-based per spec §58).
5. Notifications abstraction (push/in-app first).
6. i18n (ar-TN/fr-TN/en + RTL) — `next-intl` is in package.json but translation keys aren't wired up yet.

## Milestone 2 — Offer a ride (driver flow)
- `server/vehicles/vehicleService.ts` — registering a vehicle auto-creates a `DriverProfile` for the user, so one account can be both passenger and driver (spec §4) without a separate signup.
- `server/rides/rideService.ts` — `createOneTimeRide` computes route/ETA once at creation (not per search request, per spec §52). `createRecurringRide` creates a `RecurringRide` template and materializes real `Ride` rows for the next 4 weeks matching the chosen days — never one giant recurring record (spec §23). `generateInstances` is exported separately so a weekly cron job can keep the rolling window topped up (not wired to a scheduler yet).
- `app/api/vehicles/route.ts`, `app/api/rides/create/route.ts` — API routes; ride creation verifies the vehicle actually belongs to the requesting driver server-side (spec §51, never trust client checks).
- `app/offer-ride/page.tsx` — UI with a one-time/recurring toggle, day picker for recurring rides, and the instant-vs-approval booking mode switch from spec §14.

### Known gap in this milestone
The origin/destination lat/lng in the offer-ride form are placeholders (0,0) — they need a real `LocationPicker` component wired to `MapProvider.geocode()` so drivers pick an actual point on a map instead of typing raw city IDs. That's the natural next small piece before or alongside messaging.

## Running locally (once you have Node + Postgres available)
```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Known gaps / honesty notes
- No tests written yet (spec §50 lists required cases — double-booking, cancellation, recurring rides, permissions — these should be the next thing added).
- No real SMS provider wired in; OTP prints to console in dev.
- Admin dashboard, live trip tracking, SOS, and trip sharing are modeled in the schema but have no UI/API yet.
- Legal/ToS content is explicitly out of scope for me to draft with authority — spec §40 is right that Tunisian counsel needs to review before public launch.
