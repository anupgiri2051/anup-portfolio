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
3. In that file, change `YOUR-ADMIN-EMAIL@example.com` to the email from step 1.
4. Click **Publish**.

What the rules do:
- Visitors can read photos and site settings, and can only CREATE a short, valid contact message.
- Only you (logged in) can read or delete messages, change photos, and edit settings.
- Visitors can only add +1 to the visit counter.

## 3. Allow your domain for login
In **Authentication -> Settings -> Authorized domains**, make sure `anupgiri.com` is listed
(add it if not). `localhost` is already allowed for testing.

## 4. Deploy
Upload all files (including `vercel.json`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`) and redeploy.
Open `https://anupgiri.com/admin.html` (or `/admin`) and log in with the email and password from step 1.

## What the admin panel can do
- Overview: photo count, message count, unread messages, site visits.
- Site settings: edit the home page intro text, the "Based in" card and the Instagram link.
- Photos: upload several at once, rename, delete.
- Messages: search, filter unread, mark read/unread, reply by email, export to CSV, delete.

## Good to know
- Existing messages that were saved before this update have no "read" flag, so they show as "New" until you open or mark them.
- The visit counter counts one visit per browser session.
- Photos are stored inside Firestore (compressed). Firestore documents are limited to about 1 MB, which is fine for the 1200px photos the uploader creates.
