import { useState, useEffect, useRef } from 'react';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { playCountdown, playCountdownGo, playFail } from '../utils/sounds';

export const ChallengeHUD = () => {
    const challengeState = useVoxelStore(state => state.challengeState);
    const activeChallenge = useVoxelStore(state => state.activeChallenge);
    const metrics = useVoxelStore(state => state.metrics);
    const activateChallenge = useVoxelStore(state => state.activateChallenge);
    const endChallenge = useVoxelStore(state => state.endChallenge);

    const [countdownNum, setCountdownNum] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    // --- Countdown 3-2-1 ---
    useEffect(() => {
        if (challengeState !== 'countdown') return;
        setCountdownNum(3);

        let count = 3;
        playCountdown();

        const interval = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdownNum(count);
                playCountdown();
            } else {
                setCountdownNum(0);
                playCountdownGo();
                clearInterval(interval);
                // Activate the challenge after "GO!"
                setTimeout(() => {
                    activateChallenge();
                }, 500);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [challengeState, activateChallenge]);

    // --- Timer (counts up) ---
    useEffect(() => {
        if (challengeState !== 'active') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        setElapsed(0);
        timerRef.current = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [challengeState]);

    // --- Time limit check ---
    useEffect(() => {
        if (challengeState !== 'active' || !activeChallenge?.timeLimit) return;

        if (elapsed >= activeChallenge.timeLimit) {
            playFail();
            endChallenge('failed');
        }
    }, [elapsed, challengeState, activeChallenge, endChallenge]);

    // --- Countdown Overlay ---
    if (challengeState === 'countdown') {
        return (
            <div className="countdown-overlay">
                <div className="countdown-number" key={countdownNum}>
                    {countdownNum > 0 ? countdownNum : 'GO!'}
                </div>
                <div className="countdown-challenge-name">
                    {activeChallenge?.name}
                </div>
            </div>
        );
    }

    // --- Active HUD ---
    if (challengeState !== 'active') return null;

    const progress = metrics.totalTarget > 0
        ? (metrics.correctCount / metrics.totalTarget) * 100
        : 0;

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const timeLimit = activeChallenge?.timeLimit;
    const timeWarning = timeLimit && elapsed >= timeLimit - 10;

    return (
        <div className="challenge-hud">
            {/* Timer */}
            <div className={`hud-timer ${timeWarning ? 'warning' : ''}`}>
                <span className="timer-icon">⏱</span>
                <span className="timer-value">{formatTime(elapsed)}</span>
                {timeLimit && (
                    <span className="timer-limit">/ {formatTime(timeLimit)}</span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="hud-progress">
                <div className="progress-label">
                    <span>{metrics.correctCount} / {metrics.totalTarget}</span>
                    <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Mistakes */}
            {metrics.mistakeCount > 0 && (
                <div className="hud-mistakes">
                    <span>❌ أخطاء: {metrics.mistakeCount}</span>
                </div>
            )}
        </div>
    );
};
