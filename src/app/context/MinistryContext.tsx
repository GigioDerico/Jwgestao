import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface MinistryContextType {
    timerSeconds: number;
    isTimerRunning: boolean;
    startTimer: () => void;
    stopTimer: () => number; // returns elapsed hours
    resetTimer: () => void;
}

const MinistryContext = createContext<MinistryContextType | undefined>(undefined);

const STORAGE_KEY = 'jwgestao-ministry-timer-start';

export function MinistryProvider({ children }: { children: React.ReactNode }) {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Initialize from localStorage
    useEffect(() => {
        const savedStartTime = localStorage.getItem(STORAGE_KEY);
        if (savedStartTime) {
            const startTime = parseInt(savedStartTime, 10);
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);

            if (elapsed > 0) {
                setTimerSeconds(elapsed);
                setIsTimerRunning(true);
            }
        }
    }, []);

    // Timer effect
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimerSeconds((s) => s + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    const startTimer = () => {
        const now = Date.now();
        localStorage.setItem(STORAGE_KEY, now.toString());
        setTimerSeconds(0);
        setIsTimerRunning(true);
    };

    const stopTimer = () => {
        setIsTimerRunning(false);
        localStorage.removeItem(STORAGE_KEY);
        const hours = timerSeconds / 3600;
        return Math.round(hours * 100) / 100;
    };

    const resetTimer = () => {
        setIsTimerRunning(false);
        setTimerSeconds(0);
        localStorage.removeItem(STORAGE_KEY);
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
