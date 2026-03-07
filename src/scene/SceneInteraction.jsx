import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { handData } from '../handTracking/handData';
import * as THREE from 'three';

export const SceneInteraction = () => {
    const hands = useVoxelStore((state) => state.hands);
    const sceneQuaternion = useVoxelStore((state) => state.sceneQuaternion);
    const setSceneQuaternion = useVoxelStore((state) => state.setSceneQuaternion);
    const scenePosition = useVoxelStore((state) => state.scenePosition);
    const setScenePosition = useVoxelStore((state) => state.setScenePosition);
    const voxels = useVoxelStore((state) => state.voxels);
    const addVoxel = useVoxelStore((state) => state.addVoxel);
    const setMode = useVoxelStore((state) => state.setMode);
    const updateVoxelPosition = useVoxelStore((state) => state.updateVoxelPosition);
    const grabbedVoxelId = useVoxelStore((state) => state.grabbedVoxelId);
    const setGrabbedVoxelId = useVoxelStore((state) => state.setGrabbedVoxelId);
    const isCursorReady = useVoxelStore((state) => state.isCursorReady);
    const getVoxelCenter = useVoxelStore((state) => state.getVoxelCenter);
    const sceneScale = useVoxelStore((state) => state.sceneScale);

    const prevLeftPalmPos = useRef(null);
    const cooldownRef = useRef(false);

    // Persistent Quaternion to avoid angle flipping
    const currentQuaternion = useRef(new THREE.Quaternion(...sceneQuaternion));

    // helper that checks MediaPipe landmarks for index-up-only gesture on given side
    // landmarks are stored in the shared handData object, keyed by screen role
    const isIndexOnlyGestureOn = (side) => {
        const lm = handData[side]?.landmarks;
        if (!lm) return false;
        // index tip above its PIP (y smaller on screen coords)
        const indexExtended = lm[8].y < lm[6].y;
        // other finger tips below their PIPs
        const middleDown = lm[12].y > lm[10].y;
        const ringDown = lm[16].y > lm[14].y;
        const pinkyDown = lm[20].y > lm[18].y;
        return indexExtended && middleDown && ringDown && pinkyDown;
    };

    const isTwoFingersGestureOn = (side) => {
        const lm = handData[side]?.landmarks;
        if (!lm) return false;
        const indexExtended = lm[8].y < lm[6].y;
        const middleExtended = lm[12].y < lm[10].y;
        const ringDown = lm[16].y > lm[14].y;
        const pinkyDown = lm[20].y > lm[18].y;
        return indexExtended && middleExtended && ringDown && pinkyDown;
    };

    /**
     * Converts world-space coordinates (hand) to local-space grid coordinates (voxels).
     * Accounts for scene rotation (quaternion), translation (position), 
     * and the dynamic rotation pivot (voxelCenter).
     */
    const worldToLocal = (worldPos) => {
        const voxelCenter = getVoxelCenter();
        const q = new THREE.Quaternion(...sceneQuaternion);
        const qInv = q.clone().invert();

        // The rotation pivot point is the world-space coordinate of the group origin
        const pivotX = scenePosition[0] + voxelCenter[0];
        const pivotY = scenePosition[1] + voxelCenter[1];
        const pivotZ = scenePosition[2] + voxelCenter[2];

        // 1. Subtract pivot to center the coordinate around the rotation point
        // 2. Un-apply rotation (inverse quaternion)
        // 3. Scale by inverse of sceneScale
        const worldVec = new THREE.Vector3(...worldPos);
        const pivotVec = new THREE.Vector3(pivotX, pivotY, pivotZ);

        return worldVec
            .sub(pivotVec)
            .applyQuaternion(qInv)
            .divideScalar(sceneScale || 1.0)
            .add(new THREE.Vector3(...voxelCenter));
    };

    const isDrawing = hands.right.isDrawing;
    const drawTimerRef = useRef(null);
    const lastPlacedPos = useRef(null);
    const latestPinchPosRef = useRef(null);

    // Update the ref every frame for the interval closure
    useFrame(() => {
        latestPinchPosRef.current = hands.right.pinchPosition;
    });

    // Voxel placement interval for DRAW gesture
    useFrame(() => {
        if (isDrawing && !drawTimerRef.current) {
            // Start placement interval
            drawTimerRef.current = setInterval(() => {
                const rawPos = latestPinchPosRef.current;
                if (!rawPos) return;

                const localPosVec = worldToLocal(rawPos);
                const localPos = localPosVec.toArray();

                // 0.6 world units check (in world space for consistency with gestural speed)
                if (lastPlacedPos.current) {
                    const dist = Math.sqrt(
                        Math.pow(rawPos[0] - lastPlacedPos.current[0], 2) +
                        Math.pow(rawPos[1] - lastPlacedPos.current[1], 2) +
                        Math.pow(rawPos[2] - lastPlacedPos.current[2], 2)
                    );
                    if (dist < 0.6) return;
                }

                // Place voxel
                const snappedPos = localPos.map(Math.round);
                setMode('add');
                addVoxel(snappedPos);
                lastPlacedPos.current = [...rawPos];

            }, 400); // 400ms per spec
        } else if (!isDrawing && drawTimerRef.current) {
            // Stop placement interval
            clearInterval(drawTimerRef.current);
            drawTimerRef.current = null;
            lastPlacedPos.current = null;
        }

        // --- Left Side Hand: Object Control (Rotation & Translation) ---
        if (hands.left.palmPosition) {
            const currentPalm = hands.left.palmPosition;

            // 1. Rotation (Left Index Raised) - UPDATED GESTURE
            if (isIndexOnlyGestureOn('left')) {
                if (prevLeftPalmPos.current) {
                    const deltaX = currentPalm[0] - prevLeftPalmPos.current[0];
                    const deltaY = currentPalm[1] - prevLeftPalmPos.current[1];

                    const sensitivity = 1.0;

                    const rotX = new THREE.Quaternion();
                    const rotY = new THREE.Quaternion();

                    rotX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * sensitivity);
                    rotY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * sensitivity);

                    currentQuaternion.current.multiply(rotY);
                    currentQuaternion.current.multiply(rotX);

                    setSceneQuaternion(currentQuaternion.current.toArray());
                }
                prevLeftPalmPos.current = [...currentPalm];
            }
            // 2. Translation (Left Two Fingers Raised) - UPDATED GESTURE
            else if (isTwoFingersGestureOn('left')) {
                if (prevLeftPalmPos.current) {
                    const deltaX = currentPalm[0] - prevLeftPalmPos.current[0];
                    const deltaY = currentPalm[1] - prevLeftPalmPos.current[1];
                    const deltaZ = currentPalm[2] - prevLeftPalmPos.current[2];

                    const translationSensitivity = 1.0;

                    const newPos = [
                        scenePosition[0] + deltaX * translationSensitivity,
                        scenePosition[1] + deltaY * translationSensitivity,
                        scenePosition[2] + deltaZ * translationSensitivity
                    ];
                    setScenePosition(newPos);
                }
                prevLeftPalmPos.current = [...currentPalm];
            } else {
                prevLeftPalmPos.current = null;
            }
        } else {
            prevLeftPalmPos.current = null;
        }

        // --- Right Side Hand: Index Aim + Middle Confirm ---

        if (isCursorReady) {
            const fingerPos = hands.right.pinchPosition || hands.right.palmPosition;

            if (fingerPos) {
                // ✌️ Index + Middle → place voxel at index fingertip position
                if (isTwoFingersGestureOn('right')) {
                    const localPos = worldToLocal(fingerPos);
                    const snappedPos = localPos.toArray().map(Math.round);

                    if (!cooldownRef.current) {
                        setMode('add');
                        addVoxel(snappedPos);
                        cooldownRef.current = true;
                        setTimeout(() => { cooldownRef.current = false; }, 300);
                    }
                }
                // Pinch/grab legacy support
                else if (hands.right.isPinching && hands.right.pinchPosition) {
                    const currentPinchLocal = worldToLocal(hands.right.pinchPosition).toArray();
                    if (!grabbedVoxelId) {
                        const nearest = voxels.find(v => {
                            const dist = Math.sqrt(
                                Math.pow(v.position[0] - currentPinchLocal[0], 2) +
                                Math.pow(v.position[1] - currentPinchLocal[1], 2) +
                                Math.pow(v.position[2] - currentPinchLocal[2], 2)
                            );
                            return dist < 1.0;
                        });
                        if (nearest) {
                            setGrabbedVoxelId(nearest.id);
                        }
                    } else {
                        updateVoxelPosition(grabbedVoxelId, currentPinchLocal);
                    }
                } else if (grabbedVoxelId) {
                    // Release → snap
                    const voxel = voxels.find(v => v.id === grabbedVoxelId);
                    if (voxel) {
                        const snap = voxel.position.map(Math.round);
                        updateVoxelPosition(grabbedVoxelId, snap);
                    }
                    setGrabbedVoxelId(null);
                }
            }
        }
    });

    return null;
};
