import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ← Add this

const firebaseConfig = {
  apiKey: "AIzaSyDCRu5eU22MoG1uJi56n5wnfnVZhTaR5WI",
  authDomain: "fib2fab-3d3e0.firebaseapp.com",
  projectId: "fib2fab-3d3e0",
  storageBucket: "fib2fab-3d3e0.firebasestorage.app",
  messagingSenderId: "103833128120",
  appId: "1:103833128120:web:5edfcd10038d0e4b19f84d",
  measurementId: "G-9Z0LREK3N0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app); // ← Add this
export default app;