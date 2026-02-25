"use client";

export default function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 rounded-lg ${className}`}
        />
    );
}

export function QuizCardSkeleton() {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-between pt-4">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
        </div>
    );
}

export function StudentPlaySkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6 md:p-12 items-center justify-center space-y-12">
            <div className="w-full max-w-2xl bg-white p-12 rounded-[3.5rem] shadow-xl space-y-8 flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-[2rem]" />
                <Skeleton className="h-12 w-3/4 rounded-2xl" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <div className="w-full pt-8 space-y-4">
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

export function TeacherSessionSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 space-y-12">
            <div className="flex justify-between items-center">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-14 w-40 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-[3rem]" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[500px] w-full rounded-[3rem]" />
                </div>
            </div>
        </div>
    );
}
