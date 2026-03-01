"use client";

import { useState, useEffect, useMemo } from "react";
import { playSFX } from "@/components/AudioController";
import { Sparkles, Heart } from "lucide-react";

interface HangmanViewProps {
    word: string;
    onComplete: (answer: string) => void;
    isSubmitting: boolean;
    config?: {
        hangmanLives?: number;
        hangmanIgnoreAccents?: boolean;
    };
}

export default function HangmanView({ word, onComplete, isSubmitting, config }: HangmanViewProps) {
    // 1. Clean the word from prefixes like "A) ", "1. ", "(B) "
    const cleanWord = useMemo(() => {
        const raw = word.trim().toUpperCase();
        const prefixes = [
            /^([A-Z0-9][.)\-:]+\s*)/, // A. or 1. or B:
            /^(\([A-Z0-9]\)\s*)/,     // (A)
            /^([A-Z0-9]\s+-\s*)/      // A - 
        ];
        let cleaned = raw;
        for (const regex of prefixes) {
            if (regex.test(raw)) {
                cleaned = raw.replace(regex, "");
                break;
            }
        }
        return cleaned;
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

    const isWinner = cleanWord.length > 0 && !displayWord.includes("_");
    const isGameOver = wrongCounter >= maxMistakes;

    useEffect(() => {
        if (isWinner && status === "playing") {
            setStatus("won");
            const timer = setTimeout(() => {
                onComplete(cleanWord);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isWinner, onComplete, cleanWord, status]);

    useEffect(() => {
        if (isGameOver && status === "playing") {
            setStatus("lost");
            const timer = setTimeout(() => {
                onComplete(""); // Fail
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
        <div className="w-full flex flex-col items-center gap-6 md:gap-8 p-4 md:p-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Top Section: Visual & Controls */}
            <div className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Visual Hangman */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                    {renderHangman()}
                </div>

                {/* Status & Hints */}
                <div className="flex flex-col items-center md:items-end gap-4 flex-1">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-1">
                            {[...Array(maxMistakes)].map((_, i) => (
                                <Heart
                                    key={i}
                                    className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-500 ${i < (maxMistakes - wrongCounter) ? 'fill-red-500 text-red-500' : 'fill-slate-200 text-slate-200 scale-90'}`}
                                />
                            ))}
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            {Math.max(0, maxMistakes - wrongCounter)} vidas
                        </span>
                    </div>

                    <button
                        onClick={handleHint}
                        disabled={isWinner || isGameOver || isSubmitting || (maxMistakes - wrongCounter) <= 1}
                        className="group relative px-6 py-3 bg-white text-slate-900 rounded-2xl font-black shadow-xl shadow-slate-200 hover:shadow-blue-200 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-2 border-b-4 border-slate-100 hover:border-blue-500"
                    >
                        <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                        <span>Pista (Cuesta 1 Vida)</span>
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adivina la palabra para subir puntos</p>
                </div>
            </div>

            {/* Word Display */}
            <div className="text-center w-full overflow-hidden py-4">
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    {displayWord.split("").map((char, i) => (
                        <div
                            key={i}
                            className={`w-6 h-10 md:w-10 md:h-14 flex items-center justify-center text-xl md:text-3xl font-black border-b-4 transition-all ${char === "_" ? "border-slate-300 text-slate-300" : "border-blue-600 text-slate-900"
                                } ${char === " " ? "border-transparent w-4 md:w-6" : ""}`}
                        >
                            {char !== "_" ? char : ""}
                        </div>
                    ))}
                </div>
            </div>

            {/* Messages */}
            {status === "lost" && (
                <div className="p-6 bg-red-100/80 border-2 border-red-200 text-red-600 rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-2 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-xl uppercase">¡GAME OVER!</p>
                    <p className="text-sm uppercase tracking-widest opacity-70">La palabra era: <span className="text-slate-900 bg-white px-3 py-1 rounded-lg ml-1">{cleanWord}</span></p>
                </div>
            )}

            {status === "won" && (
                <div className="p-6 bg-emerald-100/80 border-2 border-emerald-200 text-emerald-600 rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-2 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-xl uppercase">¡VICTORIA!</p>
                    <p className="text-sm uppercase tracking-widest opacity-70">¡Has salvado al ahorcado!</p>
                </div>
            )}

            {/* Keyboard */}
            <div className="grid grid-cols-7 sm:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5 md:gap-2 w-full max-w-4xl">
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
                            className={`aspect-square sm:aspect-auto sm:h-12 flex items-center justify-center rounded-xl font-black text-sm md:text-base transition-all ${isCorrectGuess ? "bg-emerald-500 text-white shadow-emerald-200" :
                                isWrong ? "bg-red-500 text-white opacity-40 grayscale-[0.5]" :
                                    "bg-white text-slate-900 shadow-lg border-b-4 border-slate-200 hover:border-blue-300 active:translate-y-1 active:border-b-0"
                                } disabled:cursor-not-allowed`}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
                Presiona las letras para adivinar
            </p>
        </div>
    );
}
