# SURent — Secure University Rent

A student housing management system for Nigerian university students, built
around trust and accountability rather than pure listing discovery.

Final year project — Oviawe Martins Osayuki (PSC2208006), Department of
Computer Science, University of Benin.

## Tech Stack

- **Frontend:** React (JSX), Tailwind CSS, Vite, Lucide React icons
- **Backend:** Supabase (PostgreSQL, Auth, Storage) — no separate server
- **Hosting:** Netlify

## Getting Started

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/setup.sql` in full. It creates all
   six tables, row-level security policies, storage buckets, and indexes —
   and is safe to re-run if you need to patch an existing project.
3. Go to **Authentication > Providers > Email** and turn **off** "Confirm
   email" (so students/landlords can log in immediately after signup).
4. Go to **Authentication > URL Configuration** and set your Site URL and
   Redirect URLs to your Netlify domain once deployed.
5. Copy your **Project URL** and **anon public key** from
   **Settings > API**.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 4. Build and deploy to Netlify

```bash
npm run build
```

Drag the generated `dist/` folder to [netlify.com/drop](https://netlify.com/drop),
or connect the repo in the Netlify dashboard. Either way, set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under
**Site Configuration > Environment Variables**, then trigger a redeploy.

### 5. Make yourself an admin

Sign up normally through the app, then in Supabase **Table Editor >
profiles**, find your row and change `role` to `admin`. Log out and back in.

## What's Implemented

- 2-step signup (personal details → guarantor details) for students and
  landlords, with a compulsory guarantor for landlords
- **Fixed image-upload bug:** the profile row is created first with null
  image fields, then avatar/ID/guarantor-ID images are uploaded and patched
  onto the profile afterward — this was the root cause of the original
  "Invalid path specified in request URL" failure
- Verified-landlord badge workflow (landlord uploads ID → admin verifies)
- Student dashboard: search, filters (location, max price, verified-only),
  unread message badges, browser notifications, landlord ID image and
  reviews shown on both the property card and the detail modal
- Landlord dashboard: listing CRUD, visibility toggle, mark-rooms-taken,
  reviews tab, unread badges, browser notifications
- Chat modal with three tabs: **Chat** (3s polling, no profile join — see
  bug fix notes below), **Visits** (request/approve/reject/complete +
  review prompt), **Track Stage** (6-stage mutual negotiation tracker)
- Guarantor details are cross-visible inside chat — each party can see the
  other's guarantor name, phone, and ID image
- Property visibility auto-hides at Price Agreed / Deposit Paid / Moved In,
  and re-lists automatically once both parties confirm Vacated
- Admin dashboard: stats, verify/unverify landlords, delete users, toggle
  property visibility, delete listings/reviews, and full detail views for
  any user, property, or review

## Known Limitation

The **Stage 5 read-only guarantor link** (a unique link auto-emailed to both
guarantors when Viewing Scheduled is mutually confirmed, showing chat
history, negotiation progress, and profiles in read-only form) is **not yet
built**. It requires Gmail SMTP configuration in Supabase (Authentication >
Email Templates / a Supabase Edge Function with a mail provider) plus a new
public read-only route. This is the next feature to build — see the
"Instructions for continuing" section below.

## Continuing Development

To pick this up in a new Claude session, share this repo along with:

> I'm continuing the SURent project (React/Tailwind/Vite/Supabase, deployed
> on Netlify). The database schema and RLS policies are in
> `supabase/setup.sql`. Everything in the README's "What's Implemented"
> list is working. Please build the Stage 5 read-only guarantor link next:
> a public route that takes a token, loads chat history + negotiation
> tracker + both profiles read-only, and is emailed to both guarantors
> automatically when both parties confirm Viewing Scheduled.

## Design Tokens

| Token | Value |
|---|---|
| Primary | `#1a3c5e` |
| Accent | `#f57c00` |
| Background | `#f5f5f5` |
| Text | `#333333` |

## Project Structure

```
src/
  components/     Landing, dashboards, modals
  contexts/       AuthContext (session, profile, signup w/ fixed upload flow)
  lib/            supabase.js (client + storage helpers), constants.js
supabase/
  setup.sql       Full database + RLS + storage setup
```
