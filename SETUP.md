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

## Content editor and themes (new)
Upload the new file `theme.js` together with the others (the website and the admin both load it).

In the admin go to **Content** (`/admin/content`). Every box has its own Save button and a "Reset to default" button. Leave a field empty to keep the original text.
- **Photos**: upload your own profile photo (home page) and feature image (About page). "Use default" brings back the original pictures.
- **Home page**: greeting, your name, the two button texts, and the three small cards.
- **About page**: a short bio and the three info cards.
- **Skill cards**: title, short text, and the pop-up details (intro, learning list, tags, goal) for each of the three cards.
- **Home page terminal**: up to four command lines and what each prints.
- **Contact text and footer**.
- **Browser title and search description**.
- **Appearance**: five color themes (Sky blue, Violet, Emerald, Rose, Amber). The whole website, including the animated background, changes color.

Good to know:
- Uploaded pictures are stored in Firestore (resized automatically).
- The browser title and description change for visitors and shared links, but search engines may take time to notice.
- No extra Firestore rules are needed. The existing `settings` rule already covers the new data.

## 2026 upgrade (new)
**You must publish the updated `firestore.rules` again.** The contact form now has an optional "Your name" field, and the rules now also make sure each message's time comes from the server. Until you publish, messages still arrive: the name is put at the top of the message text instead.

What's new on the website:
- **Dark mode**: a moon/sun button in the menu bar. Each visitor's choice is remembered; until they choose, it follows their phone or computer setting. Works with all five color themes.
- **My journey**: a timeline on the About page for your education and milestones (it starts with your BCA). Edit it in the admin under **Content → My journey**.
- **Contact form**: optional name field and a live character counter.
- **Photo viewer**: a **Share / Copy link** button and a **Download** button. Keyboard users stay inside the viewer, and the page behind no longer scrolls.
- **Browser tab titles** per page ("About · Anup Giri", "Gallery · Anup Giri").
- **Mobile menu** rebuilt: closes on Escape, when you tap outside it, or after choosing a page. It looks right in dark mode too.
- The animated background pauses while the tab is hidden. Some unused code was removed.

What's new in the admin portal:
- **Dark mode** button in the top bar (uses the same setting as the website).
- Messages show the sender's **name**, have a **Copy email** button, and the reply email starts with "Hi <name>,". The CSV export has a Name column.
- The browser tab shows the number of unread messages, for example "(3) Admin · Anup Giri".
- The JSON backup now includes your Content settings.

## Icons, design refresh and new tools (new)
**Upload the new file `icons.js`** together with the others. Both the website and the admin load it. Without it, buttons show no icons. No new Firestore rules are needed for this update.

Website:
- One modern line-icon set everywhere: menu, buttons, gallery, photo viewer, footer and pop-ups. The old ☰ × ‹ › ↗ symbols are gone.
- New look: gradient name, shine effect on the main button, accent lines on section titles, cards that glow on hover, and a new footer with page links, socials and "Back to top".
- **Rotating words** under your name ("Web Developer", "AI Explorer"...). Change them in **Content → Home page → Rotating words**.
- **Projects page**: tag buttons (All, HTML, Firebase...) filter your projects.
- **Photo viewer**: slideshow (play/pause) and full-screen buttons.
- Small notifications in the corner (message sent, link copied, offline / back online).
- Press **/** anywhere to jump to the gallery search.

Admin portal:
- Icons on every button, a gradient welcome card, and a glowing marker on the current menu item.
- **Search or jump (Ctrl+K / Cmd+K)**: open any page or run an action (upload photos, add project, export, backup, dark mode, sign out) from the keyboard.
- Messages show "5 minutes ago" style times (hover for the full date) and have a new **Read only** filter.
- **Photo search** in Photos (by title or category).
- **Password strength meter** when changing your password.
- An **Offline** badge appears in the top bar when the connection drops.

## Animations (new)
**Upload the new file `fx.js`** together with the others (the website and the admin both load it). No Firestore changes are needed.

Website:
- **Intro splash**: your "A" logo with a spinning ring and loading bar, shown once per visit.
- **Dark mode switch**: the new color spreads out in a circle from the button (Chrome, Edge and other browsers with View Transitions; others fade smoothly).
- **Page changes** fade and rise in. Section titles draw an accent line under themselves.
- **Menu**: a highlight slides between links as you hover and scroll.
- **Cards** glow where the mouse is; skill and project cards tilt in 3D.
- **Magnetic buttons**: the main buttons lean toward the mouse. Buttons show a ripple when clicked.
- **Scroll effects**: the hero drifts and fades, project cards and timeline steps slide in one after another, and a "Scroll" mouse icon sits under the hero.
- **Photo viewer**: the next or previous photo slides in from the side you moved to.

Admin:
- Cards rise in one after another on every page, chart bars grow from the bottom, numbers on the Overview count up, cards glow under the mouse, buttons ripple, and the login card pops in.

Visitors who turn on "reduce motion" on their phone or computer get no animations; everything still works.

## 3D animation and 3D design (new)
**Upload the new file `fx3d.js`** together with the others (the website and the admin both load it). No extra libraries and no Firestore changes are needed. Everything is drawn by the browser, so it also works offline.

Website:
- **3D globe** behind your profile photo: a spinning network of points with orbiting satellites that leans toward the mouse and uses your color theme.
- **Floating layers**: the photo, the AI / IT / WEB chips and the "hello, world" tag sit at different depths, so they move apart in 3D when the photo tilts. Your name has a raised 3D look.
- **3D skill cube** on the About page: six sides (AI, Web, IT, Data, Cloud, Learn). Drag it, flick it, or focus it and use the arrow keys. It floats and spins gently by itself.
- **3D gallery**: a new **3D** button next to Mosaic and Masonry puts your photos on a rotating ring. Drag or swipe it, use the arrow keys or the buttons, or press play to spin it. Click a side photo to bring it to the front, then click the front photo to open it. Search and categories still work.
- **3D cards**: the icon and text of the skill cards float above the card when it tilts. The image and code box on the About page face each other like two screens, and the terminal leans back like a laptop screen (they straighten on hover).
- **3D push buttons** that press down when clicked. Headings, cards, pop-ups, the mobile menu, the photo viewer and notifications flip in with 3D motion.

Admin:
- 3D globe on the login screen and a small one on the Overview welcome card. The login card and stat cards tilt in 3D with the icons popping out.
- Chart bars look like 3D columns. Pages, dialogs, the Ctrl+K search and notifications flip in. The buttons press down.

With "reduce motion" turned on, the globe shows one still frame, nothing spins by itself, and the cube can still be turned by hand.
