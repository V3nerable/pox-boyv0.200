# Pox-Boy 3026 v0.315 — Overseer marker entry and planner cleanup

**Prepared package, NOT deployed.** No live GitHub upload, Firebase rules publication, database deletion, or production-device test was performed here. The ZIP contains `pwa/` only; upload its **contents** to the GitHub Pages repository root, not the enclosing folder.

## Publish order — Firebase rules update: YES

1. Publish the full contents of **`pwa/firebase-rules.json`** in **Firebase Console → Realtime Database → Rules**. Compared with v0.314, it removes the retired 14 October test day from permitted planner-event writes and scheduled WIRE reminder claims; festival dates 22–24 October and their 10:00–24:00 hourly slots remain allowed. It also includes the required optional `wastelanders.scrambled` and `sharedpins.photoThumb` validations from earlier releases. **Publish rules before uploading the updated website files.** The app retains the existing UI-only Overseer gate; these rules are not developer authentication.
2. Upload the **contents of `pwa/` flat** to the GitHub Pages repository **root**. Preserve existing live media/favicons not included in the ZIP. Reload installed units until they show **v0.315** (`pipboy-cache-v297`). No Firebase Functions deployment or Web Push is required.
3. On a real device, verify the Overseer marker and photo flow and a second device's shared map. This package has only local simulated-browser/offline tests, not a production verification.

## Changes

- **OVERSEER DISPLAY → + MARKER** now opens a **direct editor in the Overseer map panel**, avoiding the nested marker modal that had been unreliable on the user's device. On narrow phones, the map/editor stacks above the scrollable roster instead of letting the roster overlap the SAVE control. Enter a name using the **device keyboard** and tap its visible **SAVE MARKER** button. Validation/storage errors appear next to that button. The selected position is locked to the map center when the editor opens. Photo choice remains optional and limited to the in-app photobank; the preview returns to the direct editor. After a successful **local** save, the separate **SHARE WITH EVERYONE?** confirmation remains. The Overseer panel shows local/shared/error status. The normal MAP-tab marker modal is unchanged.
- **NUKA PLANNER** now shows only **Thu 22, Fri 23 and Sat 24 October 2026** (displayed in-world as 2226), 14 one-hour slots per day from 10:00–24:00 AWST. The Wednesday 14 October test day and **PREVIOUS-FORMAT EVENTS** button are gone. Client-side reminders no longer send for Wednesday. Existing Wednesday and previous-format Firebase records are **not deleted**; they simply no longer appear on the board or through that button. The planner still has no Firebase Functions dependency.
- **OVERSEER DISPLAY** no longer has the **BACK UP & REMOVE DEMO PLAYERS** button or its cleanup action. This change does **not** delete demo-player records; they remain hidden from genuine-player views. No production data was deleted here.
- Existing v0.314 cold-user restoration, 48×48 photo markers, and five-minute Chronicle/Overseer defaults remain.

## Verification and limitations

- Offline Node regression suites: `node pwa/tests/*.js` (run each file). `pwa/tests/overseer-marker-browser-smoke.js` is optional and skips if Playwright/Chromium is unavailable.
- The direct Overseer editor was clicked through locally in Chromium at **desktop, phone portrait and phone landscape** sizes: blank-name error appeared beside SAVE, a valid name saved to local waypoint storage, and the separate share prompt appeared. A further local check used an actual Leaflet map moved into Overseer display. These were **local simulations**, not a test on the user's installed app, hosting, or Firebase.
- If a deployed app still displays the old popup rather than a direct editor, its HTML or JavaScript is stale. Confirm v0.315, refresh/relaunch the installed app, and check that both `index.html` and `app.js` in the site root were uploaded. A visible version label alone does not prove `app.js` updated. If the direct editor appears but saving fails, use the exact inline error text when reporting it.
