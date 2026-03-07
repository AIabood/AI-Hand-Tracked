import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoxelStore } from './useVoxelStore';
import { playCorrect } from '../utils/sounds';

const dummy = new THREE.Object3D();
const colorCorrect = new THREE.Color('#00ff88');
const colorGhost = new THREE.Color('#ffffff');
const colorHint = new THREE.Color('#ffff00');

export const GhostModel = ({ voxelCenter }) => {
    const meshRef = useRef();
    const prevCorrectCountRef = useRef(0);

    // Select only what's needed
    const activeChallenge = useVoxelStore(state => state.activeChallenge);
    const gameMode = useVoxelStore(state => state.gameMode);
    const challengeState = useVoxelStore(state => state.challengeState);
    const isComplete = useVoxelStore(state => state.isComplete);
    const hintVoxel = useVoxelStore(state => state.hintVoxel);
    const filledTargets = useVoxelStore(state => state.filledTargets);
    const metrics = useVoxelStore(state => state.metrics);

    const isMemoryVisible = useRef(true);
    const startTime = useRef(0);

    useEffect(() => {
        if (activeChallenge?.memoryMode) {
            isMemoryVisible.current = true;
            startTime.current = Date.now();
            if (meshRef.current) meshRef.current.visible = true;
        } else {
            isMemoryVisible.current = true;
            if (meshRef.current) meshRef.current.visible = true;
        }
        prevCorrectCountRef.current = 0;
    }, [activeChallenge]);

    // Play sound on new correct placement
    useEffect(() => {
        if (metrics.correctCount > prevCorrectCountRef.current && metrics.correctCount > 0) {
            playCorrect();
        }
        prevCorrectCountRef.current = metrics.correctCount;
    }, [metrics.correctCount]);

    useFrame((state) => {
        if (!meshRef.current || !activeChallenge) return;

        // Memory Mode Timeout
        if (activeChallenge.memoryMode && isMemoryVisible.current) {
            const elapsed = Date.now() - startTime.current;
            if (elapsed > activeChallenge.memoryDuration) {
                isMemoryVisible.current = false;
                meshRef.current.visible = false;
            }
        } else if (!activeChallenge.memoryMode) {
            meshRef.current.visible = true;
        }

        const time = state.clock.getElapsedTime();
        const color = new THREE.Color();

        // Set instance transforms with animation for filled targets
        activeChallenge.targetVoxels.forEach((pos, i) => {
            const posKey = pos.join(',');
            const isFilled = filledTargets.has(posKey);
            const isHint = hintVoxel && hintVoxel.join(',') === posKey;

            dummy.position.set(
                pos[0] - voxelCenter[0],
                pos[1] - voxelCenter[1],
                pos[2] - voxelCenter[2]
            );

            if (isFilled) {
                // Filled target → shrink and fade
                const scale = 0.01;
                dummy.scale.set(scale, scale, scale);
            } else if (isHint) {
                // Hint voxel → pulse
                const pulse = 0.9 + Math.sin(time * 6) * 0.15;
                dummy.scale.set(pulse, pulse, pulse);
            } else {
                // Normal ghost → gentle pulse
                const pulse = 0.95 + Math.sin(time * 3 + i) * 0.05;
                dummy.scale.set(pulse, pulse, pulse);
            }

            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Set color per instance
            if (isFilled) {
                color.copy(colorCorrect);
            } else if (isHint) {
                color.copy(colorHint);
            } else {
                color.copy(colorGhost);
            }
            meshRef.current.setColorAt(i, color);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    });

    if (gameMode !== 'GUIDED' || !activeChallenge || isComplete) return null;
    if (challengeState === 'countdown') return null; // Hide during countdown

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, activeChallenge.targetVoxels.length]}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.2}
                    depthWrite={false}
                    emissive="#00ff88"
                    emissiveIntensity={0.3}
                />
            </instancedMesh>
        </group>
    );
};
