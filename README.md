# Pox-Boy 3026 v0.310 — Overseer map marker repair

**Prepared release, not a live deployment.** The ZIP contains only `pwa/`. Upload the **contents of `pwa/`** to the GitHub Pages site root as usual. Reload installed devices until they show **v0.310**; the service-worker cache changes to `pipboy-cache-v292`.

**Firebase rules update: NO compared with v0.309.** The `pwa/firebase-rules.json` file is unchanged. **If you have not yet published the v0.309 rules**, publish the included rules in **Realtime Database → Rules** before uploading the new site: those rules are still required for Wednesday's test day and client-side WIRE reminders. No Firebase Functions deployment is needed.

## Map changes

- Overseer **+ MARKER** still saves a local marker then asks **SHARE WITH EVERYONE?**; it does not broadcast without confirmation. Saving now requires an entered marker name (up to 32 characters). Missing name/coordinates leave the editor open with a clear error; they no longer create `UNKNOWN LOCATION` markers.
- Saving and deleting local waypoints redraws the map immediately even when the map has been moved into the Overseer display instead of the MAP tab. The Overseer can see their own shared/broadcast pins; non-Overseer units still suppress duplicate self-echo pins.
- The Overseer display has **- LOCAL** (removes from this device only) and **- SHARED** (lists live sharedpins and, after confirmation, removes the selected broadcast from everyone's map). These are separate on purpose. Shared Firebase pins are **never automatically deleted**.
- Existing local waypoint records whose name is exactly `UNKNOWN LOCATION` are removed from that device's local waypoint storage on first launch. Named waypoints are preserved, and this does not affect other devices' local waypoints or shared Firebase pins. If another device has its own `UNKNOWN LOCATION` record, update/reload that device too.

## Check on real devices

1. On an Overseer device, open OVERSEER DISPLAY. Tap **+ MARKER** and immediately SAVE without a name: it must refuse and create nothing.
2. Enter `RADIO` and SAVE: it should appear immediately on that device, without waiting for a tab switch. Choose **KEEP PRIVATE** and confirm no one else sees it. Repeat with a different name, choose **SHARE WITH EVERYONE**, and verify another unit sees the shared pin.
3. Tap **- LOCAL** to remove a private/local-only marker. Tap **- SHARED**, choose the named broadcast and confirm removal; it should vanish from all connected units. Removing a local marker alone does **not** remove an earlier Firebase broadcast. The picker also permits explicit cleanup of older dev broadcasts.
4. Verify an older local `UNKNOWN LOCATION` placeholder is gone on the updated sender device, while the named `RADIO` broadcast or any other shared pin is unaffected. Any map tile loading delay from your network is distinct from the immediate local marker redraw.

Offline regression tests: `node pwa/tests/map-marker-regression.js`, `node pwa/tests/planner-regression.js`, `node pwa/tests/planner-client-reminders.js`, `node pwa/tests/wire-regression.js`, `node pwa/tests/quest-regression.js`, and `node pwa/tests/mail-photo-regression.js`. Offline mocks are not a substitute for your production multi-device check. No live GitHub/Firebase publication or Firebase data deletion was performed here.
