# Migrazione ad Auth diretta (senza loginKeys pubblici)

## Perché

Il vecchio login leggeva `loginKeys/{SHA-256(username\\npassword)}` con `get` pubblico.  
Chi provava password candidate poteva verificare gli hash (oracolo).

Nuovo modello:

- Password umana = password **Firebase Authentication** (hash solo lato Google)
- Nessuna password umana in Firestore
- `loginKeys` / `staffSecrets.authSecret` non più usati dal client; rules negano lettura/scrittura

## Impatto sugli account esistenti

Gli account creati col modello legacy hanno:

- Password Auth = secret tecnico
- Mapping in `loginKeys` (password umana → secret)

Con le nuove rules **non possono più entrare** con la sola password umana finché non migrati.

Gli **archivi** (`archives/{shopId}/years/{year}`) **non** dipendono dalla password e restano intatti.

## Procedura (senza reset massivo automatico)

Esegui **un account alla volta** (pilota → resto).

### Opzione A — Firebase Console (tutti gli account)

1. Console → Authentication → Users
2. Per ogni utente (`admin@…`, `store.…@…`): imposta una password temporanea (≥10)
3. Comunica la password fuori banda
4. Console → Firestore → `users/{uid}`: `mustChangePassword = true` (se non già true)
5. L’utente accede al sito aggiornato e cambia password al primo login

### Opzione B — Account ancora legacy con `staffSecrets.authSecret`

Se sei già loggato come admin sul sito **nuovo** e il documento `staffSecrets/{uid}` esiste ancora:

1. Admin → Reset password sul negozio
2. Se l’account è legacy, il client migra Auth alla password temporanea e cancella loginKeys/staffSecrets
3. Se l’account è già diretto, segui le istruzioni Console mostrate in UI

### Opzione C — Solo flag dopo Console

Dopo aver impostato la password in Console, da admin UI il reset in modalità `console-required` marca già `mustChangePassword`.

## Ordine di rilascio consigliato

1. Backup Auth/Firestore (export)
2. Migra almeno admin + un negozio pilota (Console)
3. Pubblica codice + rules
4. Verifica login pilota
5. Migra i restanti store
6. (Opzionale) Elimina documenti orfani `loginKeys` / `staffSecrets` come admin

## Verifica post-migrazione

- `diagnostics.html`: login OK; get `loginKeys` negato
- Nessun documento nuovo in `loginKeys`
- Login store A non vede archivi store B
