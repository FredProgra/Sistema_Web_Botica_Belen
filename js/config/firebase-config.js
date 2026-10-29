 // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";
  import {getFirestore,addDoc,collection} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyA7IMygTmmcHnPBYmWJ8pUQ6VWQ1fp2lFw",
    authDomain: "boticabelenbd.firebaseapp.com",
    projectId: "boticabelenbd",
    storageBucket: "boticabelenbd.firebasestorage.app",
    messagingSenderId: "166852178480",
    appId: "1:166852178480:web:7446fc1598fa219613f3f5",
    measurementId: "G-JVEMC2PV3N"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  export const db=getFirestore(app);

  /*export const saveTask = (correo,password)=>{
   addDoc(collection(db,'tasks'),{correo,password});}*/