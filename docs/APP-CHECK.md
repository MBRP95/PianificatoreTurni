# Firebase App Check — valutazione (no enforcement automatico)

## Perché

App Check riduce abusivi che chiamano Firestore/Auth con la sola API key pubblica del client.

## Compatibilità GitHub Pages

- Provider tipico web: **reCAPTCHA v3** (o Enterprise)
- Dominio autorizzato: `mbrp95.github.io`
- Richiede registrazione app web nel progetto `pianificatoreturni`

## Rischi se enforcement ON troppo presto

- Blocco utenti legittimi (browser/extension/privacy tools)
- Fallimento login/salvataggio archivi
- Difficoltà da reti/VPN aziendali

## Procedura consigliata (manuale)

1. Console Firebase → App Check → registra app web (reCAPTCHA)
2. Integra SDK App Check in `js/firebase-init.js` (token provider)
3. Abilita App Check in **monitoraggio** (non enforcement) per Auth + Firestore
4. Osserva metriche (token validi vs mancanti) per alcuni giorni
5. Solo dopo: enforcement graduale

**Questa sessione non attiva enforcement.**
