/**
 * Test flusso Auth diretta (emulator Auth + Firestore).
 * Dati sintetici; nessuna password umana in Firestore.
 *
 *   npx --prefix scripts/security firebase emulators:exec \
 *     --only auth,firestore --project pianificatoreturni-auth-test \
 *     "node scripts/security/run-auth-flow-tests.mjs"
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");

const projectId = "pianificatoreturni-auth-test";
const cfg = {
  apiKey: "demo-api-key",
  projectId,
  authDomain: "localhost",
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  // rules file present (emulator already loaded from firebase.json)
  assert(rules.includes("allow read: if false"), "rules must deny loginKeys read");
  assert(!/allow get:\s*if keyId\.matches/.test(rules), "old public loginKeys get must be gone");

  const app = initializeApp(cfg, "auth-flow-test");
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  const email = "admin@pianificatore.invalid";
  const humanPw = "TestAdmin!99";
  const humanPw2 = "TestAdmin!100";

  // Bootstrap-like: create admin with human password as Auth password
  const cred = await createUserWithEmailAndPassword(auth, email, humanPw);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    username: "admin",
    displayName: "Amministratore",
    role: "admin",
    shopId: null,
    shopName: null,
    active: true,
    mustChangePassword: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "settings", "initialized"), { authMode: "direct" });
  console.log("PASS bootstrap-create");

  await signOut(auth);

  // Login with human password
  const logged = await signInWithEmailAndPassword(auth, email, humanPw);
  assert(logged.user.uid === uid, "uid mismatch");
  const profile = await getDoc(doc(db, "users", uid));
  assert(profile.exists(), "profile missing");
  assert(profile.data().role === "admin", "role");
  console.log("PASS admin-login");

  // Change password
  await updatePassword(logged.user, humanPw2);
  await setDoc(
    doc(db, "users", uid),
    { mustChangePassword: false, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await signOut(auth);
  await signInWithEmailAndPassword(auth, email, humanPw2);
  console.log("PASS change-password");

  // Old password fails
  await signOut(auth);
  let oldFailed = false;
  try {
    await signInWithEmailAndPassword(auth, email, humanPw);
  } catch (_) {
    oldFailed = true;
  }
  assert(oldFailed, "old password should fail");
  console.log("PASS old-password-rejected");

  // Unauthenticated cannot read archives
  const app2 = initializeApp(cfg, "auth-flow-unauth");
  const db2 = getFirestore(app2);
  connectFirestoreEmulator(db2, "127.0.0.1", 8080);
  let denied = false;
  try {
    await getDoc(doc(db2, "archives", "demo01", "years", "2026"));
  } catch (_) {
    denied = true;
  }
  // With rules, getDoc may return exists:false or throw — try set
  try {
    await setDoc(doc(db2, "archives", "demo01", "years", "2026"), { x: 1 });
  } catch (_) {
    denied = true;
  }
  assert(denied, "unauth write archive should fail");
  console.log("PASS unauth-archive-denied");

  // loginKeys get denied for authenticated admin too
  await signInWithEmailAndPassword(auth, email, humanPw2);
  let keyDenied = false;
  try {
    await getDoc(doc(db, "loginKeys", "0".repeat(64)));
  } catch (_) {
    keyDenied = true;
  }
  // permission-denied surfaces as empty + error in modular SDK via assertFails pattern;
  // attempting create should fail
  try {
    await setDoc(doc(db, "loginKeys", "0".repeat(64)), { uid, username: "admin", authSecret: "x".repeat(16) });
  } catch (_) {
    keyDenied = true;
  }
  assert(keyDenied, "loginKeys writes/gets must be denied");
  console.log("PASS loginKeys-denied");

  // Create store account (Auth direct) + archive isolation seed
  await setDoc(doc(db, "shops", "demo01"), { name: "Demo Store A", active: true });
  const storeEmail = "store.demo01@pianificatore.invalid";
  const storePw = "StoreDemo!01";
  const appStore = initializeApp(cfg, "staff-password");
  const authStore = getAuth(appStore);
  connectAuthEmulator(authStore, "http://127.0.0.1:9099", { disableWarnings: true });
  const storeCred = await createUserWithEmailAndPassword(authStore, storeEmail, storePw);
  const storeUid = storeCred.user.uid;
  // admin writes user profile (still signed in on main auth)
  await setDoc(doc(db, "users", storeUid), {
    username: "store.demo01",
    displayName: "Demo Store A",
    role: "store",
    shopId: "demo01",
    shopName: "Demo Store A",
    active: true,
    mustChangePassword: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await signOut(authStore);
  console.log("PASS create-store");

  await signOut(auth);
  await signInWithEmailAndPassword(auth, storeEmail, storePw);
  await setDoc(doc(db, "archives", "demo01", "years", "2026"), {
    shopId: "demo01",
    year: 2026,
    people: [{ id: "p1", name: "GIULIA FERRARI" }],
    turni: {},
  });
  const own = await getDoc(doc(db, "archives", "demo01", "years", "2026"));
  assert(own.exists(), "store should read own archive");
  console.log("PASS store-archive-own");

  let otherDenied = false;
  try {
    await setDoc(doc(db, "archives", "demo02", "years", "2026"), { shopId: "demo02", year: 2026 });
  } catch (_) {
    otherDenied = true;
  }
  assert(otherDenied, "store cannot write other shop");
  console.log("PASS store-archive-isolation");

  // Cannot escalate role
  let escalateDenied = false;
  try {
    await setDoc(doc(db, "users", storeUid), { role: "admin" }, { merge: true });
  } catch (_) {
    escalateDenied = true;
  }
  // update with only role change — rules use update with diff; setDoc merge may count as full write
  try {
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", storeUid), { role: "admin" });
  } catch (_) {
    escalateDenied = true;
  }
  assert(escalateDenied, "store cannot escalate role");
  console.log("PASS no-role-escalation");

  await signOut(auth);
  try {
    await deleteUser((await signInWithEmailAndPassword(auth, email, humanPw2)).user);
  } catch (_) {}
  await deleteApp(app);
  await deleteApp(app2);
  await deleteApp(appStore);

  console.log("\nAll auth-flow tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
