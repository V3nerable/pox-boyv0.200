# HTTPS Hosting for PWA Event Apps

Yes, **Netlify** is 100% free and is arguably the absolute best platform for hosting a frontend PWA like this permanently.

Here is a breakdown of what you need to know:

## Is Netlify Free Forever?
Yes. Netlify's "Starter" tier is free forever. It is designed for frontend web apps exactly like this one.
*   **Bandwidth:** 100 GB per month. (Our app is currently under 1MB. Even with 1,000 attendees opening the app 100 times each, you wouldn't even dent this limit).
*   **HTTPS:** Netlify automatically provisions and manages a free SSL certificate (HTTPS) for your app. You don't have to configure anything.

## How to Deploy Permanently
Instead of using "Netlify Drop" (which creates a temporary random URL), you should link it to a free **GitHub** repository.
1. Create a free GitHub account and upload the `pwa` folder into a new repository.
2. Create a free Netlify account.
3. Click "Add new site" -> "Import an existing project".
4. Connect your GitHub account and select the repository you just made.
5. Click "Deploy". 
*   **The Magic:** Any time you want to update the app (e.g., adding new quests before the event starts), you just upload the new `index.html` file to GitHub. Netlify will instantly detect the change and auto-update the live website for everyone within 5 seconds.

## Custom Domains (Optional)
By default, Netlify will give you a free, permanent URL like `https://pox-boy-3026.netlify.app`. 
If you want something cleaner (like `https://pox-boy.com`), you can buy the domain name on Namecheap or GoDaddy for ~$10/year and link it to Netlify for free.

## Potential Issues to Watch Out For
Because this is a **Progressive Web App (PWA)**, there is one specific quirk you must manage: **The Cache.**
*   **The Problem:** When an attendee opens the app at the event, the `sw.js` (Service Worker) downloads the app to their phone so it works offline. If you update the code *after* they have loaded it, their phone might stubbornely keep showing them the old, offline version.
*   **The Solution:** If you make major updates right before the event, you must change the `CACHE_NAME` variable inside the `sw.js` file (e.g., from `pipboy-cache-v1` to `pipboy-cache-v2`). This tells all the phones in the wasteland, "Hey, there's a mandatory system update, discard the old offline files and download the new ones!"
