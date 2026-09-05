# Updating the Pox-Boy App (The CI/CD Workflow)

Now that your app is deployed via GitHub and Netlify, you have a professional "Continuous Integration / Continuous Deployment" (CI/CD) pipeline. 

Here is exactly how you push updates to your attendees' phones:

## Step 1: Make the Changes Locally
1. You come back to this Arena.ai chat, and we write new features (e.g., adding a new Quest or Faction).
2. I generate a new `.zip` file for you (e.g., `v1.1.zip`).
3. You download it and unzip it on your computer.

## Step 2: Push the Update to GitHub
1. Go to your repository on **GitHub.com**.
2. Click **Add file** -> **Upload files**.
3. Drag and drop the updated files (e.g., `index.html`, `app.js`, `sw.js`) from your computer into the browser window.
4. Click **Commit changes**.

## Step 3: Netlify Does the Magic (Automatic)
*You do not need to log into Netlify to update the app!*
Because you linked Netlify to your GitHub repository during the initial setup, Netlify is constantly watching that repository. The absolute second you click "Commit changes" on GitHub, Netlify automatically detects the new files, pulls them down, and updates your live website. It takes less than 5 seconds.

## Step 4: The Service Worker Cache (Forcing User Phones to Update)
This is the most critical step for an offline app. Because the app downloads itself into the memory of your attendees' phones, their phones won't realize you pushed an update to GitHub—they will keep loading the old, offline version!

To fix this, whenever we make a major update to the app, I will update the `sw.js` (Service Worker) file by changing this line at the very top:
`const CACHE_NAME = 'pipboy-cache-v2';` -> `const CACHE_NAME = 'pipboy-cache-v3';`

When a user's phone connects to cell service/WiFi and opens the app, it briefly checks the live website. It will see that the `CACHE_NAME` has changed. The phone will immediately realize, *"Oh, my offline files are out of date!"*, silently delete the old files from its memory, and download the new `v3` files.
