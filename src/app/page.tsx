import Link from "next/link";
import { ArrowRight, BookOpenCheck, Presentation } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">

            {/* Decorative Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="max-w-3xl w-full text-center z-10 space-y-8">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
                    Aprende. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Juega.</span> Interactúa.
                </h1>
                <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
                    Plataforma de quizzes en tiempo real diseñada para el aula moderna. Sin instalaciones. Acceso instantáneo.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                    <Link href="/join" className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm text-slate-800 font-bold hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all flex items-center justify-center gap-2 group">
                        <BookOpenCheck className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        Soy Estudiante
                    </Link>
                    <Link href="/teacher/login" className="w-full sm:w-auto px-8 py-4 bg-slate-900 rounded-2xl shadow-lg text-white font-bold hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                        <Presentation className="w-6 h-6" />
                        Soy Profesor
                        <ArrowRight className="w-5 h-5 ml-1 opacity-80" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
