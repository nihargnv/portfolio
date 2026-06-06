import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5uBgyqxJOvOvbDPalvNcG_7bC1VzPICU",
  authDomain: "portfolio-cms-1bd99.firebaseapp.com",
  projectId: "portfolio-cms-1bd99",
  storageBucket: "portfolio-cms-1bd99.firebasestorage.app",
  messagingSenderId: "701646409547",
  appId: "1:701646409547:web:93e38121cb1d937a7662ce",
  measurementId: "G-TWM9ZR8H0Y"
};

// Check if config has been customized
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

let app = null;
let db = null;
let auth = null;
let analytics = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    // Analytics requires a valid measurementId and environment
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      analytics = getAnalytics(app);
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase is unconfigured. Make sure to replace YOUR_API_KEY.");
}

// Google Auth provider
const googleProvider = new GoogleAuthProvider();

export {
  app,
  db,
  auth,
  analytics,
  isFirebaseConfigured,
  googleProvider,
  signInWithPopup,
  signOut
};
