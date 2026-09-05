# How to Perform a Clean Wipe of GitHub Files

If you ever want to completely purge your GitHub repository and upload a brand new ZIP file structure from scratch, follow these exact steps:

## Step 1: Delete the Old Files
1. Go to your repository on **GitHub.com**.
2. Unfortunately, GitHub doesn't have a "delete all" button in the standard web interface. You must delete the files one by one.
3. Click on a file (e.g., `index.html`).
4. In the top right corner of the file view, click the **three dots (`...`)** and select **Delete file**.
5. Scroll to the bottom and click the green **Commit changes** button.
6. Repeat this process for the other core files (`app.js`, `styles.css`, `sw.js`).

## Step 2: Upload the Clean Slate
1. Once your repository is completely empty (it might show a "Quick setup" screen), look for the link that says **"uploading an existing file"** (or click `Add file` -> `Upload files`).
2. Unzip the latest `PoxBoy3026_App` zip file on your computer.
3. Open the unzipped `pwa` folder.
4. Drag and drop **every single file** inside that folder into the GitHub browser window.
5. Click **Commit changes**.

## Step 3: Trigger Netlify
Netlify will automatically detect this massive new commit, rebuild the site, and push the clean slate live within 10 seconds!
