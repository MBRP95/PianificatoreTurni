# Pianificatore Turni online (Firebase)

Stesso modello dei **listini smartphone**: 1 login per negozio, admin che crea/resetta le utenze, dati su Firestore.

## VPN aziendale

Login, cambio password e salvataggio archivi passano **solo da Google** (`*.googleapis.com`, `*.firebaseapp.com`) tramite **Firebase Authentication** (password umana = password Auth) + profili/archivi su Firestore.

**Non** usiamo Cloudflare Workers (`*.workers.dev`): dalla VPN quei servizi spesso non raggiungono e il browser mostra solo “Failed to fetch”. La password la verifica Firebase Auth (niente `loginKeys` pubblici).

Requisiti rete: la VPN deve lasciare passare Google/Firebase (di solito già ok se i listini online funzionano).

## 1. Crea un progetto Firebase **nuovo**

1. Vai su [console.firebase.google.com](https://console.firebase.google.com/) → **Add project**
2. Nome consigliato: `pianificatoreturni`
3. Disattiva Analytics se non ti serve
4. Nel progetto:
   - **Authentication** → Sign-in method → abilita **Email/Password**
   - **Firestore Database** → crea database (produzione), region es. `europe-west1`
   - **Authentication** → Settings → **Authorized domains** → aggiungi `mbrp95.github.io` (inclusi i path Pages: repo legacy e `PianificatoreTurni`)
5. **Project settings** → Your apps → Web app → copia la config

## 2. Config nel repo

Già impostata in `js/firebase-config.js` per il progetto `pianificatoreturni`.  
`authDomain` resta `pianificatoreturni.firebaseapp.com` (come Listino: dominio Firebase, non github.io).

## 3. Pubblica le regole Firestore (obbligatorio)

Senza questo il login dà **Missing or insufficient permissions**.

### Opzione A — Console (dal PC, subito)

1. Apri [Firestore Rules](https://console.firebase.google.com/project/pianificatoreturni/firestore/rules)
2. Cancella il testo e **incolla** l’intero file `firestore.rules` di questo repo
3. **Publish**

### Opzione B — CLI (dal PC)

Nella cartella del repo:

```bash
npm i
npx firebase login
npx firebase use pianificatoreturni
npx firebase deploy --only firestore:rules
```

Hosting su GitHub Pages è già sufficiente; il deploy `hosting` Firebase è opzionale.

## 4. Primo admin

1. https://mbrp95.github.io/Pianificatore-Turni/bootstrap-admin.html  
2. Password ≥ 10 caratteri → crea `admin`  
3. Login: https://mbrp95.github.io/Pianificatore-Turni/

Se avevi già provato il bootstrap **prima** di pubblicare le rules e aveva fallito, ripeti il bootstrap dopo il Publish.

### Stato incoerente (bootstrap “già eseguito” ma Auth vuota)

Succede se `settings/initialized` esiste in Firestore ma in Authentication non ci sono utenti.

1. Firebase Console → **Firestore → Data**
2. Elimina `settings/initialized`
3. Se presenti, elimina anche documenti orfani in `users`, `loginKeys`, `staffSecrets`
4. Riapri `bootstrap-admin.html` e crea di nuovo l’admin

Caso inverso (Auth ha `admin@pianificatore.invalid` ma Firestore è vuoto): elimina quell’utente in Authentication → Users, poi bootstrap.

## 5. Negozi

Da admin: **Crea negozio + account** (es. id `modena`, nome `Modena`)  
Nasce `store.modena` con password temporanea → al primo accesso lo store la cambia.  
Reset password: account legacy migrati dal client; account già in Auth diretta richiedono impostazione password in Console (vedi `MIGRAZIONE-AUTH-DIRETTA.md`).

## Collezioni Firestore

| Path | Uso |
|------|-----|
| `users/{uid}` | profilo (`admin` / `store`, `shopId`) |
| `shops/{shopId}` | anagrafica negozio |
| `archives/{shopId}/years/{year}` | turni / ferie / dipendenti |
| `settings/initialized` | bootstrap fatto |
| `loginKeys/*` | **legacy** — non usato; rules: read/write deny |
| `staffSecrets/*` | **legacy** — non usato; solo delete cleanup |

## Note

- L’app **locale** OneDrive resta disponibile aprendo `index.html` senza `?cloud=1`
- Online: salvataggio su Firebase; export Excel resta sul PC
