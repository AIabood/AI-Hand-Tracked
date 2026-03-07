import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import { useVoxelStore } from '../voxel/useVoxelStore';
import * as THREE from 'three';

export const DrawTrail = () => {
    const drawTrail = useVoxelStore((state) => state.drawTrail);
    const mode = useVoxelStore((state) => state.mode);

    // Choose color based on voxel mode (matching cursor)
    const color = mode === 'add' ? '#00ff88' : '#ff4444';

    if (!drawTrail || drawTrail.length === 0) return null;

    return (
        <group>
            {drawTrail.map((point, i) => (
                <TrailPoint
                    key={`${point.ts}-${i}`}
                    point={point}
                    color={color}
                />
            ))}
        </group>
    );
};

const TrailPoint = ({ point, color }) => {
    const meshRef = useRef();
    const TRAIL_FADE_MS = 1200;

    useFrame(() => {
        if (!meshRef.current) return;

        const age = Date.now() - point.ts;
        const opacity = Math.max(0, 0.8 * (1 - age / TRAIL_FADE_MS));

        meshRef.current.material.opacity = opacity;

        // Slightly shrink as it fades
        const scale = 1 - (age / TRAIL_FADE_MS) * 0.5;
        meshRef.current.scale.setScalar(scale);
    });

    return (
        <Sphere ref={meshRef} position={point.pos} args={[0.25, 16, 16]}>
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                transparent
                opacity={0.8}
            />
        </Sphere>
    );
};
