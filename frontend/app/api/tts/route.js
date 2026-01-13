import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';
import path from 'path';

// Initialize Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: path.join(process.cwd(), '..', 'google-credentials.json'),
    projectId: 'habla-483915'
});

export async function POST(request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        // Construct the request
        const requestConfig = {
            input: { text: text },
            // Select the language and SSML voice gender (optional)
            voice: { languageCode: 'es-ES', name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
            // Select the type of audio encoding
            audioConfig: { audioEncoding: 'MP3' },
        };

        // Performs the text-to-speech request
        const [response] = await ttsClient.synthesizeSpeech(requestConfig);

        return new NextResponse(response.audioContent, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });

    } catch (error) {
        console.error('❌ TTS Error:', error);
        return NextResponse.json(
            { error: 'TTS failed', details: error.message },
            { status: 500 }
        );
    }
}
