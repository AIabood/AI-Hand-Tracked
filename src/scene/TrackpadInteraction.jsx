import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useVoxelStore } from '../voxel/useVoxelStore';
import * as THREE from 'three';

const ALPHA = 0.15; // Exponential decay factor as requested

export const TrackpadInteraction = () => {
    const { gl } = useThree();

    // Store accessors
    const sceneQuaternion = useVoxelStore((state) => state.sceneQuaternion);
    const setSceneQuaternion = useVoxelStore((state) => state.setSceneQuaternion);
    const scenePosition = useVoxelStore((state) => state.scenePosition);
    const setScenePosition = useVoxelStore((state) => state.setScenePosition);
    const sceneScale = useVoxelStore((state) => state.sceneScale);
    const setSceneScale = useVoxelStore((state) => state.setSceneScale);
    const resetScene = useVoxelStore((state) => state.resetScene);

    // Refs for interaction state
    const pointers = useRef(new Map()); // Map pointerId -> { x, y }
    const lastPinchDist = useRef(null);
    const tapStartTime = useRef(null);
    const tapCount = useRef(0);

    // Internal values for smoothing
    const currentQ = useRef(new THREE.Quaternion(...sceneQuaternion));
    const currentP = useRef(new THREE.Vector3(...scenePosition));
    const currentS = useRef(sceneScale);

    // Helper to apply exponential smoothing
    const smooth = (current, target) => current + ALPHA * (target - current);

    useEffect(() => {
        const domElement = gl.domElement;
        domElement.style.touchAction = 'none'; // Prevent browser default touch behavior

        const handlePointerDown = (e) => {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pointers.current.size === 2) {
                const pts = Array.from(pointers.current.values());
                lastPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            }

            if (pointers.current.size === 3) {
                tapStartTime.current = Date.now();
            }
        };

        const handlePointerMove = (e) => {
            if (!pointers.current.has(e.pointerId)) return;

            const prev = pointers.current.get(e.pointerId);
            const curr = { x: e.clientX, y: e.clientY };

            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;

            if (pointers.current.size === 1) {
                // --- One Finger: Rotate ---
                const sensitivity = 0.005;
                const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * sensitivity);
                const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * sensitivity);

                currentQ.current.multiplyQuaternions(rotY, currentQ.current);
                currentQ.current.multiplyQuaternions(currentQ.current, rotX);

                setSceneQuaternion(currentQ.current.toArray());
            } else if (pointers.current.size === 2) {
                // --- Two Fingers: Pan & Zoom ---
                // Update this pointer
                pointers.current.set(e.pointerId, curr);

                const pts = Array.from(pointers.current.values());
                const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

                // Pan (Average movement of both fingers)
                const panSensitivity = 0.05;
                // Note: We only use the delta from the currently moving finger for simplicity in deltas
                // but scaled by 0.5 as it's partial. Or just use full delta.
                currentP.current.x += dx * panSensitivity;
                currentP.current.y -= dy * panSensitivity;
                setScenePosition(currentP.current.toArray());

                // Zoom (Pinch)
                if (lastPinchDist.current !== null) {
                    const zoomDelta = (currentDist - lastPinchDist.current) * 0.01;
                    const nextScale = Math.max(0.1, Math.min(5, currentS.current + zoomDelta));
                    currentS.current = smooth(currentS.current, nextScale);
                    setSceneScale(currentS.current);
                }
                lastPinchDist.current = currentDist;
            }

            pointers.current.set(e.pointerId, curr);
        };

        const handlePointerUp = (e) => {
            if (pointers.current.size === 3 && tapStartTime.current) {
                const duration = Date.now() - tapStartTime.current;
                if (duration < 300) {
                    resetScene();
                    // Sync internal refs
                    currentQ.current.set(0, 0, 0, 1);
                    currentP.current.set(0, 0, 0);
                    currentS.current = 1;
                }
            }

            pointers.current.delete(e.pointerId);
            if (pointers.current.size < 2) {
                lastPinchDist.current = null;
            }
            tapStartTime.current = null;
        };

        domElement.addEventListener('pointerdown', handlePointerDown);
        domElement.addEventListener('pointermove', handlePointerMove);
        domElement.addEventListener('pointerup', handlePointerUp);
        domElement.addEventListener('pointercancel', handlePointerUp);

        return () => {
            domElement.removeEventListener('pointerdown', handlePointerDown);
            domElement.removeEventListener('pointermove', handlePointerMove);
            domElement.removeEventListener('pointerup', handlePointerUp);
            domElement.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [gl, setSceneQuaternion, setScenePosition, setSceneScale, resetScene]);

    return null;
};
