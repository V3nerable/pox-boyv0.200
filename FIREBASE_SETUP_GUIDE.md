# How to Create a Firebase Project for Live Tracking

Follow these steps exactly to create your database and get the configuration keys needed to wire up the Pox-Boy live map.

## Phase 1: Create the Project
1. Go to **[console.firebase.google.com](https://console.firebase.google.com/)** and log in with any Google account.
2. Click the big **"Create a project"** (or "Add project") button.
3. Enter a project name (e.g., `pox-boy-tracker`). Click Continue.
4. **Google Analytics:** It will ask if you want to enable Google Analytics. Turn this **OFF** (toggle the switch). We don't need it and it just adds bloat. Click **Create project**.
5. Wait a few seconds for it to provision, then click **Continue**.

## Phase 2: Create the Realtime Database
*We need to set up the actual database that will hold the GPS coordinates.*
1. Look at the left-hand navigation menu. Expand the **Build** dropdown and click **Realtime Database**.
2. Click the **"Create Database"** button.
3. **Location:** Choose the location closest to your event (e.g., `United States` or `Singapore` or `Belgium`). Click Next.
4. **Security Rules:** It will ask about starting in Locked mode or Test mode. Choose **"Start in test mode"**. 
   *(Note: This allows anyone to read/write to the database for 30 days, which is perfect for an event. We can lock it down later if needed).*
5. Click **Enable**. You should now see a screen with a database URL (e.g., `https://pox-boy-tracker-default-rtdb.firebaseio.com/`) and a big empty space saying "null". 

## Phase 3: Register the "Web App"
*Now we need to generate the API keys that allow our HTML file to talk to this database.*
1. Click the **Project Overview** (the home icon/text) in the top left corner of the menu.
2. Under "Get started by adding Firebase to your app", you will see icons for iOS, Android, and Web (`</>`). Click the **`</>` (Web)** icon.
3. **App nickname:** Enter a name (e.g., `pox-boy-pwa`). Leave the "Firebase Hosting" checkbox **unchecked** (we are using GitHub Pages/Netlify for hosting). Click **Register app**.
4. **Add Firebase SDK:** You will see a block of code pop up. We do not need the whole thing, we just need the `firebaseConfig` section. It will look exactly like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB-xxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "pox-boy-tracker.firebaseapp.com",
  databaseURL: "https://pox-boy-tracker-default-rtdb.firebaseio.com",
  projectId: "pox-boy-tracker",
  storageBucket: "pox-boy-tracker.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Final Step
Copy that `firebaseConfig` block and paste it to me here in the chat. I will instantly wire it into the app's GPS logic!
