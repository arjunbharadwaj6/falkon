import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAQAepFITFtpi9J9aoNIL7UoJmsZ41CQe4",
  authDomain: "falkon-b7c5f.firebaseapp.com",
  projectId: "falkon-b7c5f",
  storageBucket: "falkon-b7c5f.firebasestorage.app",
  messagingSenderId: "1054321016592",
  appId: "1:1054321016592:web:8f59a4464552ae0360af95",
  measurementId: "G-YWVKH3X5DD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics (optional, only in production)
let analytics;
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
