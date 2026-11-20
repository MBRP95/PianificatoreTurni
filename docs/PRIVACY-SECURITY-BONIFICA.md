# Bonifica privacy e sicurezza — Pianificatore Turni

Report operativo della bonifica sul branch `cursor/privacy-security-bonifica-3bfb`.

## 1. Dati personali individuati (prima)

- Nominativi reali Modena in seed HTML (`planner/index.html`, `piano_ferie_par_modena_2026.html`): turni, ferie/PAR, malattie, allattamento.
- Nominativi reali Verona in `samples/archivi/verona-2026/...json`, Excel Giallo/Rosso, `dist/verona-2026.zip`.
- Excel Modena/HR: nomi, note sanitarie/familiari, telefono.
- Excel Verona Rosso: codice fiscale, note con terzi.
- Riferimenti hard-coded a persone reali in script/commenti.

Manuale Demo Store (Luca Bianchi, …): già fittizio — lasciato.

## 2. File bonificati

- `planner/index.html`, `piano_ferie_par_modena_2026.html` (seed → nomi fittizi)
- `samples/archivi/verona-2026/dati/turni/pianificatore-turni-2026.json`
- `dist/verona-2026.zip` (rigenerato)
- `samples/Turni_MODENA_2026.xlsx`, `samples/Turni_HR.xlsx`
- `samples/excel/Turni_Verona_*.xlsx`
- `scripts/build_verona_archive.py`
- `js/auth.js`, `firestore.rules`, prompt password in `index.html` / `bootstrap-admin.html` / docs

## 3. Dati ancora presenti e motivazione

- Nomi **fittizi** di demo (Giulia Ferrari, Chiara Romano, Marco Blu, …) e Demo Store: necessari al funzionamento seed/manuale.
- Tipologie assenza generiche (MALATTIA, CONGEDO, ALLATT) su dati sintetici: strutturali al dominio, non riconducibili a persone reali dopo la sostituzione.
- Config Firebase client (`apiKey` pubblica): normale per web SDK; protezione dati = regole Firestore.
- Archivi **Firestore produzione** (se già caricati con nomi reali): non toccati (divieto dati produzione).

## 4. Vulnerabilità di sicurezza

1. **Critica (corretta):** `replaceOwnStaffPassword` salvava la password umana in `loginKeys.authSecret` / `staffSecrets` e come password Firebase.
2. **Media (mitigata):** `loginKeys` leggibile con `get` pubblico se si conosce `SHA-256(username\\npassword)` — necessario al login; rischio dizionario se password deboli. Mitigazioni: secret tecnico ≥16 char, password umana min 10, no list.
3. **Residua:** admin può leggere `staffSecrets` (necessario al reset). Separazione negozi `archives/{shopId}` già vincolata a `shopId` profilo.

## 5. Correzioni implementate

- Password umana non più persistita: sempre `authSecret` tecnico casuale.
- Regole: `authSecret` size ≥ 16.
- Password umana: minimo 10 caratteri.
- Seed/samples: sostituzione nominativi e scrub note/CF/telefono.

## 6. Verifiche

- Grep testo + sharedStrings Excel: nessun cognome reale noto.
- `new Function` sul JS planner: OK.
- Manuale Demo Store invariato (già fittizio).

## 7. Cronologia Git

I cognomi reali restano in **commit storici** su `main`, `cursor/ui-cell-menu-straordinari-3bfb` (GitHub Pages), `cursor/firebase-online-auth-3bfb` e cloni/fork.

## 8. Operazioni manuali necessarie

1. Merge/push di questo branch e aggiornare il branch di GitHub Pages.
2. Deploy regole: `firebase deploy --only firestore:rules`.
3. Far **cambiare password** a tutti gli account store/admin già creati (per rigenerare secret tecnici).
4. Controllare/pulire archivi Firestore già salvati se contengono nomi reali.
5. Bonifica cronologia (opzionale ma consigliata): `git filter-repo` / BFG + force-push coordinato; invalidare cache Pages; chiedere a chi ha clonato di cancellare le copie.

## 9. Rischi residui

- Storia Git e mirror pubblici fino a rewrite.
- Firestore produzione non scandito da questo ambiente.
- Attacco a dizionario su username prevedibili (`store.*`) se password deboli.
- API key Firebase pubblica (attesa; difesa = rules + App Check consigliato in seguito).
