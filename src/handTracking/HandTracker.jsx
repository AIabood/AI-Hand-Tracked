import { useEffect, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { handData } from './handData';

const ALPHA_BASE = 0.35;
const ALPHA_PALM = 0.25;
const GRAB_THRESHOLD = 0.15;

// Draw gesture config
const DRAW_VELOCITY_MAX = 0.03;  // max speed to count as "slow draw"
const DRAW_INTERVAL_MS = 400;   // ms between auto-placed voxels while drawing
const TRAIL_FADE_MS = 1200;  // how long the ghost trail lingers (visual only)

export const HandTracker = ({ videoRef }) => {
    const setCursorPosition = useVoxelStore((s) => s.setCursorPosition);
    const setHandDetected = useVoxelStore((s) => s.setHandDetected);
    const updateHandData = useVoxelStore((s) => s.updateHandData);
    const setIsCursorReady = useVoxelStore((s) => s.setIsCursorReady);
    const setDrawTrail = useVoxelStore((s) => s.setDrawTrail);

    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const isReadyRef = useRef(false);
    const warmUpTimerRef = useRef(null);
    const cameraStartTimerRef = useRef(null);
    const prevRightHandFoundRef = useRef(false);

    const smoothedPositionsRef = useRef({
        Left: { palm: null, pinch: null },
        Right: { palm: null, pinch: null },
    });

    // ── Draw-gesture state ───────────────────────────────────────────
    const drawTimerRef = useRef(null);  // interval that places voxels
    const isDrawingRef = useRef(false); // currently in draw mode?
    const drawTrailRef = useRef([]);    // [{ pos, timestamp }, …] ghost trail points
    const prevDrawPosRef = useRef(null);  // last placed position (min-distance gate)
    const prevPinchPosRef = useRef(null); // previous frame pinch (velocity calc)

    // ────────────────────────────────────────────────────────────────

    const mapToWorld = (lm) => [
        (lm.x - 0.5) * -24,
        -(lm.y - 0.5) * 18,
        -lm.z * 10,
    ];

    const getDynamicAlpha = (prev, curr, base) => {
        if (!prev) return base;
        const v = Math.sqrt(
            Math.pow(curr[0] - prev[0], 2) +
            Math.pow(curr[1] - prev[1], 2)
        );
        return Math.min(0.85, base + v * 2);
    };

    const applyExponentialSmoothing = (prev, curr, base) => {
        if (!prev) return curr;
        const a = getDynamicAlpha(prev, curr, base);
        return [
            prev[0] + a * (curr[0] - prev[0]),
            prev[1] + a * (curr[1] - prev[1]),
            prev[2] + a * (curr[2] - prev[2]),
        ];
    };

    const detectPinch = (landmarks) => {
        const d = Math.sqrt(
            Math.pow(landmarks[4].x - landmarks[8].x, 2) +
            Math.pow(landmarks[4].y - landmarks[8].y, 2)
        );
        return { isPinching: d < 0.05, strength: Math.max(0, 1 - d / 0.15) };
    };

    const detectGrab = (landmarks) => {
        const palm = landmarks[9];
        const avg = [8, 12, 16, 20].reduce((s, i) =>
            s + Math.sqrt(
                Math.pow(landmarks[i].x - palm.x, 2) +
                Math.pow(landmarks[i].y - palm.y, 2)
            ), 0) / 4;
        return avg < GRAB_THRESHOLD;
    };

    // ── Draw gesture detector ────────────────────────────────────────
    // Condition: index + middle up, ring + pinky down, hand moving slowly
    const detectDraw = (landmarks, prevPinch, currPinch) => {
        const lm = landmarks;
        const twoFingers =
            lm[8].y < lm[6].y &&  // index up
            lm[12].y < lm[10].y &&  // middle up
            lm[16].y > lm[14].y &&  // ring down
            lm[20].y > lm[18].y;    // pinky down

        if (!twoFingers) return false;

        // velocity gate — only active when hand is moving slowly (drawing, not gesturing)
        if (!prevPinch || !currPinch) return true;
        const vel = Math.sqrt(
            Math.pow(currPinch[0] - prevPinch[0], 2) +
            Math.pow(currPinch[1] - prevPinch[1], 2)
        );
        return vel < DRAW_VELOCITY_MAX;
    };

    // ── Trail helpers ────────────────────────────────────────────────
    const pushTrailPoint = (pos) => {
        drawTrailRef.current.push({ pos: [...pos], ts: Date.now() });
        // prune expired points
        const cutoff = Date.now() - TRAIL_FADE_MS;
        drawTrailRef.current = drawTrailRef.current.filter((p) => p.ts > cutoff);
        setDrawTrail([...drawTrailRef.current]);
    };

    const clearTrail = () => {
        drawTrailRef.current = [];
        setDrawTrail([]);
    };

    // ── Start / stop draw interval (Sounds only, Voxel placement moved to SceneInteraction) ───
    const startDrawing = (getPos) => {
        if (isDrawingRef.current) return;
        isDrawingRef.current = true;
        playDrawSound('start');

        // Interval for "Tick" sounds (sync with SceneInteraction)
        drawTimerRef.current = setInterval(() => {
            playDrawSound('tick');
        }, DRAW_INTERVAL_MS);
    };

    const stopDrawing = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (drawTimerRef.current) {
            clearInterval(drawTimerRef.current);
            drawTimerRef.current = null;
        }
        setTimeout(clearTrail, TRAIL_FADE_MS);
        playDrawSound('end');
    };

    // ── Sound feedback ───────────────────────────────────────────────
    // Three distinct sounds: pen-down (start), blip (tick), pen-up (end)
    const playDrawSound = (type) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'start') {
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);
                osc.start(); osc.stop(ctx.currentTime + 0.20);
            } else if (type === 'tick') {
                osc.frequency.setValueAtTime(520 + Math.random() * 80, ctx.currentTime);
                gain.gain.setValueAtTime(0.07, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
                osc.start(); osc.stop(ctx.currentTime + 0.10);
            } else {
                // 'end'
                osc.frequency.setValueAtTime(500, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);
                gain.gain.setValueAtTime(0.10, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
                osc.start(); osc.stop(ctx.currentTime + 0.22);
            }
        } catch { /* audio context not available */ }
    };

    // ── MediaPipe setup ──────────────────────────────────────────────
    useEffect(() => {
        isReadyRef.current = false;

        const hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6,
        });

        isReadyRef.current = true;

        hands.onResults((results) => {
            const currentHandsDetected = { Left: false, Right: false };
            let rightHandFound = false;
            let drawDetectedThisFrame = false;
            // capture latest right-hand position for the draw interval closure
            let latestRightPinch = null;

            if (results.multiHandLandmarks?.length > 0) {

                results.multiHandLandmarks.forEach((landmarks, index) => {
                    const label = results.multiHandedness[index].label;
                    currentHandsDetected[label] = true;

                    const screenRole = landmarks[0].x < 0.5 ? 'left' : 'right';
                    if (screenRole === 'right') rightHandFound = true;

                    const rawPalm = mapToWorld(landmarks[0]);
                    const rawPinch = mapToWorld(landmarks[8]);

                    const smoothedPalm = applyExponentialSmoothing(
                        smoothedPositionsRef.current[label].palm, rawPalm, ALPHA_PALM);
                    const smoothedPinch = applyExponentialSmoothing(
                        smoothedPositionsRef.current[label].pinch, rawPinch, ALPHA_BASE);

                    smoothedPositionsRef.current[label].palm = smoothedPalm;
                    smoothedPositionsRef.current[label].pinch = smoothedPinch;

                    handData[screenRole].landmarks = landmarks;
                    handData[screenRole].palmPosition = smoothedPalm;
                    handData[screenRole].pinchPosition = smoothedPinch;

                    const pinch = detectPinch(landmarks);
                    const isGrabbing = detectGrab(landmarks);

                    // ── Draw detection (right hand only) ──────────────
                    if (screenRole === 'right') {
                        setCursorPosition(smoothedPinch);
                        latestRightPinch = smoothedPinch;

                        const drawing = detectDraw(
                            landmarks,
                            prevPinchPosRef.current,
                            smoothedPinch
                        );

                        if (drawing) {
                            if (!isDrawingRef.current) startDrawing(() => latestRightPinch);
                            drawDetectedThisFrame = true;
                            pushTrailPoint(smoothedPinch);
                        }

                        prevPinchPosRef.current = smoothedPinch;
                    }

                    updateHandData(screenRole, {
                        palmPosition: smoothedPalm,
                        pinchPosition: smoothedPinch,
                        isPinching: pinch.isPinching,
                        isGrabbing,
                        pinchStrength: pinch.strength,
                        isDrawing: screenRole === 'right' && drawDetectedThisFrame,
                    });
                });

                setHandDetected(rightHandFound);

                // warm-up timer
                if (rightHandFound && !prevRightHandFoundRef.current) {
                    setIsCursorReady(false);
                    if (warmUpTimerRef.current) clearTimeout(warmUpTimerRef.current);
                    warmUpTimerRef.current = setTimeout(() => {
                        setIsCursorReady(true);
                        warmUpTimerRef.current = null;
                    }, 4000);
                } else if (!rightHandFound && prevRightHandFoundRef.current) {
                    setIsCursorReady(false);
                    if (warmUpTimerRef.current) {
                        clearTimeout(warmUpTimerRef.current);
                        warmUpTimerRef.current = null;
                    }
                }
                prevRightHandFoundRef.current = rightHandFound;

            } else {
                setHandDetected(false);
                if (prevRightHandFoundRef.current) {
                    setIsCursorReady(false);
                    if (warmUpTimerRef.current) {
                        clearTimeout(warmUpTimerRef.current);
                        warmUpTimerRef.current = null;
                    }
                    prevRightHandFoundRef.current = false;
                }
            }

            // stop drawing if gesture ended this frame
            if (!drawDetectedThisFrame && isDrawingRef.current) {
                stopDrawing();
            }

            // reset absent hands
            ['left', 'right'].forEach((side) => {
                const lbl = side === 'left' ? 'Left' : 'Right';
                if (!currentHandsDetected[lbl]) {
                    updateHandData(side, {
                        isPinching: false,
                        isGrabbing: false,
                        isDrawing: false,
                    });
                    handData[side].landmarks = null;
                    smoothedPositionsRef.current[lbl].palm = null;
                    smoothedPositionsRef.current[lbl].pinch = null;
                }
            });
        });

        handsRef.current = hands;

        if (videoRef.current) {
            const camera = new cam.Camera(videoRef.current, {
                onFrame: async () => {
                    if (handsRef.current && isReadyRef.current) {
                        try {
                            await handsRef.current.send({ image: videoRef.current });
                        } catch (err) {
                            if (err.message?.includes('Aborted')) {
                                isReadyRef.current = false;
                            } else {
                                console.error('[HandTracker] Frame error:', err);
                            }
                        }
                    }
                },
                width: 640,
                height: 480,
            });
            cameraRef.current = camera;

            cameraStartTimerRef.current = setTimeout(() => {
                cameraStartTimerRef.current = null;
                if (cameraRef.current && isReadyRef.current) {
                    cameraRef.current.start().catch(console.error);
                }
            }, 1000);
        }

        return () => {
            isReadyRef.current = false;
            stopDrawing();

            if (warmUpTimerRef.current) clearTimeout(warmUpTimerRef.current);
            if (cameraStartTimerRef.current) clearTimeout(cameraStartTimerRef.current);

            const h = handsRef.current;
            const c = cameraRef.current;
            if (c) c.stop();
            if (h) h.close().catch(() => { });

            handsRef.current = null;
            cameraRef.current = null;
        };
    }, [videoRef, setCursorPosition, setHandDetected, updateHandData]);

    return null;
};