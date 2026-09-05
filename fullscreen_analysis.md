# iOS and Fullscreen APIs

If the `requestFullscreen()` function is silently failing after hosting, it is almost guaranteed you are testing this on an **iPhone or iPad (iOS Safari)**.

## The iOS Restriction
Apple intentionally disabled the HTML5 Fullscreen API on iPhones. `document.documentElement.requestFullscreen()` simply does not exist in Safari on iOS, so clicking the button throws a silent error and does nothing. 

Apple only allows videos (like YouTube) to go fullscreen on iPhones, not web elements.

## The PWA Workaround
The *only* way to get true, immersive fullscreen on an iPhone is through the **Progressive Web App (PWA) installation process**.

If you look at the `manifest.json` file we created, it contains this line:
`"display": "standalone"`

When an iOS user opens your hosted Netlify link in Safari, they MUST do the following:
1. Tap the "Share" button at the bottom of Safari (the square with an arrow pointing up).
2. Scroll down and tap **"Add to Home Screen"**.
3. Close Safari, go to their home screen, and tap the new **POX-BOY** app icon.

When the app launches from the home screen, iOS reads that `"display": "standalone"` instruction and automatically hides the Safari URL bar and navigation buttons, giving you a 100% fullscreen, native-feeling app without ever needing to click the `[FULLSCREEN]` button inside the app itself!

*Note: The in-app `[FULLSCREEN]` button will still work perfectly for Android users and desktop users.*
