# Firebase CMS Setup & Configuration Guide

This guide provides instructions to set up the Firebase project, migrate your static JSON data into Firestore, configure Google Authentication, and deploy the CMS.

---

## 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and create a new project (e.g. `portfolio-cms`).
3. Under the project settings, add a new **Web App**.
4. Retrieve your web app Firebase configuration block and update the config block in `js/firebase.js` with your exact values (specifically, replace `"YOUR_API_KEY"` with your Firebase Web API Key).

---

## 2. Enable Firebase Authentication

1. In the Firebase Console, go to **Build** -> **Authentication**.
2. Click **Get Started** and select the **Sign-in method** tab.
3. Click **Add new provider** and select **Google**.
4. Enable it, select your support email, and click **Save**.

---

## 3. Enable Cloud Firestore

1. In the Firebase Console, go to **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose your database location, select **Start in production mode** or **Start in test mode**, and click **Create**.
4. Once created, go to the **Rules** tab, paste the contents of the `firestore.rules` file from this repository, and click **Publish**.
   * *Note: The rules define `nihargnv@gmail.com` as the root administrator. If you want to use a different primary email, replace it in the `isAdmin()` function inside `firestore.rules` before publishing.*

---

## 4. Run the Data Migration

A web-based migration utility has been created to read your current `data/*.json` files and upload them to Firestore, while simultaneously registering your Google Account as the initial administrator.

1. Start your local development server or open the project locally.
2. Navigate to `migrate.html` in your browser (e.g. `http://localhost:3000/migrate.html` or `http://127.0.0.1:5500/migrate.html`).
3. Click the **Authenticate & Start Migration** button.
4. A Google Sign-In pop-up will appear. Sign in with the Google Account you wish to use as the administrator.
5. The script will automatically:
   - Create your administrator record in Firestore (`admins/YOUR_EMAIL`).
   - Read local JSON files (`data/portfolio.json`, `projects.json`, `videos.json`, `sections.json`).
   - Create the Firestore collections (`profile`, `settings`, `projects`, `skills`, `sections`, `videos`, `certifications`).
6. Once complete, you will see a success log entry. You can now access `/admin.html` without entering a password.

---

## 5. Deployment (GitHub Pages)

The refactored data layer includes a fallback system. If Firebase fails to initialize or is unconfigured (such as on initial branch creation), it falls back to loading data from the static JSON files in `/data`. Once configured, Firestore becomes the live source of truth.

To deploy on GitHub Pages:
1. Commit all files (excluding keys, though client keys in `firebase.js` are safe to commit as Firestore Security Rules enforce writes).
2. Push your changes to your GitHub Repository.
3. Your site will automatically load all portfolio elements directly from Firestore in real-time. Any changes made in `/admin.html` will be immediately visible on your homepage.
