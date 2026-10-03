'use client';

import { useState, useEffect } from 'react';
import { generateAudioScript, getAvailableMonths, AudioScriptResult } from '@/app/actions/audio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Mic, Play, Download, Copy, Check, RotateCcw } from 'lucide-react';

export default function AudioGeneratorPage() {
    const [availableMonths, setAvailableMonths] = useState<{ month: number; count: number }[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'comma' | 'range'>('comma');

    // Inputs
    const [commaInput, setCommaInput] = useState('');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    // Results
    const [scriptResult, setScriptResult] = useState<AudioScriptResult | null>(null);
    const [loadingScript, setLoadingScript] = useState(false);

    // Audio
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState('');

    // Utils
    const [copied, setCopied] = useState(false);

    // Initial Fetch
    useEffect(() => {
        getAvailableMonths().then(setAvailableMonths);
    }, []);

    const handleMonthClick = (month: number) => {
        setActiveTab('comma');
        let newSelected = [...selectedMonths];
        if (newSelected.includes(month)) {
            newSelected = newSelected.filter(m => m !== month);
        } else {
            newSelected.push(month);
            newSelected.sort((a, b) => a - b);
        }
        setSelectedMonths(newSelected);
        setCommaInput(newSelected.join(', '));
    };

    const handleCommaInputChange = (val: string) => {
        setCommaInput(val);
        const nums = val.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        setSelectedMonths(nums);
    };

    const handleClearSelection = () => {
        setSelectedMonths([]);
        setCommaInput('');
    };

    const handleGenerateScript = async () => {
        setLoadingScript(true);
        setScriptResult(null);
        setAudioUrl(null);

        let monthsToFetch: number[] = [];

        if (activeTab === 'comma') {
            monthsToFetch = selectedMonths;
        } else {
            const start = parseInt(rangeStart);
            const end = parseInt(rangeEnd);
            if (!isNaN(start) && !isNaN(end)) {
                if (start <= end) {
                    for (let i = start; i <= end; i++) monthsToFetch.push(i);
                } else {
                    for (let i = start; i >= end; i--) monthsToFetch.push(i);
                }
            }
        }

        const result = await generateAudioScript(monthsToFetch);
        setScriptResult(result);
        setLoadingScript(false);
    };

    const handleCopy = () => {
        if (scriptResult?.script) {
            navigator.clipboard.writeText(scriptResult.script);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConvertToAudio = async () => {
        if (!scriptResult?.script) return;
        setGeneratingAudio(true);
        setAudioUrl(null);
        setAudioError('');

        try {
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textToConvert: scriptResult.script })
            });

            if (!response.ok) {
                // The API now returns a reason (unauthorised, text too long, ...).
                const detail = await response.json().catch(() => null);
                throw new Error(detail?.error || 'Failed to generate audio');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (error: any) {
            console.error(error);
            setAudioError(error?.message || 'Could not generate the audio. Please try again.');
        } finally {
            setGeneratingAudio(false);
        }
    };

    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24 min-h-screen bg-[#f4f7f6]">
            <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: '#0D483B' }}>
                उपयोगकर्ता सूची जेनरेटर
            </h1>
            <p className="text-center text-muted-foreground mb-6 text-sm">
                (केवल 'Regular' उपयोगकर्ताओं के लिए)
            </p>

            {/* ERROR CARD (Mock) */}
            {audioError && (
                <div className="mb-4 px-4 py-3 rounded-[10px] text-sm" style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#a33a35' }}>
                    {audioError}
                </div>
            )}

            {scriptResult?.error && (
                <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded mb-6">
                    {scriptResult.error}
                </div>
            )}

            {/* AVAILABLE MONTHS */}
            <div
                className="rounded-[15px] p-6 mb-6"
                style={{
                    background: '#FFF8E7', // Cream
                    border: '1px solid #E5D3AA'
                }}
            >
                <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-[#4A3728]">उपलब्ध बकाया महीने (क्लिक करके चुनें):</p>
                    <button
                        onClick={handleClearSelection}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-gray-700"
                    >
                        चुनाव साफ़ करें
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    {availableMonths.map((m) => {
                        const isSelected = selectedMonths.includes(m.month);
                        return (
                            <button
                                key={m.month}
                                onClick={() => handleMonthClick(m.month)}
                                className={`
                                    relative px-4 py-2 rounded-full text-sm font-medium border transition-all
                                    ${isSelected
                                        ? 'bg-[#0D483B] text-white border-[#0D483B]'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }
                                `}
                            >
                                {m.month.toString().padStart(2, '0')}
                                <span className={`
                                    absolute -top-1 -right-1 text-[9px] w-5 h-5 flex items-center justify-center rounded-full border border-white
                                    ${isSelected ? 'bg-red-600 text-white' : 'bg-red-600 text-white'}
                                `}>
                                    {m.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-300 mb-6">
                <button
                    onClick={() => setActiveTab('comma')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2
                        ${activeTab === 'comma'
                            ? 'border-[#0D483B] text-[#0D483B]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }
                    `}
                >
                    कॉमा द्वारा खोजें
                </button>
                <button
                    onClick={() => setActiveTab('range')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2
                        ${activeTab === 'range'
                            ? 'border-[#0D483B] text-[#0D483B]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }
                    `}
                >
                    रेंज द्वारा खोजें
                </button>
            </div>

            {/* FORM */}
            <div
                className="rounded-[15px] p-6 mb-6"
                style={{ background: 'white', border: '1px solid #E5D3AA' }}
            >
                {activeTab === 'comma' ? (
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-600 mb-2">
                            बकाया महीने (कॉमा से अलग करें):
                        </label>
                        <Input
                            value={commaInput}
                            onChange={(e) => handleCommaInputChange(e.target.value)}
                            placeholder="ऊपर से चुनें या यहाँ टाइप करें..."
                            className="bg-white border-gray-300"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                बकाया महीना कहाँ से:
                            </label>
                            <Input
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                                placeholder="जैसे: 0 या 5"
                                className="bg-white border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">
                                बकाया महीना कहाँ तक:
                            </label>
                            <Input
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(e.target.value)}
                                placeholder="जैसे: 6 या 1"
                                className="bg-white border-gray-300"
                            />
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleGenerateScript}
                    disabled={loadingScript}
                    className="w-full h-12 text-lg font-bold"
                    style={{ background: '#0D483B' }}
                >
                    {loadingScript ? 'बनाया जा रहा है...' : 'सूची बनाएँ'}
                </Button>
            </div>

            {/* RESULTS */}
            {scriptResult && !scriptResult.error && (
                <div className="relative mt-8">
                    <h3 className="text-xl font-bold mb-2 text-[#2c3e50]">परिणाम:</h3>
                    <p className="text-sm font-bold text-gray-500 mb-4">
                        कुल {scriptResult.count} परिणाम मिले।
                    </p>

                    <div className="relative">
                        <Textarea
                            value={scriptResult.script}
                            onChange={(e) => setScriptResult({ ...scriptResult, script: e.target.value })}
                            className="h-[350px] bg-[#ecf0f1] font-mono text-base p-4 border-gray-300 resize-none focus-visible:ring-0"
                        />
                        <Button
                            onClick={handleCopy}
                            size="sm"
                            className={`absolute top-2 right-2 ${copied ? 'bg-green-600' : 'bg-green-500'} hover:bg-green-600 text-white`}
                        >
                            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                            {copied ? 'कॉपी हो गया!' : 'कॉपी करें'}
                        </Button>
                    </div>

                    {/* AUDIO GENERATION */}
                    {scriptResult.count > 0 && (
                        <div className="mt-6">
                            {!audioUrl && (
                                <Button
                                    onClick={handleConvertToAudio}
                                    disabled={generatingAudio}
                                    className="w-full py-6 text-lg font-bold rounded-lg shadow-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, #C6A869, #B08D55)',
                                        color: '#0D483B'
                                    }}
                                >
                                    {generatingAudio ? (
                                        'बनाया जा रहा है...'
                                    ) : (
                                        <>
                                            <Mic className="mr-2 h-6 w-6" />
                                            ऑडियो में बदलें
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* AUDIO PLAYER */}
                            {audioUrl && (
                                <div className="mt-6 p-6 border rounded-lg bg-gray-50 shadow-inner flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <audio controls src={audioUrl} className="w-full mb-4" autoPlay />

                                    <div className="flex gap-4">
                                        <a href={audioUrl} download="bakaya_list.mp3">
                                            <Button variant="outline" className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50">
                                                <Download className="h-4 w-4" />
                                                डाउनलोड करें
                                            </Button>
                                        </a>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setAudioUrl(null)}
                                            className="text-gray-500"
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            reset
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
