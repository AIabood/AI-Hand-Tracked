import { useState, useEffect } from 'react';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { ChallengeHUD } from './ChallengeHUD';
import { ChallengeResults } from './ChallengeResults';
import challenges from '../voxel/challenges.json';
import { Trophy, Target, Zap, Activity, Lightbulb, Star, Clock, Crosshair, Shapes } from 'lucide-react';

const typeConfig = {
    shape: { icon: <Shapes size={16} />, label: 'شكل', color: 'hsl(190, 100%, 50%)' },
    speed: { icon: <Clock size={16} />, label: 'سرعة', color: 'hsl(45, 100%, 60%)' },
    precision: { icon: <Crosshair size={16} />, label: 'دقة', color: 'hsl(280, 80%, 65%)' },
};

const diffConfig = {
    easy: { label: 'سهل', color: 'hsl(150, 100%, 60%)', gradient: 'linear-gradient(135deg, hsla(150,100%,60%,0.15), transparent)' },
    medium: { label: 'متوسط', color: 'hsl(45, 100%, 60%)', gradient: 'linear-gradient(135deg, hsla(45,100%,60%,0.15), transparent)' },
    hard: { label: 'صعب', color: 'hsl(0, 100%, 65%)', gradient: 'linear-gradient(135deg, hsla(0,100%,65%,0.15), transparent)' },
};

