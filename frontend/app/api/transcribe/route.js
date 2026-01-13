import { NextResponse } from 'next/server';
import speech from '@google-cloud/speech';
import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';

// Initialize the Speech-to-Text client
const speechClient = new speech.SpeechClient({
    keyFilename: path.join(process.cwd(), '..', 'google-credentials.json'),
    projectId: 'habla-483915'
});

// Initialize Vertex AI Gemini
const vertexAI = new VertexAI({
    project: 'habla-483915',
    location: 'us-central1',
    keyFilename: path.join(process.cwd(), '..', 'google-credentials.json'),
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
                        prompt = `Act as Lucia, a friendly 20-year-old female employee at a cinema. 
                        User input: "${transcription}".
                        Context: The user is learning Spanish. They likely want to practice greeting you, saying they want to see "City of God", and saying goodbye.
                        Your goal:
                        1. Reply naturally to what they said.
                        2. If they ask for a ticket or mention the movie, confirm it happily.
                        3. If they say "adios", "hasta luego" or "bye", reply politely with a goodbye and then STOP.
                        4. Keep responses short (1-2 sentences), simple Spanish suitable for a learner.

                        IMPORTANT: If the user says goodbye or adios, or if the conversation seems finished, append the exact string "[FINISHED]" at the very end of your response.`;
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
