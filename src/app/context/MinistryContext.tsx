import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    startNativeTimer,
    stopNativeTimer,
    getElapsedSeconds,
    hasActiveTimer,
} from '../lib/ministry-timer';

interface MinistryContextType {
    timerSeconds: number;
    isTimerRunning: boolean;
    startTimer: () => Promise<void>;
    stopTimer: () => Promise<number>;
    resetTimer: () => void;
}

const MinistryContext = createContext<MinistryContextType | undefined>(undefined);

export function MinistryProvider({ children }: { children: React.ReactNode }) {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Ao montar: verifica se há timer ativo persistido e retoma contagem
    useEffect(() => {
        if (hasActiveTimer()) {
            const elapsed = getElapsedSeconds();
            setTimerSeconds(elapsed);
            setIsTimerRunning(true);
        }
    }, []);

    // Tick do cronômetro — recalcula sempre a partir do timestamp salvo
    // para manter precisão mesmo após hibernação / janela minimizada
    useEffect(() => {
        if (isTimerRunning) {
            intervalRef.current = setInterval(() => {
                setTimerSeconds(getElapsedSeconds());
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isTimerRunning]);

    const startTimer = async () => {
        await startNativeTimer();
        setTimerSeconds(0);
        setIsTimerRunning(true);
    };

    const stopTimer = async (): Promise<number> => {
        setIsTimerRunning(false);
        const hours = await stopNativeTimer();
        setTimerSeconds(0);
        return hours;
    };

    const resetTimer = () => {
        setIsTimerRunning(false);
        setTimerSeconds(0);
        localStorage.removeItem('jwgestao-ministry-timer-start');
    };

    return (
        <MinistryContext.Provider value={{ timerSeconds, isTimerRunning, startTimer, stopTimer, resetTimer }}>
            {children}
        </MinistryContext.Provider>
    );
}

export function useMinistry() {
    const context = useContext(MinistryContext);
    if (context === undefined) {
        throw new Error('useMinistry must be used within a MinistryProvider');
    }
    return context;
}
