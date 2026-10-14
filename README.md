# Pox-Boy 3026 v0.309 — today's NUKA PLANNER reminder test day

**Prepared release, not a live deployment.** The ZIP includes only `pwa/`. It does not need Firebase Cloud Functions, the Firebase CLI, billing, or a server deployment. Client-side announcements remain best-effort: at least one copy of the app must be running and online during the 15-minute window before an event begins.

## Publish in order

1. Back up your Firebase Realtime Database and current rules. In the Firebase Console, select the app's **pox-satellite Realtime Database → Rules** and publish this ZIP's `pwa/firebase-rules.json` **in full**, as you have done with earlier releases. v0.308 rules do **not** permit today's test-day events or their event WIRE claims, so changing only GitHub is insufficient. Do not paste these into Firestore or a different project.
2. Upload the **contents of `pwa/` directly to your GitHub Pages web root**, not the enclosing folder. Preserve any host assets not included in this ZIP, such as audio and favicons. Reload open/installed apps until their visible version is **v0.309**; the cache changes to `pipboy-cache-v291`.
3. The single scrolling board now starts with **TEST DAY · WED 14/10/2226**, mapped to the real **Wednesday 14 October 2026 in Australia/Perth**. It has 12 hourly start times, 06:00 through 17:00; the last slot is 17:00–18:00. Thu 22/Fri 23/Sat 24 keep their fourteen 10:00–24:00 slots. No Sunday data is deleted; off-grid/previous-format events remain viewable in the archive.

## Actual live rehearsal today (Perth time)

1. Check the current Perth clock. Pick a **test-day slot whose start time is more than 16 minutes away**; ideally leave 30–45 minutes for upload and propagation. Example: if it's 10:00, select 11:00–12:00 (due at 10:45), not 10:00–11:00 (due at 09:45). There is no retrospective send after the slot begins. Events added or edited after their 15-minute due time do not transmit.
2. On an Overseer device, add two disposable events in **the SAME future test-day slot**, named unmistakably `TEST ONLY A` and `TEST ONLY B`; set **BROADCAST YES** on each. Optionally add a `TEST NO` event with BROADCAST NO as a negative control. Save all events **before** the 15-minute mark. Any player will be able to see the test events and WIRE messages on the public board/feed; coordinate accordingly.
3. Keep **two v0.309 devices open and online**, ideally in the foreground, across the 15-minute mark. The scheduler runs on *every* running client (not just the Overseer device). It checks about every 20 seconds, but browser throttling and network delay may cause a late message. The WIRE should show **two distinct independently dismissible rows**, one for each YES event; the NO event must not produce a row. With more than one device, Firebase transactions create **one feed entry per event ID** rather than two duplicates. `announcements/latest` will hold only one for compatibility; verify the stack/new `announcements/feed` to see both.
4. Reload or reconnect another v0.309 device **before 12 hours pass**; both announcements should remain in its stack (initial sync does not sound a fresh ping). Check Firebase Realtime Database data under `announcements/feed` for two keys starting `planner_2026-10-14_`. If only one app is running, or all apps close/offline during the window, there is no delivery guarantee. A closed PWA never receives a phone push.
5. After the rehearsal, explicitly delete the disposable test events from the board if desired. Already transmitted WIRE entries remain for up to 12 hours unless individually dismissed; deleting an event does not retract them. The test-day board remains in v0.309 until a later release changes it; nothing is auto-purged.

The client scheduler uses Perth's real 2026 date and Firebase server clock offset; changing a phone clock is **not** a valid shortcut. The optional Broadcast setting is UI-gated but database writes remain public as in earlier releases: this is not server-authorized Overseer access. Avoid treating broadcast as a security boundary.

## Offline test results / repeatable checks

`node pwa/tests/planner-regression.js` · `node pwa/tests/planner-client-reminders.js` · `node pwa/tests/wire-regression.js` · `node pwa/tests/quest-regression.js` · `node pwa/tests/mail-photo-regression.js`. These exercise timing and two-device transactions with mocks; the steps above are still necessary to confirm your actual rules, hosting and live connections. Prior optional irreversible quest cleanup was not run.
