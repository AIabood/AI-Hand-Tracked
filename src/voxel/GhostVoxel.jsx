import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVoxelStore } from './useVoxelStore';
import * as THREE from 'three';

export const GhostVoxel = () => {
    const meshRef = useRef();
    const ghost = useVoxelStore((state) => state.ghostVoxel);

    useFrame((state) => {
        if (!meshRef.current || !ghost.visible) return;

        // Apply pulsing animation
        const time = state.clock.getElapsedTime();
        const pulse = 0.92 + Math.sin(time * 5) * 0.08;
        meshRef.current.scale.set(pulse, pulse, pulse);
        
        // Smoothly follow ghost position
        meshRef.current.position.lerp(new THREE.Vector3(...ghost.position), 0.3);
    });

    if (!ghost.visible) return null;

    return (
        <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color="#00e5ff"
                transparent
                opacity={0.35}
                emissive="#00e5ff"
                emissiveIntensity={1.5}
                depthWrite={false}
            />
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
                <lineBasicMaterial color="#00e5ff" transparent opacity={0.5} />
            </lineSegments>
        </mesh>
    );
};
