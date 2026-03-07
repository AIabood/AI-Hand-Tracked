import { useState, useEffect, useRef } from 'react';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { playComplete } from '../utils/sounds';
import challenges from '../voxel/challenges.json';

export const ChallengeResults = () => {
    const challengeState = useVoxelStore(state => state.challengeState);
    const activeChallenge = useVoxelStore(state => state.activeChallenge);
    const metrics = useVoxelStore(state => state.metrics);
    const kidsMode = useVoxelStore(state => state.kidsMode);
    const startChallenge = useVoxelStore(state => state.startChallenge);
    const stopChallenge = useVoxelStore(state => state.stopChallenge);

    const [animatedAccuracy, setAnimatedAccuracy] = useState(0);
    const hasPlayedRef = useRef(false);

    const isVisible = challengeState === 'complete' || challengeState === 'failed';

    // Animated accuracy count-up
    useEffect(() => {
        if (!isVisible) {
            setAnimatedAccuracy(0);
            hasPlayedRef.current = false;
            return;
        }

        const accuracy = metrics.totalTarget > 0
            ? (metrics.correctCount / metrics.totalTarget) * 100
            : 0;

        if (challengeState === 'complete' && !hasPlayedRef.current) {
            playComplete();
            hasPlayedRef.current = true;
        }

        let current = 0;
        const step = accuracy / 40; // 40 frames
        const interval = setInterval(() => {
            current += step;
            if (current >= accuracy) {
                current = accuracy;
                clearInterval(interval);
            }
            setAnimatedAccuracy(Math.round(current));
        }, 25);

        return () => clearInterval(interval);
    }, [isVisible, challengeState, metrics]);

    if (!isVisible || !activeChallenge) return null;

    const accuracy = metrics.totalTarget > 0
        ? (metrics.correctCount / metrics.totalTarget) * 100
        : 0;

    const completionTime = metrics.completionTime;
    const timeLimit = activeChallenge.timeLimit;

    // Star rating calculation
    let stars = 1;
    if (accuracy >= 90 && timeLimit && completionTime && completionTime < (timeLimit * 500)) {
        stars = 3;
    } else if (accuracy >= 70) {
        stars = 2;
    }
    if (challengeState === 'failed') stars = 0;

    const formatTime = (ms) => {
        if (!ms) return '--:--';
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Find next challenge
    const currentIdx = challenges.findIndex(c => c.id === activeChallenge.id);
    const nextChallenge = currentIdx >= 0 && currentIdx < challenges.length - 1
        ? challenges[currentIdx + 1]
        : null;

    const starEmojis = kidsMode
        ? ['😢', '⭐', '⭐⭐', '⭐⭐⭐ 🎉']
        : ['—', '⭐', '⭐⭐', '⭐⭐⭐'];

    return (
        <div className="results-overlay">
            <div className="results-card glass">
                {/* Header */}
                <div className="results-header">
                    <h2>{challengeState === 'complete' ? (kidsMode ? '🎉 أحسنت!' : '🏆 تم الإنجاز!') : '⏰ انتهى الوقت'}</h2>
                    <p className="results-challenge-name">{activeChallenge.name}</p>
                </div>

                {/* Stars */}
                <div className="results-stars">
                    {[1, 2, 3].map(i => (
                        <span
                            key={i}
                            className={`star ${i <= stars ? 'filled' : 'empty'}`}
                            style={{ animationDelay: `${i * 0.2}s` }}
                        >
                            ★
                        </span>
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="results-stats">
                    <div className="result-stat">
                        <div className="stat-label">الدقة</div>
                        <div className="stat-value accent">{animatedAccuracy}%</div>
                    </div>
                    <div className="result-stat">
                        <div className="stat-label">الوقت</div>
                        <div className="stat-value">
                            {challengeState === 'failed' ? 'انتهى الوقت' : formatTime(completionTime)}
                        </div>
                    </div>
                    <div className="result-stat">
                        <div className="stat-label">الثبات</div>
                        <div className="stat-value">{metrics.stabilityScore.toFixed(0)}%</div>
                    </div>
                    <div className="result-stat">
                        <div className="stat-label">الأخطاء</div>
                        <div className="stat-value error">{metrics.mistakeCount}</div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="results-buttons">
                    <button className="retry-btn" onClick={() => startChallenge(activeChallenge)}>
                        🔄 حاول مجدداً
                    </button>
                    {nextChallenge && (
                        <button className="next-btn" onClick={() => startChallenge(nextChallenge)}>
                            التحدي التالي ➜
                        </button>
                    )}
                    <button className="exit-results-btn" onClick={stopChallenge}>
                        القائمة الرئيسية
                    </button>
                </div>
            </div>
        </div>
    );
};
