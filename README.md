# Pox-Boy 3026 v0.318 — Overseer RAD menu and SNAP NOW photo send

**Prepared, NOT deployed.** No live GitHub upload or Firebase publication was performed here. ZIP contains `pwa/` only. No user records were deleted.

## Publish order — Firebase rules update: NO

`pwa/firebase-rules.json` is **unchanged from v0.317**. If the v0.317 Realtime Database rules (for permanent quest XP and shared RAD settings) are not already published, publish the **complete `pwa/firebase-rules.json`** in Firebase Console → Realtime Database → Rules **before** uploading these files. Otherwise no new rules update is needed. Then upload the **contents** of `pwa/` to the GitHub Pages repository root, preserving existing media not bundled in the ZIP. Confirm installed units show v0.318 (`pipboy-cache-v300`). No Firebase Functions or Web Push required.

## Changes

- **RAD CLIMATE** is now under **STAT → OVERSEER**, not in the full-screen **OVERSEER DISPLAY**. The same daily RAD rates and global storm START/STOP controls remain; no storm is automatically started by this package. The panel is hidden immediately when Overseer mode is disabled. This is the existing UI-only gate, not secure Firebase authorization.
- **WASTELANDERS MET → contact → SEND PHOTO → SNAP NOW** now works even if the databank is empty. It hides the contact sheet and photo picker, opens the CAM tab and powers on the sensor. After a successful capture, the photo is archived and the existing **TRANSMIT THIS PHOTO TO [contact]?** confirmation opens for the same recipient. It never auto-sends; the two-way-link check still applies. BACK rebuilds the picker with the new photo. A blue CAM banner shows the recipient, and CANCEL abandons this send and returns to the contact sheet; navigating away/powering off also clears the pending send.
- v0.317's **25 XP per newly verified quest**, level thresholds (50, 75, 100, …), three-day ambient RAD rates (1/2/3 RAD/min), global storm settings and one-hour offline catch-up remain unchanged.

## Verification and limits

- All regression scripts in `pwa/tests/*.js` passed, including real Chromium desktop/phone tests. A local Chromium fake camera **actually started and captured a frame**, archived the photo, and reached the recipient-specific send confirmation with no page errors. This is not a test of the user's hardware, live Firebase, or a live transmission.
- RAD dosing is best-effort client-side. Offline catch-up assumes the last MED-zone state for up to 60 minutes and can be wrong if a player moved while offline; high doses can be lethal in-game. Shared settings remain protected only by the app's existing UI gate, not database authentication. See the v0.317 release notes in `AGENT_HANDOFF_INSTRUCTIONS.md` for detailed behaviour and limitations.
