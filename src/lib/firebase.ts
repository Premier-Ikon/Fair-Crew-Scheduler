import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const firebaseEnabled = Boolean(config.projectId && config.apiKey);
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004").replace(
  /\/$/,
  "",
);

let firestore: Firestore | null = null;
let emulatorBound = false;

function getApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  return getApps()[0] ?? initializeApp(config);
}

export function getAuthClient(): Auth | null {
  const app = getApp();
  return app ? getAuth(app) : null;
}

export function getDb(): Firestore | null {
  if (!firebaseEnabled) return null;
  if (firestore) return firestore;
  const app = getApp();
  if (!app) return null;
  firestore = getFirestore(app);
  if (process.env.NEXT_PUBLIC_USE_EMULATOR === "true" && !emulatorBound) {
    connectFirestoreEmulator(firestore, "localhost", 8080);
    emulatorBound = true;
  }
  return firestore;
}
