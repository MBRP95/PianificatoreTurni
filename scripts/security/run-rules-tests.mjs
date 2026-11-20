/**
 * Esegue i casi in firestore-rules.cases.json contro l'emulatore Firestore.
 *
 * Prerequisiti (una tantum sul PC):
 *   npm i -D firebase @firebase/rules-unit-testing
 *   java -version   # richiesto dall'emulatore
 *   npx firebase setup:emulators:firestore
 *
 * Avvio:
 *   npx firebase emulators:exec --only firestore \
 *     "node scripts/security/run-rules-tests.mjs"
 *
 * Non usa dati personali reali.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const casesPath = resolve(__dirname, "firestore-rules.cases.json");
const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");
const suite = JSON.parse(readFileSync(casesPath, "utf8"));

const projectId = suite.projectId || "pianificatoreturni-rules-test";

async function seed(env) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [id, data] of Object.entries(suite.fixtures.users)) {
      await setDoc(doc(db, "users", id), data);
    }
    for (const [id, data] of Object.entries(suite.fixtures.shops || {})) {
      await setDoc(doc(db, "shops", id), data);
    }
    for (const [id, data] of Object.entries(suite.fixtures.loginKeys || {})) {
      await setDoc(doc(db, "loginKeys", id), data);
    }
    for (const [id, data] of Object.entries(suite.fixtures.staffSecrets || {})) {
      await setDoc(doc(db, "staffSecrets", id), data);
    }
    await setDoc(doc(db, "settings", "initialized"), { ok: true });
    await setDoc(doc(db, "archives", "demo01", "years", "2026"), {
      shopId: "demo01",
      year: 2026,
      people: [],
      turni: {},
    });
    await setDoc(doc(db, "archives", "demo02", "years", "2026"), {
      shopId: "demo02",
      year: 2026,
      people: [],
      turni: {},
    });
  });
}

function dbFor(env, authUid) {
  if (!authUid) return env.unauthenticatedContext().firestore();
  return env.authenticatedContext(authUid).firestore();
}

async function runCase(env, c) {
  const db = dbFor(env, c.auth);
  const pathParts = c.path.split("/");
  let op;
  if (c.op === "get") {
    op = getDoc(doc(db, ...pathParts));
  } else if (c.op === "set") {
    op = setDoc(doc(db, ...pathParts), c.data || {});
  } else if (c.op === "update") {
    op = updateDoc(doc(db, ...pathParts), c.data || {});
  } else if (c.op === "list") {
    op = getDocs(collection(db, ...pathParts));
  } else {
    throw new Error(`Unsupported op ${c.op}`);
  }
  if (c.expect === "allow") await assertSucceeds(op);
  else await assertFails(op);
}

async function main() {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules, host: "127.0.0.1", port: 8080 },
  });
  try {
    await seed(env);
    let failed = 0;
    for (const c of suite.cases) {
      try {
        await runCase(env, c);
        console.log("PASS", c.id);
      } catch (e) {
        failed++;
        console.error("FAIL", c.id, e.message || e);
      }
    }
    if (failed) {
      console.error(`\n${failed} test(s) failed`);
      process.exit(1);
    }
    console.log(`\nAll ${suite.cases.length} tests passed`);
  } finally {
    await env.cleanup();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
