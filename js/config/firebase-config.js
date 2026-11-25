import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA7IMygTmmcHnPBYmWJ8pUQ6VWQ1fp2lFw",
  authDomain: "boticabelenbd.firebaseapp.com",
  projectId: "boticabelenbd",
  storageBucket: "boticabelenbd.firebasestorage.app",
  messagingSenderId: "166852178480",
  appId: "1:166852178480:web:7446fc1598fa219613f3f5",
  measurementId: "G-JVEMC2PV3N"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
export const authReady = setPersistence(auth, browserLocalPersistence);
