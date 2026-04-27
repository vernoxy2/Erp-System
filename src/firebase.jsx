import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCX5nYBz-HcNasQ9mlD3oly1teBWPOUm7c",
  authDomain: "erp-system-bd67c.firebaseapp.com",
  projectId: "erp-system-bd67c",
  storageBucket: "erp-system-bd67c.firebasestorage.app",
  messagingSenderId: "745506561823",
  appId: "1:745506561823:web:31db9b15f30a5251fb9a2a",
  measurementId: "G-L1MZ8HDDYN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);