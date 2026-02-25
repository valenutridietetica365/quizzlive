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
