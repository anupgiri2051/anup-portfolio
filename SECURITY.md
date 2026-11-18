# Security checklist for anupgiri.com

No website can be made "impossible to hack". But after the steps below, the usual ways
sites like this get attacked are blocked. The code changes are already done. The steps
here are settings only you can change, in your Firebase, Google and Vercel accounts.
Do them in this order. Steps 1–3 matter most.

---

## Already done in the code (nothing to do)
- **Content-Security-Policy and other security headers** (in `vercel.json`). Browsers only run
  scripts from your site and Google/Firebase, and other sites can't put your site in a frame to trick visitors.
  Your pages no longer use any inline scripts, which makes this strict policy possible.
- **Stricter Firestore rules** (`firestore.rules`):
  - Messages must be well formed (a real email format, a length limit, server time).
  - Visitors can never read, change or delete messages. Even the admin can only flip
    read/unread and can't rewrite them.
  - The visit counters only accept +1 on correctly named documents, so no junk documents.
  - Admin access requires email + password sign-in as your exact email.
  - Anything not listed is locked.
- **Admin sign-in**:
  - It lasts only until the browser closes.
  - Auto sign-out after 30 minutes idle (as before).
  - The form locks after 5 wrong passwords, for 1 min, then 2, 4… up to 1 hour.
  - New passwords need 12+ characters with a mix of character types.
- **No private data left on the computer**: the admin portal no longer keeps an offline copy of your
  messages in the browser. Old copies are wiped on the next visit.
- **Safe CSV export**: a visitor can't hide an Excel formula in a message (e.g. `=HYPERLINK(...)`).
  Such cells are exported as plain text.
- **Spam traps**: the hidden field, plus forms sent within 3 seconds of opening the page, are ignored.
- **App Check** is built in and waits for your key (step 4).

---

## 1. Publish the new Firestore rules (required)
Firebase console → **Firestore Database → Rules** → paste all of `firestore.rules` → **Publish**.

**Even stronger (recommended):** lock admin rights to your account's unique ID instead of the email.
1. Firebase → **Authentication → Users**. Copy the **User UID** of your admin account.
2. In `firestore.rules`, replace the `return …` lines of `isAdmin()` with:
   `return request.auth != null && request.auth.uid == "PASTE_UID_HERE";`
3. Publish again. Then save a test change in your admin to confirm it still works.

## 2. Lock down Firebase Authentication (required)
Firebase → **Authentication → Settings**:
- **User actions**: turn OFF **Enable create (sign-up)** and **Enable deletion**.
  Now nobody can create accounts on your project. Only you, from the console.
- **User account management**: turn ON **Email enumeration protection**.
- **Authorized domains**: keep only `anupgiri.com`, `www.anupgiri.com` (if used) and `localhost`.
  Remove anything you don't use.
- **Sign-in method**: only **Email/Password** should be enabled.

## 3. Protect the accounts that control the site (most important of all)
Hackers rarely break the code. They usually take over an account. Whoever controls these accounts controls your site:
- **The Gmail account `anupgiri2051@gmail.com`**: "Forgot password?" sends the reset link there.
  Turn on **2-Step Verification** (myaccount.google.com → Security).
- **Your Google account that owns the Firebase project**: same, 2-Step Verification.
- **Vercel** and **GitHub** (if you deploy from GitHub): turn on two-factor authentication in each.
- Admin password: 12+ characters, used nowhere else. A password manager helps.

## 4. Turn on App Check (stops bots that skip your website)
Without it, a script can still send spam straight to your database. With it, only your real website can.
1. Go to **google.com/recaptcha/admin** → create a **reCAPTCHA v3** key.
   Under domains, add `anupgiri.com` (and `www.anupgiri.com`).
2. Firebase → **App Check → Apps** → your web app → **reCAPTCHA v3** → paste the **secret key** → Save.
3. In `firebase-config.js`, paste the **site key** (NOT the secret) into `APP_CHECK_SITE_KEY = "..."`. Deploy.
4. Wait 1–2 days. Firebase → **App Check → APIs → Cloud Firestore** should show mostly *verified* requests.
5. Then click **Enforce** for Cloud Firestore.
   ⚠️ Only enforce *after* step 3 is live. Otherwise your site can't load data.

## 5. Restrict the Firebase API key
The key in `firebase-config.js` is meant to be public. Restricting it means it only works from your site.
Google Cloud console (console.cloud.google.com) → project **portfolio-db-9dbc4** →
**APIs & Services → Credentials** → the **Browser key**:
- **Application restrictions → Websites**: `https://anupgiri.com/*`, `https://www.anupgiri.com/*`, `http://localhost/*`
- **API restrictions → Restrict key** to: Cloud Firestore API, Identity Toolkit API, Token Service API,
  Firebase App Check API, Firebase Installations API.
- Save, wait 5 minutes, then check that the website loads and that you can sign in to the admin.
  If sign-in fails, add the API named in the error message.

## 6. Keep an eye on it
- Firebase → **Usage and billing**: you are on the free Spark plan, so you can't be charged. If you ever
  upgrade to Blaze, set a **budget alert** first.
- Firebase → **Authentication → Users**: there should be exactly one user (you).
- Download a **backup** from Admin → Account every month or so.
- If a page ever breaks after an update, open the browser console (F12). A message starting with
  "Refused to load…" means the security policy in `vercel.json` needs that address added.

---

## Honest limits
- The maintenance screen and the popup are visitor-side features. Anyone can still read your
  *public* content (photos, projects, texts). That is by design: it's a public website.
- Visitors could still slowly add fake +1 visits to the counter. That's harmless, and App Check reduces it.
- The biggest remaining risk is someone getting into your Gmail, Google, Vercel or GitHub
  account. Step 3 protects against that.
