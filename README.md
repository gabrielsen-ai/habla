# Habla - Spanish Speech-to-Text MVP 🎤🇪🇸

En MVP app der brukeren snakker, appen lytter og skriver spesifikt det brukeren sa på spansk.

## 🚀 Hva er implementert

### ✅ Funksjonalitet
- **Mikrofon opptak** - Bruker MediaRecorder API for å ta opp lyd fra mikrofon
- **Google Cloud Speech-to-Text** - Sender audio til Google Cloud for nøyaktig spansk tale-gjenkjenning
- **Spansk språk** - Konfigurert for `es-ES` (spansk fra Spania) med støtte for `es-MX` og `es-AR`
- **Real-time feedback** - Viser transkripsjon umiddelbart etter opptak
- **Voice Orb UI** - Intuitiv press-and-hold interface

### 🏗️ Arkitektur

```
Frontend (Next.js)              Backend API                    Google Cloud
┌─────────────────┐            ┌──────────────┐              ┌──────────┐
│                 │            │              │              │          │
│  MediaRecorder  │──WebM──▶   │ /api/        │──Audio+──▶   │ Speech   │
│  (Mikrofon)     │            │ transcribe   │  Config      │ API      │
│                 │◀──JSON───  │              │◀──Text───────│          │
└─────────────────┘            └──────────────┘              └──────────┘
```

## 📁 Filstruktur

```
habla/
├── google-credentials.json          # Google Cloud service account (IKKE commit!)
├── .env.local                       # Environment variabler
├── .gitignore                       # Beskytter credentials
├── package.json                     # Next.js dependencies
├── next.config.mjs                  # Next.js konfigurasjon
└── app/
    ├── api/
    │   ├── transcribe/
    │   │   └── route.js             # Backend API for Speech-to-Text
    │   └── tts/
    │       └── route.js             # Backend API for Text-to-Speech
    ├── components/
    │   ├── VoiceOrbPage.js          # Hovedkomponent med audio recording
    │   └── LearningPath.js          # Learning path UI
    └── page.js                      # Hovedside
```

## 🔧 Setup (Allerede gjort!)

### 1. Google Cloud Credentials ✅
- Service account opprettet: `habla-voice-sa@habla-483915.iam.gserviceaccount.com`
- Credentials lagret i: `/Users/nikolaigabrielsen/habla/google-credentials.json`
- Project ID: `habla-483915`

### 2. Dependencies ✅
```bash
npm install @google-cloud/speech  # Installert i frontend/
```

### 3. Environment Variables ✅
Opprettet `.env.local` med:
- `GOOGLE_CLOUD_PROJECT_ID=habla-483915`
- `GOOGLE_APPLICATION_CREDENTIALS=../google-credentials.json`
- `SPEECH_LANGUAGE_CODE=es-ES`

## 🎯 Hvordan bruke appen

### Start serveren
```bash
npm run dev
```

Åpne: **http://localhost:3000**

### Bruk voice orb
1. **Hold inne** på den store orb-knappen
2. **Snakk på spansk** (f.eks. "Hola, ¿cómo estás?")
3. **Slipp** knappen
4. Appen sender audio til Google Cloud
5. Transkripsjon vises på skjermen! 🎉

### Avbryt opptak
- Dra fingeren/musen **bort fra orb** mens du holder inne
- Slipp når det står "Release to cancel"

## 🔍 Testing

### Test at alt fungerer:
1. Åpne http://localhost:3000
2. Åpne browser console (F12)
3. Hold inne orb-knappen
4. Si noe på spansk
5. Slipp knappen
6. Se i console:
   - `🎤 Recording started`
   - `📤 Stopping recording and sending audio...`
   - `🎵 Audio blob size: XXXX bytes`
   - `✅ Transcription received: [din tekst]`

### Eksempel på hva du kan si:
- "Hola, me llamo [navn]"
- "¿Cómo estás?"
- "Buenos días"
- "Quiero aprender español"

## 🛠️ Teknisk detaljer

### Audio Format
- **Format**: WebM med Opus codec
- **Sample rate**: 48kHz
- **Channels**: Mono (1 kanal)
- **Encoding**: WEBM_OPUS

### Google Cloud Config
```javascript
{
  encoding: 'WEBM_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'es-ES',
  alternativeLanguageCodes: ['es-MX', 'es-AR'],
  model: 'latest_long',
  enableAutomaticPunctuation: true,
  useEnhanced: true
}
```

