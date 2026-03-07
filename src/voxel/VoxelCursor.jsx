import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVoxelStore } from './useVoxelStore';
import * as THREE from 'three';

export const VoxelCursor = ({ voxelCenter }) => {
    const meshRef = useRef();
    const cursorPosition = useVoxelStore(state => state.cursorPosition);
    const mode = useVoxelStore(state => state.mode);
    const isHandDetected = useVoxelStore(state => state.isHandDetected);
    const isCursorReady = useVoxelStore(state => state.isCursorReady);
    const spinnerRef = useRef();

    // the group that contains voxels is rotated/transformed by these values
    const sceneQuaternion = useVoxelStore(state => state.sceneQuaternion);
    const scenePosition = useVoxelStore(state => state.scenePosition);
    const sceneScale = useVoxelStore(state => state.sceneScale);

    useFrame((state) => {
        if (!meshRef.current) return;

        // 1. Position Interpolation (Existing)
        const worldX = Math.round(cursorPosition[0]);
        const worldY = Math.round(cursorPosition[1]);
        const worldZ = Math.round(cursorPosition[2]);

        const q = new THREE.Quaternion(...sceneQuaternion);
        const qInv = q.clone().invert();
        const groupPos = new THREE.Vector3(
            scenePosition[0] + voxelCenter[0],
            scenePosition[1] + voxelCenter[1],
            scenePosition[2] + voxelCenter[2]
        );

        const worldTarget = new THREE.Vector3(worldX, worldY, worldZ);
        const localTarget = worldTarget
            .sub(groupPos)
            .applyQuaternion(qInv)
            .divideScalar(sceneScale || 1.0);

        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, localTarget.x, 0.2);
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, localTarget.y, 0.2);
        meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, localTarget.z, 0.2);

        // 2. Spinner Animation
        if (spinnerRef.current) {
            spinnerRef.current.rotation.z += 0.1;
            spinnerRef.current.rotation.x += 0.05;
        }
    });

    if (!isHandDetected) return null;

    return (
        <mesh ref={meshRef}>
            {!isCursorReady ? (
                // --- Spinner (Warm-up Phase) ---
                <group ref={spinnerRef}>
                    <torusGeometry args={[0.6, 0.1, 16, 32]} />
                    <meshStandardMaterial
                        color="#00ffff"
                        emissive="#00ffff"
                        emissiveIntensity={2}
                        transparent
                        opacity={0.8}
                    />
                </group>
            ) : (
                // --- Standard Cursor (Action Phase) ---
                <>
                    <boxGeometry args={[1.05, 1.05, 1.05]} />
                    <meshStandardMaterial
                        color={mode === 'add' ? '#00ff88' : '#ff4444'}
                        transparent
                        opacity={0.4}
                        emissive={mode === 'add' ? '#00ff88' : '#ff4444'}
                        emissiveIntensity={1.5}
                    />
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(1.05, 1.05, 1.05)]} />
                        <lineBasicMaterial color={mode === 'add' ? '#00ff88' : '#ff4444'} />
                    </lineSegments>
                </>
            )}
        </mesh>
    );
};
