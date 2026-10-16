# Pox-Boy 3026 v0.317 — Verified quest XP and RAD climate

**Prepared package, NOT deployed.** No live GitHub upload, Firebase rules publication, database deletion, or production-device test was performed here. The ZIP contains `pwa/` only; upload its **contents** to the GitHub Pages repository root.

## Publish order — Firebase rules update: YES

1. Publish the **complete `pwa/firebase-rules.json`** in Firebase Console → **Realtime Database → Rules** BEFORE uploading this release. It adds `xpEligible` on quest progress, permanent `questXpAwards` receipts and shared `radiationClimate/settings`. Previous v0.315 rules remain included. The existing Overseer gate is **UI-only**; these rules do not authenticate Overseers or prevent malicious database clients from forging quest statuses/settings.
2. Upload the **contents** of `pwa/` flat to the GitHub Pages repository **root**; preserve existing media/favicons not included in the ZIP. Reload installed units until they show **v0.317** (`pipboy-cache-v299`). No Firebase Functions or Web Push required.
3. Confirm with two real devices that issuer verification awards exactly once; test storm shelter, start/stop, and offline catch-up at low RAD levels before using high doses. Nothing has been started remotely by this package.

## XP on verified quests

- **Only newly verified quests** receive **25 XP each**. Existing verified quests are **not backfilled**. Both ISSUED → VERIFY and MAIL → VERIFY set the new `xpEligible` flag when changing the player's status to `verified`; a player's client claims one immutable Firebase receipt per quest. Interrupted claims retry on the next quest/receipt listener update. Re-verifying the same quest cannot give a second award.
- Level 1→2 costs **50 XP**, level 2→3 **75 XP**, level 3→4 **100 XP**, increasing by **25 XP per step**. STAT → STATUS shows level, lifetime XP and a progress bar; STAT → STATS shows total, level and XP remaining. Level-up sound now plays only for an actual level-up, not stage completion. Awards are stored in Firebase independent of the quest, so quest deletion does not remove already-earned XP. A local receipt cache keeps the readout visible during offline restarts; a new device synchronizes from Firebase.
- Receipt rules require an eligible, verified quest at claim time. Because quest verification itself retains the previously accepted broad UI-only database permissions, XP is **not tamper-proof** against malicious clients. A recipient's device must get online before a qualifying quest is permanently deleted so it can claim the receipt.

## RAD climate and Overseer UI

- On festival days **22, 23, 24 October 2026 in Australia/Perth**, units outside MED zones take **1, 2, 3 RAD per minute**, respectively. These are defaults even before an Overseer adjusts them. The **DAILY RAD RATES** button inside OVERSEER DISPLAY can set each day to 0, 1, 2, 3, 4, 5 or 10 RAD/min for all units. Outside these days the previous open-waste −1 RAD/min recovery still applies when there is no storm or other active radiation field.
- **START STORM** in OVERSEER DISPLAY launches a whole-map extra **+1, +3, +5 or +10 RAD/min** for 15, 30, 60 or 120 minutes; a confirmation warns of the danger. **STOP STORM** ends it early. Storm dose stacks with the day's open-waste rate. MED zones shelter from these new climate/storm doses and continue their existing recovery behaviour; this does not rewrite how HOT zones, pariahs, decon stations or Glowing Ones work.
- This is client-side best-effort exposure, not a server-side timer or closed-app push. After a closed/suspended app resumes, it catches up **at most 60 missed minutes** using the **last recorded MED-zone status** for that period. This can misjudge a player who physically moved while offline, and a cached storm can briefly be stale before Firebase reconnects. The app waits for a fresh Firebase settings snapshot before catch-up when available. RAD is capped by the existing 1000-RAD engine and can have serious in-game consequences. A storm record overwritten by a later storm does not preserve full history for offline reconstruction.
- Overseer controls are gated only by the app's existing local Overseer mode. Setting writes are not secure authorization. Do not publish this release if you require adversarial tamper resistance or authoritative offline location history.

## Verification

- All existing offline Node regression suites passed. `pwa/tests/xp-rad-climate-browser-smoke.js` checks level thresholds, old-quest exclusion, idempotent claim, festival rates, storm stacking, the 60-minute cap, and MED protection. Chromium checks also confirmed the Overseer map/editor still fits a phone; simulated local browser tests are **not** production Firebase/device tests.