### API Endpoint
**POST** `/api/transcribe`
- **Input**: FormData med audio file (WebM)
- **Output**: JSON med transcription

```json
{
  "success": true,
  "transcription": "Hola, ¿cómo estás?",
  "language": "es-ES",
  "confidence": 0.95
}
```

## 🚨 Viktig sikkerhet

### ⚠️ ALDRI commit disse filene:
- ❌ `google-credentials.json`
- ❌ `.env.local`
- ❌ `*.json.key`

Disse er allerede lagt til i `.gitignore` ✅

## 🐛 Feilsøking

### "Microphone needed" error
- Gi browser tilgang til mikrofon
- Sjekk at du bruker HTTPS eller localhost

### "Speech recognition failed"
- Sjekk at Google Cloud Speech-to-Text API er aktivert
- Verifiser at credentials er riktig
- Se i browser console for detaljer

### Ingen lyd blir tatt opp
- Sjekk at mikrofonen fungerer
- Test i Chrome/Edge (best støtte for MediaRecorder)
- Se i console: `🎵 Audio blob size` skal være > 0

### API error 500
- Sjekk at `google-credentials.json` eksisterer
- Verifiser at path i `.env.local` er riktig
- Sjekk at Speech-to-Text API er aktivert i Google Cloud Console

## 📊 Google Cloud Pricing

**Gratis tier**: 60 minutter/måned
**Deretter**: ~$0.006 per 15 sekunder

For testing er dette helt gratis! 🎉

## 🔜 Neste steg (TODO)

- [ ] Legg til AI conversation response (OpenAI/Gemini)
- [ ] Implementer Text-to-Speech for AI svar
- [ ] Legg til "Strict coach" mode med grammatikksjekk
- [ ] Lagre conversation history
- [ ] Legg til forskjellige spanske dialekter

## 🚀 Deploy til Vercel

### Steg 1: Forbered prosjektet
Prosjektet er nå klart for Vercel deployment! Alle nødvendige konfigurasjoner er på plass:
- ✅ `vercel.json` konfigurasjon
- ✅ `.gitignore` filer
- ✅ API-ruter bruker miljøvariabler

### Steg 2: Koble til Vercel
1. Gå til [vercel.com](https://vercel.com) og logg inn
2. Klikk "Add New Project"
3. Importer GitHub repository
4. Vercel vil automatisk detektere Next.js prosjektet

### Steg 3: Sett miljøvariabler i Vercel
**VIKTIG**: Du MÅ sette opp disse miljøvariablene i Vercel:

1. Gå til Project Settings → Environment Variables
2. Legg til følgende variabler:

**GOOGLE_CLOUD_PROJECT_ID**
```
habla-483915
```

**GOOGLE_CREDENTIALS** (JSON string)
```json
{"type":"service_account","project_id":"habla-483915","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@habla-483915.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Slik får du GOOGLE_CREDENTIALS JSON string**:
```bash
# Fra google-credentials.json filen din
cat google-credentials.json | jq -c
# Eller bare kopier hele innholdet av google-credentials.json og lim inn som én linje
```

### Steg 4: Deploy
1. Klikk "Deploy"
2. Vent til deployment er ferdig (~2-3 minutter)
3. Test appen på Vercel URL-en!

### Lokal utvikling etter disse endringene

Appen vil fortsatt fungere lokalt. Du har to valg:

**Alternativ 1: Bruk Application Default Credentials (anbefalt)**
```bash
# Sett opp Google Cloud authentication
gcloud auth application-default login
gcloud config set project habla-483915
```

**Alternativ 2: Bruk .env.local fil**
Opprett `.env.local` i root:
```env
GOOGLE_CLOUD_PROJECT_ID=habla-483915
GOOGLE_CREDENTIALS={"type":"service_account",...hele JSON fra google-credentials.json...}
```

Deretter kjør som normalt:
```bash
npm run dev
```

### Feilsøking på Vercel

**"Authentication failed" error**
- Sjekk at GOOGLE_CREDENTIALS er satt korrekt i Vercel
- Verifiser at JSON-strengen er gyldig (ingen linjeskift inne i private_key)
- Sjekk at Speech-to-Text og Text-to-Speech APIer er aktivert i Google Cloud Console

**"Module not found" error**
- Deploy på nytt (Vercel → Deployments → ... → Redeploy)

**Build failed**
- Sjekk build logs i Vercel dashboard
- Verifiser at alle dependencies er i frontend/package.json

## 📝 Lisens

Dette er et personlig prosjekt for språklæring.
