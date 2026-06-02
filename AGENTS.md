# AGENTS.md

Dette prosjektet er en norsk undervisningsapp for kabelberegning, bygget med Vite, React og vanlig CSS. Målet er at Codex skal jobbe som en praktisk, ryddig samarbeidspartner: forstå prosjektet først, gjøre små trygge endringer, forklare kort, og holde appen enkel å bruke for elever/lærlinger.

## Hvordan du skal samarbeide med meg

- Svar gjerne på norsk når jeg skriver norsk, og bruk en varm, uformell tone.
- Vær proaktiv når oppgaven er tydelig: undersøk, endre, test og oppsummer.
- Hvis noe er uklart, still ett konkret spørsmål i stedet for mange.
- Forklar valg kort og praktisk. Jeg liker å forstå hva som skjer, men trenger ikke lange foredrag.
- Si tydelig fra når noe kan påvirke faglig riktighet, sikkerhet eller beregningslogikk.
- Ikke lat som du er sikker på elektrofaglige regler hvis du ikke er det. Marker antakelser og foreslå kontroll mot gjeldende norm/kilde.

## Prosjektoversikt

- Appen ligger hovedsakelig i `src/App.jsx`.
- Styling ligger i `src/App.css`.
- Entry point er `src/main.jsx`.
- Bygg kjøres med `npm run build`.
- Devserver kjøres med `npm run dev`.
- Produksjonsoutput er `dist`.

## Arbeidsstil i dette repoet

- Les relevante filer før du endrer kode.
- Hold endringer små og fokusert på brukerens oppgave.
- Bevar eksisterende struktur med enkle React-komponenter og lokal state, med mindre en større refaktor faktisk trengs.
- Ikke innfør nye biblioteker uten god grunn.
- Bruk `lucide-react` for ikoner når det trengs.
- Ikke endre `dist` manuelt. Endre kildefilene i `src`, og bygg ved behov.
- Ikke rør `node_modules`.
- Ikke gjør store designendringer når oppgaven handler om beregning eller tekst.

## Språk, tekst og encoding

- Bruk norsk bokmål i UI-tekst, hjelpetekster og dokumentasjon.
- Vær ekstra forsiktig med norske tegn: æ, ø, å, ≤, ×, √, mm².
- Hvis du ser tekst som `pÃ¥`, `strÃ¸m` eller `â‰¤`, behandle det som encoding-feil og fiks bare når det er relevant for oppgaven.
- Bevar faguttrykk som `IB`, `IN`, `IZ`, `I2`, `Kt`, `Kn`, `forlegningsmåte`, `tverrsnitt` og `strømføringsevne`.
- UI-tekst skal være kort, direkte og nyttig for undervisning.

## Faglig forsiktighet

- Denne appen er merket som undervisningsapp. Ikke presenter resultatene som autoritativ prosjektering.
- Ved endringer i beregningsregler skal du være konservativ og forklare hva som endres.
- Ikke gjett nye krav fra NEK, Montørhåndboka eller andre kilder uten å si at det må verifiseres.
- Når beregningslogikk endres, vurder om `kabelBeregningTester` bør oppdateres eller utvides.

## Frontend og UX

- Første skjerm skal være selve verktøyet, ikke en landingsside.
- Prioriter tydelig steg-for-steg-flyt og enkel lesbarhet.
- Unngå pynt som gjør skjemaet mindre oversiktlig.
- Sørg for at knapper, inputfelt og hjelpetekster fungerer på mobil.
- Ikke legg inn lange forklaringer direkte i hovedflyten hvis de passer bedre i hjelpepanelet.

## Testing og verifisering

- Kjør `npm run build` etter kodeendringer når det er praktisk.
- For ren dokumentasjonsendring er build normalt ikke nødvendig.
- Hvis beregningslogikk endres, sjekk både eksisterende testdata og relevante manuelle eksempler.
- Oppsummer hva som er verifisert, og si fra hvis noe ikke ble kjørt.

## Git og filer

- Ikke revert endringer du ikke selv har gjort.
- Ikke slett filer eller flytt store mapper uten eksplisitt beskjed.
- Hold `package-lock.json` stabil med mindre avhengigheter faktisk endres.
- `.gitignore`, Vercel-oppsett og README skal bare endres når oppgaven berører dem.

## Når du er ferdig

Gi en kort oppsummering:

- hva som ble endret
- hvilke filer som ble berørt
- hva som ble testet eller hvorfor test ikke var nødvendig

Hold det konkret og menneskelig.
