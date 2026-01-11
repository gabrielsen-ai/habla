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
└── frontend/
    ├── .env.local                   # Frontend env variabler
    ├── app/
    │   ├── api/
    │   │   └── transcribe/
    │   │       └── route.js         # Backend API for Speech-to-Text
    │   ├── components/
    │   │   └── VoiceOrbPage.js      # Hovedkomponent med audio recording
    │   └── page.js
    └── package.json
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
cd frontend
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

## 📝 Lisens

Dette er et personlig prosjekt for språklæring.
