# POX-BOY 3026 - Official Deployment Guide (v1.0)

Follow this guide to deploy your app securely and permanently to the web. 

## Step 1: Download the Files
1. In this workspace, locate the **`PoxBoy3026_App_v1.0.zip`** file.
2. Download it to your desktop and unzip it. You should have a folder called `pwa` containing `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, and `icon.png`.

## Step 2: Set up GitHub (The Storage)
*Netlify needs somewhere to read your code from. GitHub is the standard.*
1. Go to **[GitHub.com](https://github.com/)** and create a free account (or log in).
2. Look for the `+` icon in the top right corner and click **New Repository**.
3. Name the repository `pox-boy-app` (or similar). 
4. Check the **Public** option. (Do not check "Add a README file").
5. Click **Create repository**.
6. On the next screen, look for the link that says **"uploading an existing file"** and click it.
7. Drag and drop all the files from inside your `pwa` folder into the browser window.
8. Click **Commit changes**. Your code is now safely backed up on GitHub!

## Step 3: Deploy with Netlify (The Host)
*Netlify will turn your GitHub files into a live, secure website.*
1. Go to **[Netlify.com](https://www.netlify.com/)** and create a free account (I highly recommend choosing the "Sign up with GitHub" option to link them instantly).
2. Once logged in, click **Add new site** -> **Import an existing project**.
3. Click the **GitHub** button. (It may ask you to authorize Netlify, click authorize).
4. Select your `pox-boy-app` repository from the list.
5. You don't need to change any build settings. Just scroll to the bottom and click **Deploy site**.
6. Netlify will take about 15 seconds to build the site. It will generate a random URL (like `https://teal-unicorn-842.netlify.app`).

## Step 4: Test It
1. Open that Netlify URL on your iPhone or Android device.
2. Verify the `CAM` tab successfully asks for camera permissions.
3. Tap the "Share" button (iOS) or browser menu (Android) and select **Add to Home Screen**.
4. Open the newly installed app from your home screen to verify the immersive Fullscreen mode works!
