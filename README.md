# Håndsopprekking

Egen app for klasseromskø.

## Lokal utvikling

```bash
npm install
npm run dev
```

## Lærerinnlogging

```text
brukernavn: hamstr
passord: lokna
```

Lærerinnlogging åpnes ved å dobbeltklikke på overskriften `Kø` i elevvisningen.

## Database på Vercel

Vercel har ikke en vanlig fil-database som kan brukes trygt til dette. Appen bruker derfor Upstash Redis via Vercel API-ruter.

Spam-sperre er aktiv: samme elevnavn kan ikke stå i aktiv kø mer enn én gang. Hvis samme elev prøver igjen, får eleven popup med `fy!`.

Lag en Redis-database i Upstash, og legg inn disse miljøvariablene i Vercel:

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
TEACHER_USERNAME=hamstr
TEACHER_PASSWORD=lokna
```

`TEACHER_USERNAME` og `TEACHER_PASSWORD` er valgfrie. Hvis de ikke settes, brukes verdiene over.

## Deploy til Vercel

1. Legg denne mappen i et GitHub-repo.
2. Opprett nytt Vercel-prosjekt.
3. Velg prosjektmappen `handsopprekking-app` som root directory hvis repoet også inneholder andre filer.
4. Sett miljøvariablene over.
5. Deploy.

Etter deploy kan domenet kobles til `lokna.vercel.app` i Vercel.
