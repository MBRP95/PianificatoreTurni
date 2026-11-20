# Nuova repository pulita — Pianificatore Turni

**Repository nuova:** https://github.com/MBRP95/PianificatoreTurni  
**Repository originale (non eliminata):** https://github.com/MBRP95/Pianificatore-Turni  
**Sito originale (ancora attivo finché il nuovo non è verificato):** https://mbrp95.github.io/Pianificatore-Turni/  
**Sito nuovo (dopo GitHub Pages):** https://mbrp95.github.io/PianificatoreTurni/

## Obiettivo

Copia operativa del progetto con **cronologia Git nuova** (un solo commit iniziale), senza importare oggetti, branch, tag o PR della repository originale.

## Fonte

Solo il tip bonificato del branch Pages originale:

- `MBRP95/Pianificatore-Turni` → `cursor/ui-cell-menu-straordinari-3bfb` @ `52e1628bed90b7b0bdaf93e31a32dfa511a50dd8`

Non sono stati usati backup pre-force, SHA orfani, ZIP per commit storici, né altri branch.

## File trasferiti

| Area | Path |
|------|------|
| App HTML | `index.html`, `bootstrap-admin.html`, `diagnostics.html`, `piano_ferie_par_modena_2026.html`, `planner/`, `online/`, `favicon.svg` |
| JS | `js/` (`auth.js`, `firebase-config.js`, `firebase-config.example.js`, `firebase-init.js`) |
| Firebase | `.firebaserc`, `firebase.json`, `firestore.rules` |
| Vendor | `vendor/exceljs.min.js` |
| Samples sintetici | `samples/**` (xlsx + archivio Verona demo) |
| Manuale | `manuale/**` |
| Script | `scripts/build_verona_archive.py`, `scripts/security/**` |
| Docs operative | `APP-CHECK.md`, `ONLINE-FIREBASE.md`, `MIGRAZIONE-AUTH-DIRETTA.md`, `FIREBASE-BONIFICA-ARCHIVI.md`, `PRIVACY-SECURITY-BONIFICA.md`, questo file, `RAPPORTO-PRIVACY-FINALE.md`, `LEGACY-REPO-SUPPORT.md` |
| Meta | `README.md`, `.gitignore` |

## File esclusi

| Esclusione | Motivo |
|------------|--------|
| `.git/` / cronologia originale | Evitare oggetti contaminati |
| `dist/verona-2026.zip` | Artefatto rigenerabile da `samples/` |
| `docs/FASE2-*.md` | Report storici di fase |
| `docs/FORCE-PUSH-HISTORY-PLAYBOOK.md` | Operazioni sulla repo legacy |
| `docs/GIT-HISTORY-REWRITE.md` | Operazioni sulla repo legacy |
| Backup offline agent | Restano **fuori** da GitHub |
| Token / password / secret | Non presenti nei file selezionati |

## Commit iniziale

- Branch: `main`
- Unico commit su `main` (verificare: `git rev-parse origin/main`)
- Un solo commit (tree selezionato sopra)
- Nessun parent, nessun rewrite, nessun `git filter-repo` sulla nuova repo
- Verifica post-push: ZIP `codeload…/zip/refs/heads/main` → **0** marker; SHA legacy `866c455…` **non** presente in questa repo

## GitHub Pages

Attivazione API da agent: **403** (permesso Pages non nel token).  
Passo owner (1 minuto):

1. Apri https://github.com/MBRP95/PianificatoreTurni/settings/pages  
2. Source → **Deploy from a branch**  
3. Branch **main** / folder **/ (root)** → Save  
4. Attendi build → https://mbrp95.github.io/PianificatoreTurni/  
5. In Firebase Console → Authentication → Authorized domains → assicurati che `mbrp95.github.io` sia presente (vale per entrambi i path Pages)


## Firebase

- Progetto invariato: **`pianificatoreturni`**
- Config pubblica in `js/firebase-config.js` (stesso progetto)
- Auth diretta (`bootstrapAdmin`); client senza uso di `loginKeys` come oracolo
- `firestore.rules` incluso com’è sul tip bonificato
- **Nessuna** modifica a dati, account o password in cloud

## Test pre-push (locale)

| Test | Esito |
|------|--------|
| Scan marker PII (testo + xlsx/zip) | 0 hit |
| `scripts/security/verify-no-pii.sh HEAD` | PASS (dopo commit) |
| Assenza pattern secret/private key nei sorgenti | OK |
| `staffLoginKeyId` nel client | assente |
| Emulator rules / auth-flow | vedi log sessione (se emulator disponibile) |

## Pubblicazione GitHub Pages (dopo verifica push)

1. Settings → Pages → Source: Deploy from branch  
2. Branch: `main` / root  
3. Verificare URL nuovo  
4. Solo dopo smoke test, valutare redirect/dismissione del sito vecchio  

## Vecchia repository

Non eliminata. Gli oggetti orfani / `refs/pull/3/head` restano un problema **separato** da chiedere a GitHub Support — vedi `docs/LEGACY-REPO-SUPPORT.md`.

## Problemi residui

- Repo creata dall’owner: `MBRP95/PianificatoreTurni` (pubblica, tree pushato).
- Attivazione GitHub Pages: **manuale** (API 403 sul token agent).
- Finché Pages nuovo non è verificato, il sito originale resta la fonte pubblica operativa.
- La nuova repo **non** rimuove i dati residui dalla vecchia.


## Aggiornamento post-rinomina (2026-11-20T08:14Z)

| Voce | Stato verificato |
|------|------------------|
| Repo operativa | https://github.com/MBRP95/PianificatoreTurni (ex PianificatoreTurniOnline) |
| Pages | https://mbrp95.github.io/PianificatoreTurni/ — **built** @ tip `main` |
| Scan Pages (marker noti) | **0** hit su risorse crawlate |
| ZIP `main` | **0** marker |
| Vecchio Pages `…/Pianificatore-Turni/` | **404** pubblico |
| Vecchio Pages `…/PianificatoreTurniOnline/` | **404** |
| Repo legacy `MBRP95/Pianificatore-Turni` (anon/API/codeload) | **404** — non più pubblica |
| Firebase | `pianificatoreturni` invariato; probe unauth **PASS** |

La legacy resta eventualmente accessibile solo con credenziali owner (git privato): non è più scaricabile anonimamente. La purge Support degli oggetti interni resta consigliata se si vuole eliminare anche l’accessibilità autenticata/cache GitHub.
