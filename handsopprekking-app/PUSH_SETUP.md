# Pushvarsler og Android-app

## 1. Generer VAPID-nøkler

Kjør dette lokalt i en terminal:

```powershell
node -e "const crypto=require('crypto');const ecdh=crypto.createECDH('prime256v1');ecdh.generateKeys();const b=(x)=>x.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');console.log('VAPID_PUBLIC_KEY='+b(ecdh.getPublicKey()));console.log('VAPID_PRIVATE_KEY='+b(ecdh.getPrivateKey()));console.log('VAPID_SUBJECT=mailto:din-epost@example.com');"
```

## 2. Legg inn Environment Variables i Vercel

Legg inn disse i prosjektet på Vercel:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:din-epost@example.com
```

Appen trenger også eksisterende Redis-variabler:

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Redeploy etter at variablene er lagt inn.

## 3. Aktiver varsler på Android

1. Åpne `https://lokna.vercell.app` på Android.
2. Logg inn som lærer.
3. Gå til `Menyvalg`.
4. Trykk `Aktiver varsler`.
5. Godkjenn varselspørsmålet på mobilen.

Når en elev legger seg i håndsopprekkingskø, sender API-et pushvarsel til lærer-enheter som har aktivert varsler.

## 4. Legg appen på hjemskjermen

Åpne siden i Chrome/Vivaldi på Android og velg `Legg til på startsiden`.
