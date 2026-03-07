import { create } from 'zustand';

export const useVoxelStore = create((set, get) => ({
    voxels: [], // [{ position, id, type: 'correct' | 'extra' }]
    mode: 'add', // 'add' or 'remove'
    cursorPosition: [0, 0, 0],
    isHandDetected: false,
    isCursorReady: false,
    ghostVoxel: { position: [0, 0, 0], visible: false },

    // --- Dual Hand State (Minimized for Performance) ---
    hands: {
        left: { palmPosition: [0, 0, 0], pinchPosition: [0, 0, 0], isPinching: false, isGrabbing: false, pinchStrength: 0, isDrawing: false },
        right: { palmPosition: [0, 0, 0], pinchPosition: [0, 0, 0], isPinching: false, isGrabbing: false, pinchStrength: 0, isDrawing: false }
    },
    drawTrail: [], // [{ pos, ts }]
    sceneQuaternion: [0, 0, 0, 1], // [x, y, z, w]
    scenePosition: [0, 0, 0],
    sceneScale: 1,

    // --- Challenge System State ---
    gameMode: 'FREE', // 'FREE' or 'GUIDED'
    activeChallenge: null,
    challengeState: 'idle', // idle | countdown | active | complete | failed
    targetSet: new Set(), // Set of "x,y,z" strings for O(1) lookup
    filledTargets: new Set(), // Set of "x,y,z" strings for filled targets
    kidsMode: false,
    metrics: {
        correctCount: 0,
        extraCount: 0,
        mistakeCount: 0,
        totalTarget: 0,
        startTime: null,
        endTime: null,
        completionTime: null,
        reactionTimes: [],
        lastPlacementTime: null,
        stabilityScore: 100,
        movementSamples: [],
    },
    isComplete: false,
    hintVoxel: null,
    grabbedVoxelId: null,

    // --- Actions ---
    setGameMode: (mode) => set({ gameMode: mode }),
    setKidsMode: (val) => set({ kidsMode: val }),
    setChallengeState: (state) => set({ challengeState: state }),

    updateHandData: (side, data) => set((state) => ({
        hands: {
            ...state.hands,
            [side]: { ...state.hands[side], ...data }
        }
    })),

    setSceneQuaternion: (quaternion) => set({ sceneQuaternion: quaternion }),
    setScenePosition: (position) => set({ scenePosition: position }),
    setSceneScale: (scale) => set({ sceneScale: scale }),
    setGrabbedVoxelId: (id) => set({ grabbedVoxelId: id }),
    setGhostVoxel: (ghost) => set({ ghostVoxel: ghost }),

    updateVoxelPosition: (id, pos) => set((state) => ({
        voxels: state.voxels.map(v => v.id === id ? { ...v, position: pos } : v)
    })),

    startChallenge: (challenge) => {
        const targetSet = new Set(challenge.targetVoxels.map(v => v.join(',')));
        set({
            activeChallenge: challenge,
            gameMode: 'GUIDED',
            challengeState: 'countdown', // Start with countdown, not active
            targetSet,
            filledTargets: new Set(),
            voxels: [],
            isComplete: false,
            metrics: {
                correctCount: 0,
                extraCount: 0,
                mistakeCount: 0,
                totalTarget: challenge.targetVoxels.length,
                startTime: null, // Set when countdown finishes
                endTime: null,
                completionTime: null,
                reactionTimes: [],
                lastPlacementTime: null,
                stabilityScore: 100,
                movementSamples: [],
            },
            hintVoxel: null
        });
    },

    // Called by ChallengeHUD when countdown finishes
    activateChallenge: () => set({
        challengeState: 'active',
        metrics: {
            ...get().metrics,
            startTime: Date.now(),
            lastPlacementTime: Date.now(),
        }
    }),

    endChallenge: (result) => {
        const metrics = get().metrics;
        const endTime = Date.now();
        const completionTime = metrics.startTime ? endTime - metrics.startTime : null;
        set({
            challengeState: result, // 'complete' or 'failed'
            isComplete: result === 'complete',
            metrics: {
                ...metrics,
                endTime,
                completionTime,
            }
        });
    },

    stopChallenge: () => set({
        gameMode: 'FREE',
        activeChallenge: null,
        challengeState: 'idle',
        targetSet: new Set(),
        filledTargets: new Set(),
        hintVoxel: null
    }),

    addVoxel: (pos) => set((state) => {
        // Block placement during countdown
        if (state.challengeState === 'countdown') return state;

        const posKey = pos.join(',');

        // Prevent adding if voxel already exists at this snap position
        const exists = state.voxels.some(v => v.position.join(',') === posKey);
        if (exists) return state;

        let type = 'default';
        let newMetrics = { ...state.metrics };
        let newFilledTargets = new Set(state.filledTargets);

        if (state.gameMode === 'GUIDED') {
            const isTarget = state.targetSet.has(posKey);

            if (isTarget && !state.filledTargets.has(posKey)) {
                type = 'correct';
                newMetrics.correctCount += 1;
                newFilledTargets.add(posKey);
                // Reaction time since last placement
                const now = Date.now();
                if (newMetrics.lastPlacementTime) {
                    newMetrics.reactionTimes.push(now - newMetrics.lastPlacementTime);
                }
                newMetrics.lastPlacementTime = now;
            } else {
                if (!state.activeChallenge.allowExtra) {
                    // Wrong placement → mark as mistake, will be auto-removed
                    type = 'mistake';
                    newMetrics.mistakeCount += 1;
                } else {
                    type = 'extra';
                    newMetrics.extraCount += 1;
                }
            }
        }

        const voxelId = Math.random().toString(36).substr(2, 9);
        const newVoxels = [...state.voxels, { position: pos, id: voxelId, type }];

        // Completion Check
        const isComplete = state.gameMode === 'GUIDED' &&
            newMetrics.correctCount === state.metrics.totalTarget;

        // Schedule auto-remove for mistake voxels
        if (type === 'mistake') {
            setTimeout(() => {
                const store = get();
                set({
                    voxels: store.voxels.filter(v => v.id !== voxelId)
                });
            }, 500);
        }

        // Auto-end on completion
        if (isComplete) {
            const endTime = Date.now();
            newMetrics.endTime = endTime;
            newMetrics.completionTime = newMetrics.startTime ? endTime - newMetrics.startTime : null;
            return {
                voxels: newVoxels,
                metrics: newMetrics,
                filledTargets: newFilledTargets,
                isComplete: true,
                challengeState: 'complete',
                hintVoxel: null
            };
        }

        return {
            voxels: newVoxels,
            metrics: newMetrics,
            filledTargets: newFilledTargets,
            isComplete: false,
            hintVoxel: null
        };
    }),

    removeVoxel: (pos) => set((state) => {
        const posKey = pos.join(',');
        const removedVoxel = state.voxels.find(v => v.position.join(',') === posKey);
        if (!removedVoxel) return state;

        let newMetrics = { ...state.metrics };
        let newFilledTargets = new Set(state.filledTargets);
        if (state.gameMode === 'GUIDED') {
            if (removedVoxel.type === 'correct') {
                newMetrics.correctCount -= 1;
                newFilledTargets.delete(posKey);
            }
            else if (removedVoxel.type === 'extra') newMetrics.extraCount -= 1;
        }

        return {
            voxels: state.voxels.filter(v => v.position.join(',') !== posKey),
            metrics: newMetrics,
            filledTargets: newFilledTargets,
            isComplete: false
        };
    }),

    updateStability: (delta) => set((state) => {
        if (state.gameMode !== 'GUIDED' || !state.isHandDetected) return state;

        const samples = [...state.metrics.movementSamples, delta].slice(-100);
        const avgDelta = samples.reduce((a, b) => a + b, 0) / samples.length;
        const stabilityScore = Math.max(0, Math.min(100, 100 - (avgDelta * 1000)));

        return {
            metrics: {
                ...state.metrics,
                movementSamples: samples,
                stabilityScore
            }
        };
    }),

    provideHint: () => {
        const state = get();
        if (state.gameMode !== 'GUIDED' || state.isComplete) return;

        const currentPosKeys = new Set(state.voxels.map(v => v.position.join(',')));
        const missing = state.activeChallenge.targetVoxels.find(v => !currentPosKeys.has(v.join(',')));

        if (missing) {
            set({ hintVoxel: missing });
        }
    },

    setMode: (mode) => set({ mode }),
    setCursorPosition: (pos) => set({ cursorPosition: pos }),
    setHandDetected: (isDetected) => set({ isHandDetected: isDetected }),
    setIsCursorReady: (isReady) => set({ isCursorReady: isReady }),
    setDrawTrail: (trail) => set({ drawTrail: trail }),

    getVoxelCenter: () => {
        const voxels = get().voxels;
        if (voxels.length === 0) return [0, 0, 0];
        const sum = voxels.reduce((acc, voxel) => [
            acc[0] + voxel.position[0],
            acc[1] + voxel.position[1],
            acc[2] + voxel.position[2]
        ], [0, 0, 0]);
        return [sum[0] / voxels.length, sum[1] / voxels.length, sum[2] / voxels.length];
    },

    saveWorld: () => {
        const data = JSON.stringify(get().voxels);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'voxel-world.json';
        link.click();
    },

    loadWorld: (voxels) => set({ voxels }),

    clearVoxels: () => set({ voxels: [] }),

    resetScene: () => set({ scenePosition: [0, 0, 0], sceneQuaternion: [0, 0, 0, 1], sceneScale: 1, isCursorReady: false }),

    resetWorld: () => set({
        voxels: [],
        scenePosition: [0, 0, 0],
        sceneQuaternion: [0, 0, 0, 1],
        sceneScale: 1,
        isCursorReady: false
    })

}));
