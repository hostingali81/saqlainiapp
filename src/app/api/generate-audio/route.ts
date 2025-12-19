import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { textToConvert } = body;

        if (!textToConvert) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
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
            return NextResponse.json({ error: 'Azure TTS API failed', details: errorText }, { status: response.status });
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
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
