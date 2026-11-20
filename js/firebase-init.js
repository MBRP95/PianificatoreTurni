import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const cfg = window.TURNI_FIREBASE_CONFIG;
if (!cfg || !cfg.apiKey || cfg.apiKey === "YOUR_API_KEY") {
  window.firebaseReady = false;
  window.firebaseConfigMissing = true;
  window.dispatchEvent(new Event("firebase-ready"));
} else {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("Persistenza locale non disponibile", e);
    try {
      await setPersistence(auth, inMemoryPersistence);
    } catch (_) {}
  }
  window.firebaseApi = {
    auth,
    db,
    firebaseConfig: cfg,
    initializeApp,
    getApp,
    getAuth,
    setPersistence,
    inMemoryPersistence,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    createUserWithEmailAndPassword,
    deleteUser,
    doc,
    getDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp,
    setDoc,
    deleteDoc,
    updateDoc,
  };
  window.firebaseReady = true;
  window.firebaseConfigMissing = false;
  window.dispatchEvent(new Event("firebase-ready"));
}
