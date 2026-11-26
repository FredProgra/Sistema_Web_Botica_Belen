import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAiiNmZO-ZUFnuOvU2HjVLSGpBeTZJc--A",
  authDomain: "botica-belen.firebaseapp.com",
  projectId: "botica-belen",
  storageBucket: "botica-belen.firebasestorage.app",
  messagingSenderId: "968310537482",
  appId: "1:968310537482:web:a11c5825737d1cdc4d4ef3",
  measurementId: "G-DF3WCLPCY2"
};

// Evita inicializaciones duplicadas cuando el navegador conserva módulos en caché.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence);
