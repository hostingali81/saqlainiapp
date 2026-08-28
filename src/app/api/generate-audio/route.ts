import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// Azure bills per character, so an open endpoint is an open wallet.
const MAX_TEXT_LENGTH = 8000;

export async function POST(req: NextRequest) {
    try {
        // This route spends money on the project's Azure account. It used to be
        // completely unauthenticated - anyone who found the URL could use it as
        // a free, unlimited text-to-speech service.
        const auth = await requireAdmin();
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: 401 });
        }

        const body = await req.json();
        const { textToConvert } = body;

        if (!textToConvert || typeof textToConvert !== 'string' || !textToConvert.trim()) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        if (textToConvert.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { error: `Text is too long (${textToConvert.length} characters, maximum ${MAX_TEXT_LENGTH}).` },
                { status: 413 }
            );
        }

        const region = process.env.AZURE_TTS_REGION;
        const key = process.env.AZURE_TTS_KEY;

        if (!region || !key) {
            return NextResponse.json({ error: 'Azure API credentials are not configured.' }, { status: 500 });
        }

        const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hi-IN'>
            <voice name='hi-IN-ArjunNeural'>${textToConvert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</voice>
        </speak>`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'SaqlainiAppT2S'
            },
            body: ssml
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Azure TTS Error:', response.status, errorText);
            // Do not echo Azure's response back to the browser; it can carry
            // account and request details.
            return NextResponse.json({ error: 'Azure TTS API failed' }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            }
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
