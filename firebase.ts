import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7GpJqjqhf-igQEsgK2m6_Rd9L_HKrSTI",
  authDomain: "suporte-7e68b.firebaseapp.com",
  projectId: "suporte-7e68b",
  storageBucket: "suporte-7e68b.firebasestorage.app",
  messagingSenderId: "409489811769",
  appId: "1:409489811769:web:7c53dba622e5a4a2df60e8",
  measurementId: "G-G529W9ESSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Auth with explicit configuration
const auth = getAuth(app);
// Set language code for better error messages
auth.languageCode = 'pt-BR';

export { db, auth };