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
| `CRON_SECRET` | 16+ random characters. Protects `/api/cron/daily-report`; Vercel sends it automatically |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Cloud API credentials (section 8). Leave empty = site works, nothing is sent |
| `WHATSAPP_TEMPLATE_PATIENT_CONFIRMATION`, `WHATSAPP_TEMPLATE_DOCTOR_DAILY`, `WHATSAPP_TEMPLATE_DOCTOR_LATE` | names of the approved templates |
| `DOCTOR_WHATSAPP_NUMBER` | optional; defaults to the doctor phone in Admin → Settings |
| `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_LANG` | optional (defaults `v21.0`, `en`) |

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

* **Bookings are confirmed automatically.** The slot is held immediately; nobody needs to approve it. Appointments made before this change and still *Pending* stay Pending until you act on them (they appear under **Overview → Needs your review**).
* Open any appointment to see its details, the **WhatsApp confirmation** status (Sent / Failed / Not sent) and a **Resend** button when a send failed. **Reschedule**, **Cancel appointment**, **Complete** and **Delete** work as before. **WhatsApp patient** opens a normal chat for manual messages.
* Confirming an old *Pending* request from the dashboard also sends the patient the WhatsApp confirmation (once only).
* **Availability**: working hours, appointment length, holidays, individual slots, and a master switch to pause online booking.
* Clinic info edited under **Settings** appears on the public site within ~5 minutes.

## 7. Tests

`npm test` runs every suite (slot/date/timezone logic, error handling, message builders, WhatsApp client, notifier de-duplication, daily-report scheduling). The notifier suites use an in-memory fake database, so **no real database, WhatsApp account or network is needed**. They do not replace a live test (section 10).

## 8. WhatsApp setup (official Meta WhatsApp Cloud API)

The site sends messages through Meta's official **WhatsApp Business Platform (Cloud API)**. No WhatsApp Web automation is used. Nothing is sent until you complete these steps; until then bookings work normally and the admin panel shows "Not sent".

1. Create a Meta Business account and a **WhatsApp Business Account** at business.facebook.com / developers.facebook.com (create an app → add the *WhatsApp* product).
2. Add and verify the clinic's sending number (a number that is **not** already registered in the regular WhatsApp app). Copy its **Phone number ID**.
3. Business Settings → System users → create a system user → **Generate token** with `whatsapp_business_messaging` → this is `WHATSAPP_ACCESS_TOKEN` (permanent; never put it in the browser or in git).
4. Create the three **message templates** below (WhatsApp Manager → Message templates). Category **Utility**, language **English** (`en`). Wait for approval (usually minutes to a day).
5. Put the credentials and exact template names in the Vercel environment variables, redeploy.

Meta only allows a business to start a chat with an approved **template**; a plain text message is delivered only inside a 24-hour window after the person messaged you. If a template name variable is left empty, the app falls back to plain text, which will usually **fail** for patients – so do configure the templates.

**Template 1 – `appointment_confirmed`** (to the patient; 7 variables)
```
Hello {{1}},

Your appointment at One Smile Dental Studio has been successfully CONFIRMED!

Appointment ID: {{2}}
Date: {{3}}
Time: {{4}}
Service: {{5}}

Address: {{6}}

For assistance, contact us at {{7}}.

Thank you for choosing One Smile Dental Studio!
```
Sample values: Ayesha Khan / OSD-261123-K7QX2 / Monday, 23 November 2026 / 5:00 PM / General Dentistry / 4 C, D.H.A. Phase 7, Sehar Commercial Area, Karachi. / 0332-3259577

**Template 2 – `doctor_daily_schedule`** (to the doctor at 4 PM; 3 variables)
```
Good Afternoon Doctor Ayesha!

Here is your One Smile Dental Studio appointment schedule for today.

Date: {{1}}
Total Confirmed Appointments: {{2}}

{{3}}

Have a wonderful day!
One Smile Dental Studio
```
`{{3}}` is the whole list on one line (WhatsApp forbids line breaks inside variables), e.g. `1) Name, 05:00 PM, 0300…, General Dentistry, ID OSD-… | 2) …`. With no appointments it is "No confirmed appointments are scheduled for today." and the total is 0.

**Template 3 – `doctor_new_booking`** (booking for today made after the 4 PM summary; 6 variables)
```
Update for Doctor Ayesha: a new appointment was just confirmed for today, after the daily schedule was sent.

Patient: {{1}}
Time: {{2}}
Phone: {{3}}
Service: {{4}}
ID: {{5}}
Total confirmed appointments today: {{6}}
```

Patients are messaged on the number they typed (03xx numbers are converted to 92 3xx…). Once WhatsApp is configured, the booking form tells patients their confirmation will arrive on WhatsApp. Make sure this matches your WhatsApp opt-in obligations.

## 9. Daily 4:00 PM summary (scheduler)

`vercel.json` calls `GET /api/cron/daily-report` at **11:00 UTC = 4:00 PM Pakistan time** (Pakistan currently has no daylight saving) and again at 12:00 UTC as an automatic retry. The endpoint:
* requires `Authorization: Bearer <CRON_SECRET>` (Vercel adds it when `CRON_SECRET` is set) – otherwise 401, and it refuses to run at all if the secret is missing;
* never sends before 4:00 PM Karachi time, and sends **at most once per Karachi date** (the database enforces this, so duplicate or retried runs are harmless; a failed send is retried by the next run, up to 5 attempts);
* lists every CONFIRMED appointment for that date, even if booked days earlier; cancelled/rejected are excluded; empty days get a short "no appointments" message;
* if someone books for **today** after the summary went out, the doctor gets an extra "new booking" message (template 3).

**Important – exact timing depends on your Vercel plan.** On the free **Hobby** plan Vercel guarantees cron timing only within the scheduled *hour* (the 11:00 job may run any time between 11:00 and 11:59 UTC, i.e. 4:00–4:59 PM). Exactly 4:00 PM needs **Vercel Pro** (per-minute precision) or an external scheduler such as cron-job.org calling `https://YOUR-DOMAIN/api/cron/daily-report` with the header `Authorization: Bearer <CRON_SECRET>` at 16:00 Asia/Karachi (the endpoint is safe to call from both).

Manual test (after deploy), from any terminal:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-DOMAIN/api/cron/daily-report
```
Before 4 PM Karachi time it answers `too-early`; afterwards it sends (once) and answers `sent`/`already-sent`.

## 10. Go-live test of WhatsApp (required)

Automated tests prove the logic, not delivery. Before relying on it: (1) place a real booking with your own phone number and confirm the WhatsApp arrives once; (2) after 4 PM call the cron URL above and confirm the doctor receives the list; (3) check the appointment's **WhatsApp confirmation** status in the admin panel. If a message fails, the admin panel shows the reason; Meta's error codes (e.g. template not approved, wrong phone-number ID) are in Vercel → Logs.
