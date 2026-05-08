// firebase.js (CORE SINGLE SOURCE OF TRUTH)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   FIREBASE CONFIG (ONE PLACE ONLY)
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
};

/* =========================
   INIT APP (SINGLETON)
========================= */

const app = initializeApp(firebaseConfig);

/* =========================
   SERVICES EXPORTS
========================= */

export const db = getFirestore(app);
export const auth = getAuth(app);

console.log("🔥 Firebase Initialized (Production Mode)");
