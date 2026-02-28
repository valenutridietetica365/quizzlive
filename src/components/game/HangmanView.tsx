"use client";

import { useState, useEffect } from "react";
import { playSFX } from "@/components/AudioController";

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
    const targetWord = word.trim().toUpperCase();
    const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
    const [wrongCounter, setWrongCounter] = useState(0);
    const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
    const maxMistakes = config?.hangmanLives || 6;
    const ignoreAccents = config?.hangmanIgnoreAccents ?? true;

    const normalizeChar = (char: string) => {
        if (!ignoreAccents) return char.toUpperCase();
        return char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    // Detect technical prefixes like "A. ", "1)", "(B) ", "B - "
    useEffect(() => {
        if (!targetWord) return;
        const prefixes = [
            /^([A-Z0-9][.)\-:]+\s*)/, // A. or 1. or B:
            /^(\([A-Z0-9]\)\s*)/,     // (A)
            /^([A-Z0-9]\s+-\s*)/      // A - 
        ];

        for (const regex of prefixes) {
            const match = targetWord.match(regex);
            if (match) {
                const letters = match[1].split("").filter(c => /[A-Z0-9]/.test(c));
                setGuessedLetters(prev => Array.from(new Set([...prev, ...letters])));
                break;
            }
        }
    }, [targetWord]);

    const displayWord = targetWord
        .split("")
        .map((char) => {
            if (char === " ") return " ";
            const normalizedChar = normalizeChar(char);

            // Auto-reveal: Spaces, Numbers, Punctuation, etc. (Anything not a letter)
            // Note: We only expect students to guess LETTERS (A-Z)
            const isLetter = /[A-ZÑÁÉÍÓÚÜ]/.test(normalizedChar);
            if (!isLetter) return char;

            const isGuessed = guessedLetters.some(g => normalizeChar(g) === normalizedChar);
            return isGuessed ? char : "_";
        })
        .join("");

    const isWinner = targetWord.length > 0 && !displayWord.includes("_");
    const isGameOver = wrongCounter >= maxMistakes;

    useEffect(() => {
        if (isWinner && status === "playing") {
            setStatus("won");
            const timer = setTimeout(() => {
                onComplete(targetWord);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isWinner, onComplete, targetWord, status]);

    useEffect(() => {
        if (isGameOver && status === "playing") {
            setStatus("lost");
            const timer = setTimeout(() => {
                onComplete(""); // Fail
            }, 2500); // More time to see the correct word
            return () => clearTimeout(timer);
        }
    }, [isGameOver, onComplete, status]);

    const handleGuess = (letter: string) => {
        if (guessedLetters.includes(letter) || isWinner || isGameOver || isSubmitting) return;

        setGuessedLetters((prev) => [...prev, letter]);

        const normalizedGuess = normalizeChar(letter);
        const isMatch = targetWord.split("").some(char => normalizeChar(char) === normalizedGuess);

        if (!isMatch) {
            setWrongCounter((prev) => prev + 1);
            playSFX("wrong");
        } else {
            playSFX("correct");
        }
    };

    const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

    return (
        <div className="w-full flex flex-col items-center gap-12 p-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Visual Health / Hangman Indicator */}
            <div className="w-full max-w-sm h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300">
                <div
                    className={`h-full transition-all duration-500 ${wrongCounter > (maxMistakes * 0.7) ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.max(0, ((maxMistakes - wrongCounter) / maxMistakes) * 100)}%` }}
                />
            </div>

            <div className="text-center space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Adivina la palabra</p>
                    <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">
                        ¡Debe ser una de las opciones de abajo!
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                    {displayWord.split("").map((char, i) => (
                        <div
                            key={i}
                            className={`w-8 h-12 md:w-12 md:h-16 flex items-center justify-center text-2xl md:text-4xl font-black border-b-4 transition-all ${char === "_" ? "border-slate-300 text-slate-300" : "border-blue-600 text-slate-900"
                                } ${char === " " ? "border-transparent w-4" : ""}`}
                        >
                            {char !== "_" ? char : ""}
                        </div>
                    ))}
                </div>
            </div>

            {status === "lost" && (
                <div className="p-6 bg-red-100/80 border-2 border-red-200 text-red-600 rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-2 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-xl">¡DEMASIADOS ERRORES!</p>
                    <p className="text-sm uppercase tracking-widest opacity-70">La palabra era: <span className="text-slate-900 bg-white px-2 py-1 rounded-md">{targetWord}</span></p>
                </div>
            )}

            {status === "won" && (
                <div className="p-6 bg-emerald-100/80 border-2 border-emerald-200 text-emerald-600 rounded-3xl font-black animate-in zoom-in duration-300 text-center space-y-2 shadow-xl backdrop-blur-sm">
                    <p className="animate-bounce text-xl">¡EXCELENTE!</p>
                    <p className="text-sm uppercase tracking-widest opacity-70">¡Has descubierto la palabra!</p>
                </div>
            )}

            <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 w-full max-w-xl">
                {alphabet.map((letter) => {
                    const normalizedLetter = normalizeChar(letter);
                    const isGuessed = guessedLetters.includes(letter);
                    const isMatch = targetWord.split("").some(char => normalizeChar(char) === normalizedLetter);

                    const isWrong = isGuessed && !isMatch;
                    const isCorrectGuess = isGuessed && isMatch;

                    return (
                        <button
                            key={letter}
                            onClick={() => handleGuess(letter)}
                            disabled={isGuessed || isWinner || isGameOver || isSubmitting}
                            className={`aspect-square flex items-center justify-center rounded-xl font-black transition-all ${isCorrectGuess ? "bg-emerald-500 text-white" :
                                isWrong ? "bg-red-500 text-white opacity-50" :
                                    "bg-white text-slate-900 shadow-xl border-b-4 border-slate-200 active:translate-y-1 active:border-b-0"
                                } disabled:cursor-not-allowed`}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>

            <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                {Math.max(0, maxMistakes - wrongCounter)} intentos restantes
            </div>
        </div>
    );
}
