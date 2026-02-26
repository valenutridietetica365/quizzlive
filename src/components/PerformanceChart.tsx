"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PerformanceChartProps {
    data: {
        date: string;
        participation: number;
    }[];
    label: string;
    t: (key: string) => string;
}

export default function PerformanceChart({ data, label, t }: PerformanceChartProps) {
    const chartData = {
        labels: data.map(d => d.date),
        datasets: [
            {
                label: label,
                data: data.map(d => d.participation),
                fill: true,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                bodyFont: {
                    family: 'Inter, sans-serif',
                    weight: 'bold' as const,
                },
                callbacks: {
                    label: (context: any) => `${context.parsed.y ?? 0} ${t('dashboard.participants_label') || 'Participantes'}`,
                }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    stepSize: 1,
                }
            },
            x: {
                grid: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="w-full h-[300px] bg-white p-4 rounded-2xl border border-slate-50">
            <Line data={chartData} options={options} />
        </div>
    );
}
