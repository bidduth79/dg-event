import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwVaW1Av1w4ulft-vCXL4AKliO2Rg317o",
  authDomain: "event-for-dg.firebaseapp.com",
  projectId: "event-for-dg",
  storageBucket: "event-for-dg.firebasestorage.app",
  messagingSenderId: "700124612380",
  appId: "1:700124612380:web:0406a33acc1adcca6a9cd9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export reference
export const db = getFirestore(app);