# Live Location Sharing Feasibility

## The Problem with "Free & Serverless" Live Tracking
To have Player A see Player B moving on their map in real-time, the following must happen:
1. Player B's phone reads its GPS.
2. Player B's phone sends that GPS data to a central server.
3. Player A's phone asks the server, "Where is Player B?"
4. The server sends the data to Player A.

Because our Pox-Boy app is currently **100% serverless** (it relies entirely on local phone storage and P2P QR codes), true "live" background tracking is impossible. QR codes can only transmit data when two phones are physically looking at each other.

## Option 1: Firebase Realtime Database (Free Tier)
We *can* add a lightweight backend using Google Firebase. 
*   **How it works:** We embed the Firebase JS SDK into the app. When GPS is enabled, the app silently pushes the user's `[ID, Lat, Lng]` to a Firebase database. Other apps read that database and draw the markers.
*   **The Cost:** Firebase has a generous free tier ("Spark Plan"). It allows 50,000 document reads per day and 100 simultaneous connections. 
*   **The Catch:** For a multi-day event with hundreds of attendees, 100 simultaneous connections might bottleneck, and 50,000 reads will vanish quickly if 50 people are constantly polling the database every 2 seconds to watch dots move. It also **requires cell service**, completely breaking the offline nature of the app.

## Option 2: The "Ping" Method (Asynchronous P2P)
We keep it serverless and rely on asynchronous communication networks (like SMS or WhatsApp) that attendees are already using.
*   **How it works:** A player clicks `[SHARE LOCATION]` on the map. The app generates a customized deep link (e.g., `https://pox-boy.com/?loc=-31.95,115.86&user=ScrapIron`).
*   **The Action:** It opens their phone's native share sheet. They text that link to their friend.
*   **The Result:** When the friend taps the text message, it opens their Pox-Boy app, reads the URL data, and drops a waypoint on their map named "ScrapIron's Ping". 
*   **Pros:** 100% free, no servers, works even with terrible cell service.
*   **Cons:** It is a static snapshot of where they *were* when they hit the button, not a live moving dot.

## Option 3: Local Mesh Networking (WebRTC / Web Bluetooth)
*   **Concept:** Phones communicate directly with each other via Bluetooth or localized WiFi direct without hitting the internet.
*   **The Reality:** Web browsers (Chrome/Safari) fiercely restrict P2P hardware APIs. WebBluetooth can only read from dumb sensors (like heart rate monitors), not other phones. WebRTC requires a central "signaling server" to introduce the two phones before they can talk locally. This is a technical nightmare for a web app and requires building a native iOS/Android app.
