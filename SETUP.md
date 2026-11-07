# Setup: secure admin login (do this once, BEFORE you deploy)

The admin page now uses real Firebase Authentication instead of a password written in the code.
If you deploy without doing these steps, you will not be able to log in.

## 1. Create your admin user
1. Open https://console.firebase.google.com and choose your project (portfolio-db-9dbc4).
2. Go to **Build -> Authentication -> Get started**.
3. Open the **Sign-in method** tab and turn on **Email/Password**.
4. Open the **Users** tab, click **Add user**, and enter your email and a strong password.
   (Use an email you can access, so "Forgot password?" works.)

## 2. Lock down the database
1. Go to **Build -> Firestore Database -> Rules**.
2. Replace everything with the contents of `firestore.rules`.
3. In that file, change `anupgiri2051@gmail.com` to the email from step 1.
4. Click **Publish**.

What the rules do:
- Visitors can read photos and site settings, and can only CREATE a short, valid contact message.
- Only you (logged in) can read or delete messages, change photos, and edit settings.
- Visitors can only add +1 to the visit counter.

## 3. Allow your domain for login
In **Authentication -> Settings -> Authorized domains**, make sure `anupgiri.com` is listed
(add it if not). `localhost` is already allowed for testing.

## 4. Deploy
Upload all files (including `vercel.json`, which makes the admin open at /admin and redirects /admin.html to it, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`) and redeploy.
Open `https://anupgiri.com/admin` and log in with the email and password from step 1.

## What the admin panel can do
- Overview: photo count, message count, unread messages, site visits.
- Site settings: edit the home page intro text, the "Based in" card and the Instagram link.
- Photos: upload several at once, rename, delete.
- Messages: search, filter unread, mark read/unread, reply by email, export to CSV, delete.

## Good to know
- Existing messages that were saved before this update have no "read" flag, so they show as "New" until you open or mark them.
- The visit counter counts one visit per browser session.
- Photos are stored inside Firestore (compressed). Firestore documents are limited to about 1 MB, which is fine for the 1200px photos the uploader creates.

## Admin portal at /admin (new)
- The admin now opens at `https://anupgiri.com/admin` (the old `/admin.html` address redirects there).
- Sections: Overview (stats, 7-day message chart, recent messages), Photos, Messages, Site settings, Account.
- Account: change your password (you must type the current one), see your last sign-in, sign out.
- For safety you are signed out automatically after 30 minutes without activity.
- `admin-fx.js` is no longer used and does not need to be uploaded.

## Home page popup (new)
In the admin go to **Popup**:
1. Add photos (uploaded and compressed automatically) and/or video links (YouTube, Vimeo, or a direct https link ending in .mp4).
2. Write an optional title, message and button, choose how often visitors see it, switch **Show popup** on and press **Save popup**.
3. Press **Preview on site** to see exactly what visitors will see, even while the popup is switched off.

Good to know:
- Videos are added by link, not uploaded. Firestore documents are limited to about 1 MB, and Firebase Storage needs a paid plan on new projects, so a link keeps this free.
- Use the order buttons (arrows) to change the order of the slides.
- When you save the popup again, visitors who closed it before will see the updated version.
- **You must publish the updated `firestore.rules` again** (it now includes a `popupSlides` section). Without it, adding photos and videos to the popup will fail.

## More options (new)
**You must publish the updated `firestore.rules` again.** It now has `projects` and `statsDaily` sections. Without them, projects cannot be saved and the daily visits chart stays empty.

In the admin portal:
- **Projects**: add projects with a name, description, tags, link and cover image. A "Projects" menu item, a Projects page and a "Latest projects" row on the home page appear automatically once you add one. You can edit, reorder and delete projects.
- **Site settings** (now three cards):
  - Website text and links: home intro, status badge (for example "Open to internships"), "Based in", CV link (adds a "Download CV" button), and social links (Instagram, GitHub, LinkedIn, Facebook, YouTube, public email).
  - Announcement bar: a thin colored bar at the top of every page that visitors can close.
  - Maintenance mode: shows visitors a "be right back" screen while you work. You can still use the admin. Use **Preview on site** first, and remember to switch it off.
- **Photos**: give each photo an optional category. The gallery then shows filter buttons (All, Travel, ...). Use the **Category** button on a photo to change it later.
- **Overview**: a chart of site visits for the last 14 days.
- **Account**: **Download backup (JSON)** saves your settings, messages, projects and photo list.

Good to know:
- Maintenance mode works with JavaScript, so it is a visitor screen, not a real server shutdown. Search engines may still read the page.
- Daily visits are counted per browser session (one visit per person per session) and use UTC dates.
- `sitemap.xml` now lists the /projects page.

## Admin addresses (new)
Each admin section has its own address, for example:
- `https://anupgiri.com/admin/overview`
- `https://anupgiri.com/admin/photos`
- `https://anupgiri.com/admin/projects`
- `https://anupgiri.com/admin/popup`
- `https://anupgiri.com/admin/messages`
- `https://anupgiri.com/admin/settings`
- `https://anupgiri.com/admin/account`

`/admin` opens the overview, and old links like `/admin#settings` are converted automatically. If you open one of these addresses while signed out, you see the login first and then land on that section. `vercel.json` must be deployed for these addresses to work after a page refresh.
