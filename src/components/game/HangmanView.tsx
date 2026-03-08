"use client";

import { useState, useEffect, useMemo } from "react";
import { playSFX } from "@/components/AudioController";
import { Sparkles, Heart } from "lucide-react";

interface HangmanViewProps {
    word: string;
    options?: string[];
    onComplete: (answer: string) => void;
    isSubmitting: boolean;
    config?: {
        hangmanLives?: number;
        hangmanIgnoreAccents?: boolean;
    };
    t?: (key: string) => string;
}

export default function HangmanView({ word, options, onComplete, isSubmitting, config, t }: HangmanViewProps) {
    // 1. Clean the word from prefixes/suffixes like "A) ", "1. ", "(B) ", or trailing "."
    const cleanWord = useMemo(() => {
        let raw = word.trim().toUpperCase();

        // Remove common MCQ prefixes
        const prefixes = [
            /^([A-Z0-9][.)\-:]+\s*)/,
            /^(\([A-Z0-9]\)\s*)/,
            /^([A-Z0-9]\s+-\s*)/
        ];
        for (const regex of prefixes) {
            if (regex.test(raw)) {
                raw = raw.replace(regex, "");
                break;
            }
        }

        // Remove trailing punctuation that isn't usually part of the answer
        return raw.replace(/[.;,!?]$/, "");
    }, [word]);

    const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
    const [wrongCounter, setWrongCounter] = useState(0);
    const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

    const maxMistakes = config?.hangmanLives || 6;
    const ignoreAccents = config?.hangmanIgnoreAccents ?? true;

    const normalizeChar = (char: string) => {
        if (!ignoreAccents) return char.toUpperCase();
        return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    const displayWord = cleanWord
        .split("")
        .map((char) => {
            if (char === " ") return " ";
            const normalizedChar = normalizeChar(char);
            const isLetter = /[A-ZÑÁÉÍÓÚÜ]/.test(normalizedChar);
            if (!isLetter) return char;

            const isGuessed = guessedLetters.some(g => normalizeChar(g) === normalizedChar);
            return isGuessed ? char : "_";
        })
        .join("");

    const words = displayWord.split(" ");

    const isWinner = cleanWord.length > 0 && !displayWord.includes("_");
    const isGameOver = wrongCounter >= maxMistakes;

    useEffect(() => {
        if (isWinner && status === "playing") {
            setStatus("won");
            const timer = setTimeout(() => {
                // Return original option if found, otherwise return cleanWord
                const originalOption = options?.find(opt => {
                    let oRaw = opt.trim().toUpperCase();
                    const prefixes = [/^(?:[A-Z0-9][.)\-:]+\s*)/, /^(?:\([A-Z0-9]\)\s*)/, /^(?:[A-Z0-9]\s+-\s*)/];
                    for (const r of prefixes) { if (r.test(oRaw)) { oRaw = oRaw.replace(r, ""); break; } }
                    return oRaw.replace(/[.;,!?]$/, "") === cleanWord;
                });
                onComplete(originalOption || cleanWord);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isWinner, onComplete, cleanWord, status, options]);

    useEffect(() => {
        if (isGameOver && status === "playing") {
            setStatus("lost");
            const timer = setTimeout(() => {
                onComplete("__HANGMAN_FAIL__"); // Sentinel value for a failed hangman attempt
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isGameOver, onComplete, status]);

    const handleGuess = (letter: string) => {
        if (guessedLetters.includes(letter) || isWinner || isGameOver || isSubmitting) return;

        setGuessedLetters((prev) => [...prev, letter]);
        const normalizedGuess = normalizeChar(letter);
        const isMatch = cleanWord.split("").some(char => normalizeChar(char) === normalizedGuess);

        if (!isMatch) {
            setWrongCounter((prev) => prev + 1);
            playSFX("wrong");
        } else {
            playSFX("correct");
        }
    };

    const handleHint = () => {
        if (isWinner || isGameOver || isSubmitting) return;

        // Find letters not yet guessed
        const remainingLetters = cleanWord.split("").filter(char => {
            const normalizedChar = normalizeChar(char);
            const isLetter = /[A-ZÑÁÉÍÓÚÜ]/.test(normalizedChar);
            return isLetter && !guessedLetters.includes(normalizedChar);
        });

        if (remainingLetters.length > 0) {
            const randomLetter = normalizeChar(remainingLetters[Math.floor(Math.random() * remainingLetters.length)]);
            setGuessedLetters(prev => [...prev, randomLetter]);
            setWrongCounter(prev => prev + 1); // Cost of hint: 1 life
            playSFX("correct");
        }
    };

    const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

    // SVG Hangman Drawing
    const renderHangman = () => {
        return (
            <svg width="120" height="150" viewBox="0 0 100 120" className="drop-shadow-xl overflow-visible">
                {/* Gallow */}
                <path d="M20 110 L80 110" stroke="#1e293b" strokeWidth="4" />
                <path d="M30 110 L30 10" stroke="#1e293b" strokeWidth="4" />
                <path d="M30 10 L70 10" stroke="#1e293b" strokeWidth="4" />
                <path d="M70 10 L70 20" stroke="#1e293b" strokeWidth="4" />

                {/* Head */}
                {wrongCounter > 0 && <circle cx="70" cy="30" r="10" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" fill="none" className="animate-in fade-in duration-500" />}
                {/* Body */}
                {wrongCounter > 1 && <line x1="70" y1="40" x2="70" y2="70" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" className="animate-in fade-in duration-500" />}
                {/* Left Arm */}
                {wrongCounter > 2 && <line x1="70" y1="50" x2="55" y2="40" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" className="animate-in fade-in duration-500" />}
                {/* Right Arm */}
                {wrongCounter > 3 && <line x1="70" y1="50" x2="85" y2="40" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" className="animate-in fade-in duration-500" />}
                {/* Left Leg */}
                {wrongCounter > 4 && <line x1="70" y1="70" x2="55" y2="90" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" className="animate-in fade-in duration-500" />}
                {/* Right Leg */}
                {wrongCounter > 5 && <line x1="70" y1="70" x2="85" y2="90" stroke={wrongCounter >= maxMistakes ? "#ef4444" : "#1e293b"} strokeWidth="4" className="animate-in fade-in duration-500" />}
            </svg>
        );
    };

    return (
        <div className="w-full flex flex-col items-center gap-3 md:gap-6 p-2 md:p-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Top Section: Visual & Controls — always side-by-side */}
            <div className="w-full max-w-2xl flex flex-row items-center justify-center gap-4 md:gap-8">
                {/* Visual Hangman — smaller on mobile */}
                <div className="relative group shrink-0">
                    <div className="absolute -inset-4 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors hidden md:block" />
                    <div className="scale-[0.65] md:scale-100 origin-center">
                        {renderHangman()}
                    </div>
                </div>

                {/* Status & Hints — compact on mobile */}
                <div className="flex flex-col items-center md:items-end gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex -space-x-1">
                            {[...Array(maxMistakes)].map((_, i) => (
                                <Heart
                                    key={i}
                                    className={`w-4 h-4 md:w-6 md:h-6 transition-all duration-500 ${i < (maxMistakes - wrongCounter) ? 'fill-red-500 text-red-500' : 'fill-slate-200 text-slate-200 scale-90'}`}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">
                            {Math.max(0, maxMistakes - wrongCounter)} {t ? t('game.lives') : 'vidas'}
                        </span>
                    </div>

                    <button
                        onClick={handleHint}
                        disabled={isWinner || isGameOver || isSubmitting || (maxMistakes - wrongCounter) <= 1}
                        className="group relative px-4 py-2 md:px-6 md:py-3 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg md:shadow-xl shadow-slate-200 hover:shadow-blue-200 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-1.5 md:gap-2 border-b-2 md:border-b-4 border-slate-100 hover:border-blue-500"
                    >
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                        <span>{t ? t('game.hint_button') : 'Pista'} ({t ? t('game.hint_cost') : 'Cuesta 1 Vida'})</span>
                    </button>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t ? t('game.guess_instruction') : 'Adivina la palabra para subir puntos'}</p>
                </div>
            </div>

            {/* Word Display — compact on mobile */}
            <div className="w-full flex flex-wrap justify-center gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-6 py-2 md:py-4 px-1">
                {words.map((wordStr, wordIdx) => (
                    <div key={wordIdx} className="flex gap-0.5 md:gap-2 whitespace-nowrap">
                        {wordStr.split("").map((char, charIdx) => (
                            <div
                                key={`${wordIdx}-${charIdx}`}
                                className={`w-5 h-7 md:w-10 md:h-14 flex items-center justify-center text-base md:text-3xl font-black border-b-[3px] md:border-b-4 transition-all ${char === "_" ? "border-slate-300 text-slate-300" : "border-blue-600 text-slate-900"
                                    }`}
                            >
                                {char !== "_" ? char : ""}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Messages */}
            {status === "lost" && (
                <div className="p-4 md:p-6 bg-red-100/80 border-2 border-red-200 text-red-600 rounded-2xl md:rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-1 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-lg md:text-xl uppercase">{t ? t('game.game_over') : '¡GAME OVER!'}</p>
                    <p className="text-xs md:text-sm uppercase tracking-widest opacity-70">{t ? t('game.word_was') : 'La palabra era:'} <span className="text-slate-900 bg-white px-2 py-0.5 rounded-lg ml-1">{cleanWord}</span></p>
                </div>
            )}

            {status === "won" && (
                <div className="p-4 md:p-6 bg-emerald-100/80 border-2 border-emerald-200 text-emerald-600 rounded-2xl md:rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-1 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-lg md:text-xl uppercase">{t ? t('game.victory') : '¡VICTORIA!'}</p>
                    <p className="text-xs md:text-sm uppercase tracking-widest opacity-70">{t ? t('game.victory_desc') : '¡Has salvado al ahorcado!'}</p>
                </div>
            )}

            {/* Keyboard — 9 cols on mobile (3 rows), 13 on desktop */}
            <div className="grid grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-1 md:gap-2 w-full max-w-4xl">
                {alphabet.map((letter) => {
                    const normalizedLetter = normalizeChar(letter);
                    const isGuessed = guessedLetters.includes(normalizedLetter);
                    const isMatch = cleanWord.split("").some(char => normalizeChar(char) === normalizedLetter);

                    const isWrong = isGuessed && !isMatch;
                    const isCorrectGuess = isGuessed && isMatch;

                    return (
                        <button
                            key={letter}
                            onClick={() => handleGuess(letter)}
                            disabled={isGuessed || isWinner || isGameOver || isSubmitting}
                            className={`aspect-square flex items-center justify-center rounded-lg md:rounded-xl font-black text-xs md:text-base transition-all ${isCorrectGuess ? "bg-emerald-500 text-white shadow-emerald-200" :
                                isWrong ? "bg-red-500 text-white opacity-40 grayscale-[0.5]" :
                                    "bg-white text-slate-900 shadow-md md:shadow-lg border-b-2 md:border-b-4 border-slate-200 hover:border-blue-300 active:translate-y-0.5 active:border-b-0"
                                } disabled:cursor-not-allowed`}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
                {t ? t('game.press_letters') : 'Presiona las letras para adivinar'}
            </p>
        </div>
    );
}
