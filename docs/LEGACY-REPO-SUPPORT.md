# Repository legacy — Support e dismissione

**Repo legacy:** https://github.com/MBRP95/Pianificatore-Turni  
**Questa repo clean non sostituisce la purge GitHub:** gli SHA orfani e `refs/pull/3/head` sulla legacy restano da rimuovere via Support.

## Conservare

- Backup offline pre-force (fuori da GitHub), percorso agent:  
  `/opt/cursor/privacy-work/Pianificatore-Turni-BACKUP-PRE-FORCE-*.git`
- Non pubblicare mai quel backup su GitHub.

## Segnalare a GitHub Support (legacy)

Categoria tipica: *Privacy / accidental exposure of personal data in Git history*.

Chiedere:

1. Garbage collection / purge oggetti non raggiungibili da branch/tag correnti.
2. Invalidazione di `refs/pull/3/head` (PR #3 merged) e cache commit/ZIP/API collegati.
3. Invalidazione cache `codeload` per SHA pre-rewrite ancora HTTP 200.
4. Conferma quando commit page / API / ZIP per quegli SHA rispondono 404.

Inventario tecnico e testo inglese: mantenere/aggiornare su  
https://github.com/MBRP95/Pianificatore-Turni/blob/cursor/ui-cell-menu-straordinari-3bfb/docs/GITHUB-SUPPORT-SENSITIVE-DATA-REMOVAL.md  
(o allegare l’export locale).

**Non** aprire ticket duplicati per lo stesso incidente.

## Dismissione legacy (solo dopo verifica clean)

1. Nuova repo online, Pages verificato, login smoke OK.  
2. Support ha confermato purge (o rischio residuo accettato per scritto).  
3. Opzionale: archiviare la legacy come read-only / private; **non** force-push della vecchia cronologia.  
4. Non eliminare finché il backup offline è integro.


## Stato verificato (2026-11-20T08:14Z)

Accesso **anonimo** a `MBRP95/Pianificatore-Turni` (pagina, API, ZIP, commit SHA, Pages): **404**.  
Owner: archiviata/private secondo dichiarazione operativa; eventuali refs restano rilevanti solo per purge Support / accesso autenticato.
