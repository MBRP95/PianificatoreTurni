# Bonifica archivi Firebase (manuale — nessuna credenziale in questo ambiente)

## Limite

L’agent Cloud **non** ha accesso al progetto Firebase di produzione.  
Nessuna cancellazione/modifica produzione è stata eseguita da qui.

## Backup protetto (obbligatorio prima di qualsiasi scrub)

1. Firebase Console → Firestore → Import/Export → Export in bucket GCS privato
2. Oppure Admin SDK: dump JSON di `archives/**` in storage cifrato/offline
3. Verifica recupero: reimport di un documento di test su progetto staging

## Cosa conservare / anonimizzare / eliminare

| Dato | Azione |
|------|--------|
| Struttura `archives/{shopId}/years/{year}` | Conservare |
| `shopId`, anno, turni necessari al lavoro | Conservare se legittimi e autorizzati |
| Nominativi reali nei seed/demo residui | Anonimizzare → fittizi |
| Note sanitarie/familiari non necessarie | Eliminare o generalizzare |
| CF, telefoni, terzi | Eliminare |
| `loginKeys`, `staffSecrets` con secret legacy | Eliminare dopo migrazione Auth (vedi MIGRAZIONE-AUTH-DIRETTA.md) |
| `users` / `shops` | Conservare (username tecnici, no PII dipendenti) |

## Procedura di scrub mirato (Admin SDK, sul tuo PC)

```javascript
// Pseudocodice — eseguire in locale con service account; NON committare chiavi
// Per ogni archives/{shopId}/years/{year}:
//   1. Export doc → backup
//   2. Sostituisci people[].name / note con valori sintetici se sono reali
//   3. Rimuovi campi telefono/CF/note familiari
//   4. Write-back solo dopo review umana del diff
```

Non fare delete indiscriminato di `archives`.

## Protezione accessi (già nel tip)

- Rules: negozio legge/scrive solo il proprio `shopId`
- Unauth: deny
- `loginKeys` read: deny (chiude oracolo password)
- Ruolo/shopId non modificabili dallo store

Deploy rules: `firebase deploy --only firestore:rules` (da fare tu, dopo migrazione account).