export const GuidedUI = () => {
    const gameMode = useVoxelStore(state => state.gameMode);
    const activeChallenge = useVoxelStore(state => state.activeChallenge);
    const challengeState = useVoxelStore(state => state.challengeState);
    const metrics = useVoxelStore(state => state.metrics);
    const isComplete = useVoxelStore(state => state.isComplete);
    const kidsMode = useVoxelStore(state => state.kidsMode);
    const startChallenge = useVoxelStore(state => state.startChallenge);
    const stopChallenge = useVoxelStore(state => state.stopChallenge);
    const provideHint = useVoxelStore(state => state.provideHint);
    const resetWorld = useVoxelStore(state => state.resetWorld);
    const setKidsMode = useVoxelStore(state => state.setKidsMode);

    const [showSelector, setShowSelector] = useState(false);
    const [diffFilter, setDiffFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    // Provide hint if inactive for 10s during active challenge
    useEffect(() => {
        if (challengeState !== 'active' || isComplete) return;
        const interval = setInterval(() => {
            const idleTime = Date.now() - metrics.lastPlacementTime;
            if (idleTime > 10000) provideHint();
        }, 1000);
        return () => clearInterval(interval);
    }, [challengeState, isComplete, metrics.lastPlacementTime, provideHint]);

    // Filter challenges
    const filteredChallenges = challenges.filter(c => {
        if (kidsMode && c.audience === 'adults') return false;
        if (!kidsMode && c.audience === 'kids') return false;
        if (diffFilter !== 'all' && c.difficulty !== diffFilter) return false;
        if (typeFilter !== 'all' && c.type !== typeFilter) return false;
        return true;
    });

    // --- FREE Mode: Challenge selection ---
    if (gameMode === 'FREE') {
        return (
            <div className="guided-mode-entry">
                {/* Main CTA Button */}
                <button
                    className="start-guided-btn"
                    onClick={() => setShowSelector(!showSelector)}
                >
                    <div className="btn-glow" />
                    <Trophy size={20} />
                    <span>التحديات</span>
                    <span className="challenge-count">{challenges.length}</span>
                </button>

                <button className="reset-world-btn" onClick={resetWorld}>
                    إعادة تعيين
                </button>

                {/* Challenge Selector Panel */}
                {showSelector && (
                    <div className="ch-selector glass">
                        {/* Panel Header */}
                        <div className="ch-selector-header">
                            <h3>🏆 اختر تحدياً</h3>
                            <button className="ch-close-btn" onClick={() => setShowSelector(false)}>✕</button>
                        </div>

                        {/* Audience Toggle */}
                        <div className="ch-audience-toggle">
                            <button
                                className={`ch-toggle ${!kidsMode ? 'active' : ''}`}
                                onClick={() => setKidsMode(false)}
                            >
                                <span className="toggle-emoji">🧑</span>
                                <span>الكبار</span>
                            </button>
                            <button
                                className={`ch-toggle ${kidsMode ? 'active' : ''}`}
                                onClick={() => setKidsMode(true)}
                            >
                                <span className="toggle-emoji">👶</span>
                                <span>الأطفال</span>
                            </button>
                        </div>

                        {/* Type Filter */}
                        <div className="ch-type-filter">
                            <button
                                className={`ch-type-btn ${typeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setTypeFilter('all')}
                            >
                                الكل
                            </button>
                            {Object.entries(typeConfig).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    className={`ch-type-btn ${typeFilter === key ? 'active' : ''}`}
                                    style={typeFilter === key ? { borderColor: cfg.color, color: cfg.color } : {}}
                                    onClick={() => setTypeFilter(key)}
                                >
                                    {cfg.icon}
                                    <span>{cfg.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Difficulty Tabs */}
                        <div className="ch-diff-tabs">
                            {['all', 'easy', 'medium', 'hard'].map(d => (
                                <button
                                    key={d}
                                    className={`ch-diff-tab ${diffFilter === d ? 'active' : ''}`}
                                    style={d !== 'all' && diffFilter === d ? { color: diffConfig[d]?.color } : {}}
                                    onClick={() => setDiffFilter(d)}
                                >
                                    {d === 'all' ? 'الكل' : diffConfig[d].label}
                                </button>
                            ))}
                        </div>

                        {/* Challenge Cards */}
                        <div className="ch-card-list">
                            {filteredChallenges.map((c, i) => {
                                const diff = diffConfig[c.difficulty];
                                const type = typeConfig[c.type];
                                return (
                                    <div
                                        key={c.id}
                                        className="ch-card"
                                        style={{
                                            background: diff.gradient,
                                            animationDelay: `${i * 0.06}s`,
                                            borderColor: `${diff.color}33`
                                        }}
                                        onClick={() => {
                                            startChallenge(c);
                                            setShowSelector(false);
                                        }}
                                    >
                                        <div className="ch-card-left">
                                            <div className="ch-card-type" style={{ color: type.color }}>
                                                {type.icon}
                                            </div>
                                        </div>
                                        <div className="ch-card-body">
                                            <div className="ch-card-title">{c.name}</div>
                                            <div className="ch-card-desc">{c.description}</div>
                                            <div className="ch-card-tags">
                                                <span className="ch-tag diff" style={{ color: diff.color, borderColor: `${diff.color}44` }}>
                                                    {diff.label}
                                                </span>
                                                {c.timeLimit && (
                                                    <span className="ch-tag time">
                                                        <Clock size={10} /> {c.timeLimit}s
                                                    </span>
                                                )}
                                                <span className="ch-tag voxels">
                                                    {c.targetVoxels.length} مكعب
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ch-card-arrow">→</div>
                                    </div>
                                );
                            })}

                            {filteredChallenges.length === 0 && (
                                <div className="ch-empty">
                                    <span>😕</span>
                                    <p>لا توجد تحديات بهذا الفلتر</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- GUIDED Mode: Active challenge ---
    const accuracy = metrics.totalTarget > 0
        ? ((metrics.correctCount / metrics.totalTarget) * 100).toFixed(0)
        : 0;

    return (
        <>
            <ChallengeHUD />
            <ChallengeResults />

            {challengeState === 'active' && (
                <div className="guided-dashboard glass">
                    <div className="challenge-header">
                        <div className="ch-active-info">
                            <span className="ch-active-type" style={{ color: typeConfig[activeChallenge.type]?.color }}>
                                {typeConfig[activeChallenge.type]?.icon}
                            </span>
                            <h3>{activeChallenge.name}</h3>
                        </div>
                        <div className="btn-group">
                            <button onClick={() => startChallenge(activeChallenge)} className="reset-btn">🔄</button>
                            <button onClick={stopChallenge} className="exit-btn">✕</button>
                        </div>
                    </div>

                    <div className="metrics-grid">
                        <div className="metric-box">
                            <Target size={16} color="hsl(150, 100%, 60%)" />
                            <div className="label">الدقة</div>
                            <div className="value">{accuracy}%</div>
                        </div>
                        <div className="metric-box">
                            <Zap size={16} color="hsl(45, 100%, 60%)" />
                            <div className="label">الثبات</div>
                            <div className="value">{metrics.stabilityScore.toFixed(0)}%</div>
                        </div>
                        <div className="metric-box">
                            <Activity size={16} color="hsl(190, 100%, 50%)" />
                            <div className="label">التقدم</div>
                            <div className="value">{metrics.correctCount}/{metrics.totalTarget}</div>
                        </div>
                    </div>

                    {!isComplete && (
                        <div className="hint-indicator">
                            <Lightbulb size={14} />
                            <span>تحتاج مساعدة؟ انتظر 10 ثوانٍ</span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
