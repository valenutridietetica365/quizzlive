"use client";

import { useState, useEffect } from "react";
import { playSFX } from "@/components/AudioController";

interface HangmanViewProps {
    word: string;
    onComplete: (answer: string) => void;
    isSubmitting: boolean;
    t: (key: string) => string;
}

export default function HangmanView({ word, onComplete, isSubmitting, t }: HangmanViewProps) {
    const targetWord = word.trim().toUpperCase();
    const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
    const [wrongCounter, setWrongCounter] = useState(0);
    const maxMistakes = 6;

    const displayWord = targetWord
        .split("")
        .map((char) => (char === " " ? " " : guessedLetters.includes(char) ? char : "_"))
        .join("");

    const isWinner = !displayWord.includes("_");
    const isGameOver = wrongCounter >= maxMistakes;

    useEffect(() => {
        if (isWinner) {
            onComplete(targetWord);
        }
    }, [isWinner, onComplete, targetWord]);

    const handleGuess = (letter: string) => {
        if (guessedLetters.includes(letter) || isWinner || isGameOver || isSubmitting) return;

        setGuessedLetters((prev) => [...prev, letter]);

        if (!targetWord.includes(letter)) {
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
                    className={`h-full transition-all duration-500 ${wrongCounter > 4 ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{ width: `${((maxMistakes - wrongCounter) / maxMistakes) * 100}%` }}
                />
            </div>

            <div className="text-center space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Adivina la palabra</p>
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

            {isGameOver && (
                <div className="p-6 bg-red-100 text-red-600 rounded-3xl font-black animate-bounce">
                    ¡DEMASIADOS ERRORES!
                </div>
            )}

            <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 w-full max-w-xl">
                {alphabet.map((letter) => {
                    const isGuessed = guessedLetters.includes(letter);
                    const isWrong = isGuessed && !targetWord.includes(letter);
                    const isCorrectGuess = isGuessed && targetWord.includes(letter);

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
                {maxMistakes - wrongCounter} intentos restantes
            </div>
        </div>
    );
}
