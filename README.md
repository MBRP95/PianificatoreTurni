# Pianificatore Turni (Clean)

Versione operativa **senza cronologia Git importata** dalla repository originale.

- **Repo:** https://github.com/MBRP95/PianificatoreTurni  
- **Pages (dopo attivazione):** https://mbrp95.github.io/PianificatoreTurni/  
- **Firebase:** progetto esistente `pianificatoreturni` (nessun DB nuovo)

La repository legacy `MBRP95/Pianificatore-Turni` è stata messa in private/archiviata; questo è il sito pubblico operativo.  
Vedi `docs/NUOVA-REPOSITORY-PULITA.md`.

## Online

1. Apri il login su GitHub Pages (URL sopra).  
2. Auth Firebase: password umana = password Auth (niente `loginKeys` pubblici).  
3. Manuale store: [`manuale/`](manuale/) · PDF in `manuale/Pianificatore-Turni-manuale-store.pdf`

Dettagli: [`docs/ONLINE-FIREBASE.md`](docs/ONLINE-FIREBASE.md).

## Locale (OneDrive)

1. Apri `planner/index.html` in Chrome/Edge  
   (oppure: `python3 -m http.server 8765` → `http://127.0.0.1:8765/planner/`)
2. Seleziona la cartella OneDrive dell’archivio e carica

Serve `vendor/exceljs.min.js` (inclusa) per Excel.

## Contenuto

| Path | Ruolo |
|------|--------|
| `index.html` | Login online (Firebase) |
| `planner/index.html` | Pianificatore |
| `samples/` | Demo sintetici (xlsx + archivio Verona) |
| `firestore.rules` | Regole Firestore |
| `scripts/security/` | Probe, rules tests, `verify-no-pii.sh` |

## Privacy

- Tree verificato senza marker PII noti prima del commit iniziale.  
- Non pubblicare backup offline.  
- Per la purge della repo legacy: `docs/LEGACY-REPO-SUPPORT.md`.
