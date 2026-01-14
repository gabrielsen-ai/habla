import { NextResponse } from 'next/server';
import speech from '@google-cloud/speech';
import { VertexAI } from '@google-cloud/vertexai';

// Get credentials from environment variable
// In Vercel, set GOOGLE_CREDENTIALS as a JSON string of your service account key
const getCredentials = () => {
    if (process.env.GOOGLE_CREDENTIALS) {
        // Parse JSON credentials from environment variable (Vercel deployment)
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    // Fallback for local development - uses Application Default Credentials
    return undefined;
};

const credentials = getCredentials();
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'habla-483915';

// Initialize the Speech-to-Text client
const speechClient = new speech.SpeechClient(
    credentials ? { credentials, projectId } : { projectId }
);

// Initialize Vertex AI Gemini
const vertexAI = new VertexAI({
    project: projectId,
    location: 'us-central1',
    ...(credentials && { googleAuthOptions: { credentials } })
});

const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
    },
});

export async function POST(request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');
        const scenario = formData.get('scenario');
        const turnCount = parseInt(formData.get('turnCount') || '0', 10);

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const bytes = await audioFile.arrayBuffer();
        const audioBytes = Buffer.from(bytes).toString('base64');

        console.log('🎤 Transcribing audio...');
        const [speechResponse] = await speechClient.recognize({
            audio: { content: audioBytes },
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'es-ES',
                model: 'latest_long',
                enableAutomaticPunctuation: true,
            },
        });

        const transcription = speechResponse.results
            ?.map(result => result.alternatives?.[0]?.transcript)
            .filter(Boolean)
            .join('\n') || '';

        console.log('✅ Transcription:', transcription);

        if (!transcription) {
            return NextResponse.json({
                success: true,
                transcription: '',
                reply: 'No te escuché bien, ¿puedes repetir?'
            });
        }

        console.log('🤖 Sending to Gemini (Streaming)...');

        // Create a ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                // 1. Send transcription immediately
                const initialPayload = JSON.stringify({
                    type: 'transcription',
                    text: transcription
                }) + '\n';
                controller.enqueue(encoder.encode(initialPayload));

                try {
                    let prompt = `You are a helpful and engaging Spanish conversation partner. The user said: "${transcription}". Respond in Spanish in a natural, friendly way. Encourage the conversation to continue, but keep your response concise enough for a spoken conversation (around 1-3 sentences).`;

                    if (scenario === 'kino') {
                        const isFirstTurn = turnCount === 1;
                        const greetingInstruction = isFirstTurn 
                            ? 'Du kan starte med "Hola" siden dette er første interaksjon.'
                            : 'IKKE start med "Hola" eller noen annen hilsen - fortsett samtalen naturlig uten å hilse på nytt.';
                        
                        prompt = `Du er Lucia, en vennlig 20 år gammel kvinnelig ansatt på en kino.
                        Brukerens input: "${transcription}".
                        Tur nummer: ${turnCount}
                        
                        Kontekst: Brukeren lærer spansk. De øver på å hilse på deg, si at de vil se "Toy Story", og si hade.
                        
                        Ditt mål:
                        1. Svar naturlig på det de sa, på ENKELT spansk (bruk present tense, vanlige ord, korte setninger).
                        2. Hvis de hilser, hils tilbake og spør hva de vil se.
                        3. Hvis de nevner "Toy Story" eller ber om billett, bekreft det entusiastisk og spør gjerne oppfølgingsspørsmål som "¿Cuántas entradas?" (hvor mange billetter) eller "¿Para qué hora?" (for hvilken tid).
                        4. Hvis de sier "adios", "hasta luego", "adiós" eller "bye", svar høflig med en avskjed og STOPP.
                        5. Hold svarene korte (1-2 setninger) og bruk enkelt spansk tilpasset en nybegynner.
                        6. Prøv å holde samtalen i gang med oppfølgingsspørsmål når det er naturlig, men ikke vær påtrengende.
                        7. ${greetingInstruction}
                        
                        Eksempler på enkelt spansk:
                        - Bruk "quiero" (jeg vil), "ver" (se), "película" (film)
                        - Unngå komplekse verb-former, bruk mest present tense
                        - Hold setningene korte og tydelige

                        VIKTIG: Hvis brukeren sier farvel eller samtalen virker ferdig, legg til strengen "[FINISHED]" helt på slutten av svaret ditt.`;
                    }

                    const result = await generativeModel.generateContentStream(prompt);

                    for await (const item of result.stream) {
                        const chunkText = item.candidates[0].content.parts[0].text;
                        if (chunkText) {
                            const chunkPayload = JSON.stringify({
                                type: 'chunk',
                                text: chunkText
                            }) + '\n';
                            controller.enqueue(encoder.encode(chunkPayload));
                        }
                    }

                    controller.close();
                } catch (geminiError) {
                    console.error('❌ Gemini Specific Error:', geminiError);
                    const errorPayload = JSON.stringify({
                        type: 'error',
                        text: `(Gemini Error: ${geminiError.message})`
                    }) + '\n';
                    controller.enqueue(encoder.encode(errorPayload));
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error('❌ General Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
