/**
 * Auth store/admin — Firebase Authentication diretta.
 *
 * La password umana è SOLO la password di Firebase Auth (hash lato Google).
 * Non viene scritta in Firestore. Non si usano loginKeys in lettura/scrittura.
 * Gli archivi restano su archives/{shopId}/years/{year}.
 */
(function () {
  const DOMAIN = () => window.TURNI_AUTH_EMAIL_DOMAIN || "pianificatore.invalid";
  const AUTH_MODE_DIRECT = "direct";

  function generateInitialAccountPassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-";
    const bytes = new Uint8Array(20);
    if (!window.crypto?.getRandomValues) throw new Error("Generazione password non disponibile.");
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  }

  function staffUsername(value) {
    const name = String(value || "").trim().toLowerCase();
    const suffix = "@" + DOMAIN();
    return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
  }

  function staffEmail(username) {
    const name = staffUsername(username);
    return name.includes("@") ? name : name + "@" + DOMAIN();
  }

  function assertStaffPassword(password) {
    if (typeof password !== "string" || password.length < 10 || password.length > 128) {
      throw new Error("La password deve contenere 10–128 caratteri.");
    }
  }

  async function staffPasswordAuth() {
    const api = window.firebaseApi;
    let app;
    try {
      app = api.getApp("staff-password");
    } catch (_) {
      app = api.initializeApp(api.firebaseConfig, "staff-password");
    }
    const auth2 = api.getAuth(app);
    try {
      await api.setPersistence(auth2, api.inMemoryPersistence);
    } catch (_) {}
    return auth2;
  }

  async function readStaffSecret(uid) {
    const api = window.firebaseApi;
    try {
      const snap = await api.getDoc(api.doc(api.db, "staffSecrets", uid));
      return snap.exists() ? snap.data() : null;
    } catch (_) {
      return null;
    }
  }

  /** Rimuove artefatti legacy (loginKeys / secret in staffSecrets) senza toccare users/archives. */
  async function cleanupLegacyAuthDocs(uid, secret) {
    const api = window.firebaseApi;
    if (secret?.keyId) {
      try {
        await api.deleteDoc(api.doc(api.db, "loginKeys", secret.keyId));
      } catch (_) {}
    }
    try {
      await api.deleteDoc(api.doc(api.db, "staffSecrets", uid));
    } catch (_) {}
  }

  async function setMustChangePassword(uid, value) {
    const api = window.firebaseApi;
    await api.updateDoc(api.doc(api.db, "users", uid), {
      mustChangePassword: value === true,
      updatedAt: api.serverTimestamp(),
    });
  }

  /**
   * Cambia la password Auth dell’utente già autenticato (password umana).
   * previousPassword: password Auth corrente (umana), per eventuale revert.
   */
  async function replaceOwnStaffPassword(user, username, humanPassword, previousPassword) {
    assertStaffPassword(humanPassword);
    const api = window.firebaseApi;
    const revertTo = previousPassword || null;
    await api.updatePassword(user, humanPassword);
    try {
      await user.getIdToken(true);
    } catch (_) {
      const credential = api.EmailAuthProvider.credential(user.email, humanPassword);
      await api.reauthenticateWithCredential(user, credential);
    }
    try {
      await setMustChangePassword(user.uid, false);
      const secret = await readStaffSecret(user.uid);
      await cleanupLegacyAuthDocs(user.uid, secret);
    } catch (e) {
      if (revertTo) {
        try {
          await api.updatePassword(user, revertTo);
        } catch (_) {}
      }
      throw e;
    }
  }

  /**
   * Reset password da admin.
   * - Account legacy (staffSecrets.authSecret): migra a Auth diretta con nuova password umana.
   * - Account già diretti: non si può impostare la password Auth di un altro utente dal client;
   *   restituisce istruzioni Console + marca mustChangePassword (vedi markPasswordResetPending).
   */
  async function rotateStaffPassword({ uid, username, humanPassword, mustChangePassword }) {
    assertStaffPassword(humanPassword);
    const api = window.firebaseApi;
    const secret = await readStaffSecret(uid);
    const legacySecret = secret?.authSecret && secret?.authMode !== AUTH_MODE_DIRECT ? secret.authSecret : null;

    if (legacySecret) {
      const auth2 = await staffPasswordAuth();
      let signed;
      try {
        signed = await api.signInWithEmailAndPassword(auth2, staffEmail(username), legacySecret);
      } catch (_) {
        throw new Error("Impossibile migrare l’account legacy: secret tecnico non valido. Imposta la password in Firebase Console.");
      }
      try {
        await api.updatePassword(signed.user, humanPassword);
        await setMustChangePassword(uid, mustChangePassword === true);
        await cleanupLegacyAuthDocs(uid, secret);
        return { mode: "migrated-legacy", email: staffEmail(username) };
      } catch (e) {
        try {
          await api.updatePassword(signed.user, legacySecret);
        } catch (_) {}
        throw e;
      } finally {
        try {
          await api.signOut(auth2);
        } catch (_) {}
      }
    }

    await setMustChangePassword(uid, mustChangePassword === true);
    return {
      mode: "console-required",
      email: staffEmail(username),
      temporaryPassword: humanPassword,
      message:
        "Account già in modalità Auth diretta: imposta la password temporanea in Firebase Console → Authentication → Users per " +
        staffEmail(username) +
        ", poi consegnala allo store.",
    };
  }

  /** Solo flag Firestore (dopo aver impostato la password in Console). */
  async function markPasswordResetPending(uid) {
    await setMustChangePassword(uid, true);
  }

  async function createStaffAccount({ username, role, shopId, shopName, password }) {
    assertStaffPassword(password);
    const api = window.firebaseApi;
    const normalized = staffUsername(username);
    const auth2 = await staffPasswordAuth();
    let created = null;
    try {
      // Password Auth = password umana (temporanea). Niente loginKeys / authSecret in Firestore.
      created = await api.createUserWithEmailAndPassword(auth2, staffEmail(normalized), password);
      const uid = created.user.uid;
      await api.setDoc(api.doc(api.db, "users", uid), {
        username: normalized,
        displayName: shopName || normalized,
        role,
        shopId: role === "store" ? shopId : null,
        shopName: role === "store" ? shopName : null,
        active: true,
        mustChangePassword: true,
        createdAt: api.serverTimestamp(),
        updatedAt: api.serverTimestamp(),
      });
      return uid;
    } catch (e) {
      if (created?.user) {
        try {
          await api.deleteUser(created.user);
        } catch (_) {}
        try {
          await api.deleteDoc(api.doc(api.db, "users", created.user.uid));
        } catch (_) {}
      }
      if (e?.code === "auth/email-already-in-use") throw new Error("Esiste già un account con questo username.");
      throw e;
    } finally {
      try {
        await api.signOut(auth2);
      } catch (_) {}
    }
  }

  /** Bootstrap primo admin: Auth diretta con password umana. */
  async function bootstrapAdmin(humanPassword) {
    assertStaffPassword(humanPassword);
    const api = window.firebaseApi;
    const initRef = api.doc(api.db, "settings", "initialized");
    if ((await api.getDoc(initRef)).exists()) {
      throw new Error("BOOTSTRAP_ALREADY_DONE");
    }
    const email = staffEmail("admin");
    const cred = await api.createUserWithEmailAndPassword(api.auth, email, humanPassword);
    const uid = cred.user.uid;
    try {
      await api.setDoc(api.doc(api.db, "users", uid), {
        username: "admin",
        displayName: "Amministratore",
        role: "admin",
        shopId: null,
        shopName: null,
        active: true,
        mustChangePassword: true,
        createdAt: api.serverTimestamp(),
        updatedAt: api.serverTimestamp(),
      });
      await api.setDoc(initRef, { at: api.serverTimestamp(), by: "bootstrap-admin", authMode: AUTH_MODE_DIRECT });
    } catch (e) {
      try {
        await api.deleteUser(cred.user);
      } catch (_) {}
      throw e;
    }
    await api.signOut(api.auth);
    return uid;
  }

  async function loginWithUsernamePassword(username, password) {
    const api = window.firebaseApi;
    if (!api) throw new Error("Firebase non pronto.");
    const normalized = staffUsername(username);
    const email = staffEmail(normalized);

    let credential;
    try {
      // Verifica credenziali solo tramite Firebase Auth (rate-limit / anti-bruteforce lato Google).
      credential = await api.signInWithEmailAndPassword(api.auth, email, password);
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password") {
        throw new Error("Username o password non corretti.");
      }
      throw e;
    }
    try {
      await credential.user.getIdToken(true);
    } catch (_) {}
    if (typeof api.auth.authStateReady === "function") {
      try {
        await api.auth.authStateReady();
      } catch (_) {}
    }

    let profileSnap;
    try {
      profileSnap = await api.getDoc(api.doc(api.db, "users", credential.user.uid));
    } catch (e) {
      if (e?.code === "permission-denied") {
        try {
          await credential.user.getIdToken(true);
          profileSnap = await api.getDoc(api.doc(api.db, "users", credential.user.uid));
        } catch (e2) {
          throw new Error(
            "Auth ok ma lettura users negata (sessione interrotta a metà login). Hard refresh e riprova; se persiste apri diagnostics.html."
          );
        }
      } else {
        throw e;
      }
    }
    if (!profileSnap.exists()) throw new Error("Profilo utente non configurato in Firestore.");
    const profile = { ...profileSnap.data(), uid: credential.user.uid };
    if (profile.active !== true) throw new Error("Account disattivato. Contatta l’amministratore.");
    if (!["admin", "store"].includes(profile.role)) throw new Error("Ruolo utente non valido.");
    if (String(profile.username || "").toLowerCase() !== normalized) {
      throw new Error("Username o password non corretti.");
    }

    // Pulizia best-effort dei doc legacy dopo login diretto riuscito.
    try {
      const secret = await readStaffSecret(credential.user.uid);
      if (secret?.authSecret || secret?.keyId) {
        await cleanupLegacyAuthDocs(credential.user.uid, secret);
      }
    } catch (_) {}

    const forcePasswordChange = profile.mustChangePassword === true;
    return {
      user: credential.user,
      profile,
      firebasePassword: password,
      forcePasswordChange,
      usedKey: false,
      authMode: AUTH_MODE_DIRECT,
    };
  }

  async function loadArchive(shopId, year) {
    const api = window.firebaseApi;
    const snap = await api.getDoc(api.doc(api.db, "archives", shopId, "years", String(year)));
    return snap.exists() ? snap.data() : null;
  }

  async function saveArchive(shopId, year, payload) {
    const api = window.firebaseApi;
    const clean = JSON.parse(JSON.stringify(payload));
    clean.shopId = shopId;
    clean.year = Number(year);
    clean.updatedAt = new Date().toISOString();
    await api.setDoc(api.doc(api.db, "archives", shopId, "years", String(year)), {
      ...clean,
      savedAt: api.serverTimestamp(),
    });
  }

  window.TurniAuth = {
    generateInitialAccountPassword,
    staffUsername,
    staffEmail,
    assertStaffPassword,
    createStaffAccount,
    bootstrapAdmin,
    replaceOwnStaffPassword,
    rotateStaffPassword,
    markPasswordResetPending,
    readStaffSecret,
    loginWithUsernamePassword,
    loadArchive,
    saveArchive,
    AUTH_MODE_DIRECT,
  };
})();
