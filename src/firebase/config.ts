import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBk7ghDFCzeTqDSvjfljWER1a7AI24yt3Q",
  authDomain: "presalescrm-c1fd9.firebaseapp.com",
  projectId: "presalescrm-c1fd9",
  storageBucket: "presalescrm-c1fd9.firebasestorage.app",
  messagingSenderId: "454418841208",
  appId: "1:454418841208:web:d1cfae47cfd564e34d378d",
  measurementId: "G-42B1B8STN3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

export default app;