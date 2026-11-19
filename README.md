# One Smile Dental Studio – Website & Booking System

Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL + Prisma · bcrypt + signed-cookie sessions (jose) · Zod validation

```
src/
  app/
    (site)/            public pages: Home, About, Services, Contact, Book
    admin/login        admin sign-in
    admin/change-password
    admin/(panel)/     dashboard: overview, appointments, calendar, availability, patients, settings
    api/               public booking API + protected /api/admin/*
  components/          site + admin UI
  lib/                 schedule.ts (pure slot logic), availability.ts, auth.ts, validation.ts …
prisma/schema.prisma   database schema     prisma/seed.ts   optional seed
tests/schedule.test.ts logic tests (npm test, no database needed)
public/images/         logo + clinic photographs
```

## 1. Run locally

```bash
npm install
cp .env.example .env        # then edit the values (see below)
npx prisma migrate dev --name init     # creates the tables (needs DATABASE_URL)
npm run dev                 # http://localhost:3000
```

`.env` values

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | live domain (canonical URLs, sitemap, Open Graph). `http://localhost:3000` locally |
| `ADMIN_USERNAME` | `onesmiledental` |
| `ADMIN_INITIAL_PASSWORD` | the initial password supplied by the clinic. Used once, hashed with bcrypt, and the admin **must** change it at first login |
| `SESSION_SECRET` | 32+ random characters – `openssl rand -base64 48` |
| `IP_HASH_SALT` | any random string (rate-limiting hashes) |

Do **not** commit `.env` (it is in `.gitignore`).

## 2. Database setup

Any PostgreSQL works – Neon, Supabase, Vercel Postgres, Railway, a VPS.

1. Create a database and put its connection string in `DATABASE_URL`.
2. **Nothing else is needed on Vercel:** every build runs `scripts/db-setup.mjs`, which
   applies `prisma/migrations` (creates all tables) and seeds the default settings, Mon–Sat 5–9 PM hours and the first admin. It is idempotent and never overwrites an existing admin or any appointment.
   The build **fails loudly** if `DATABASE_URL` is missing, instead of deploying a site with no database.
3. Manual run (e.g. locally): `npm run db:setup`.
4. If the database was previously created with `prisma db push` and `migrate deploy` complains the schema is not empty, run once:
   `npx prisma migrate resolve --applied 20261119000000_init`

Double-booking is prevented **by the database**: `Appointment.slotKey` is UNIQUE (`2026-11-23T17:00`), filled while a request is Pending/Confirmed/Completed and cleared when rejected/cancelled.

### Checking a deployment
Open `https://YOUR-DOMAIN/api/health` – it returns yes/no flags only (database reachable, tables exist, SESSION_SECRET set, admin env set). Real error causes are written to **Vercel → Logs** with tags like `[api/availability] DB_NOT_READY`.

## 3. Admin login

* URL: `/admin/login`
* Username: `onesmiledental`
* Initial password: the value of `ADMIN_INITIAL_PASSWORD`
* On first login the system forces a new password (min 10 chars, upper + lower + number + symbol). Changing it signs out every other device.
* The admin account is created automatically on the first login attempt if none exists.

## 4. Deploy on Vercel

1. Push the project to GitHub and import it in Vercel.
2. Add the five environment variables above (Project → Settings → Environment Variables). Use your real domain for `NEXT_PUBLIC_SITE_URL`.
3. Run `npx prisma migrate deploy` once against the production database.
4. Deploy. Build command is already `prisma generate && next build`.
5. Add your domain, then check `/sitemap.xml` and `/robots.txt`.

## 5. Before going live (checklist)

- [ ] Confirm the Google Maps pin is the clinic (see report – the supplied embed names a different listing).
- [ ] Confirm patient consent for the photographs that show patients (children).
- [ ] Review the descriptive copy on About / Services with Doctor Ayesha.
- [ ] Add genuine testimonials (if any) in `src/content/testimonials.ts` – the section stays hidden while empty.
- [ ] Log in, change the password, then place a test booking and confirm it from the dashboard.
- [ ] Set `NEXT_PUBLIC_SITE_URL`, submit the sitemap in Google Search Console and claim the Google Business Profile.

## 6. Day-to-day use

* New requests appear under **Overview → Needs your review** (auto-refreshes every 30 s).
* Open a request → **Confirm / Reject / Reschedule / Complete / Delete**. **WhatsApp patient** opens a ready-made message to the patient, because the site does not send SMS or email automatically.
* **Availability**: working hours, appointment length, holidays, individual slots, and a master switch to pause online booking.
* Clinic info edited under **Settings** appears on the public site within ~5 minutes.

## 7. Tests

`npm test` runs 20 tests of the slot, weekday, Sunday, past-date, timezone and phone logic – no database required.
