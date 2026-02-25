import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Language } from './i18n'
export type { Language }

export type QuestionData = {
    id: string
    quiz_id: string
    question_text: string
    question_type: string
    options: string[] | null
    time_limit: number
    points: number
    sort_order: number
}

export type SessionState = 'waiting' | 'active' | 'finished'

export type ParticipantData = {
    id: string
    session_id: string
    nickname: string
    score: number // From the scores table
}

interface QuizState {
    // Session details
    sessionId: string | null
    sessionPin: string | null
    sessionStatus: SessionState
    setSession: (id: string, pin: string, status: SessionState) => void
    setSessionStatus: (status: SessionState) => void

    // Question details
    currentQuestion: QuestionData | null
    setCurrentQuestion: (question: QuestionData | null) => void

    // Participants & Leaderboard
    participants: ParticipantData[]
    setParticipants: (participants: ParticipantData[]) => void
    addParticipant: (participant: ParticipantData) => void
    updateParticipantScore: (participantId: string, score: number) => void

    // User state (for Student)
    participantId: string | null
    nickname: string | null
    setParticipantInfo: (id: string, nickname: string) => void

    // i18n
    language: Language
    setLanguage: (lang: Language) => void

    // Audio
    isMuted: boolean
    toggleMute: () => void

    // Reset
    resetStore: () => void
}

export const useQuizStore = create<QuizState>()(
    persist(
        (set, get) => ({
            sessionId: null,
            sessionPin: null,
            sessionStatus: 'waiting',
            setSession: (id, pin, status) => set({ sessionId: id, sessionPin: pin, sessionStatus: status }),
            setSessionStatus: (status) => set({ sessionStatus: status }),

            currentQuestion: null,
            setCurrentQuestion: (question: QuestionData | null) => set({ currentQuestion: question }),

            participants: [],
            setParticipants: (participants) => set({ participants }),
            addParticipant: (participant) => set((state) => {
                // Prevent duplicates in state
                if (state.participants.some(p => p.id === participant.id)) return state
                return { participants: [...state.participants, participant] }
            }),
            updateParticipantScore: (participantId, score) => set((state) => ({
                participants: state.participants.map(p =>
                    p.id === participantId ? { ...p, score } : p
                ).sort((a, b) => b.score - a.score) // Keep sorted
            })),

            participantId: null,
            nickname: null,
            setParticipantInfo: (id, nickname) => set({ participantId: id, nickname }),

            language: 'es',
            setLanguage: (lang) => set({ language: lang }),

            isMuted: false,
            toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

            resetStore: () => {
                const current = get();
                set({
                    sessionId: null,
                    sessionPin: null,
                    sessionStatus: 'waiting',
                    currentQuestion: null,
                    participants: [],
                    participantId: current.participantId,
                    nickname: current.nickname
                })
            }
        }),
        {
            name: 'quizzlive-storage-v2', // Incrementing version to avoid conflicts
        }
    )
)
