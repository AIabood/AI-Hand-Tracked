import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { handData } from '../handTracking/handData';

const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17] // Palm bases
];

// Corrected Mapping to match HandTracker
const mapLandmark = (lm) => [
    (lm.x - 0.5) * -24,
    -(lm.y - 0.5) * 18,
    -lm.z * 10
];

export const Hand3D = ({ side }) => {
    // Only subscribe to minimal hand data to trigger show/hide
    const isVisible = useVoxelStore((state) => !!state.hands[side].palmPosition);

    const spheresRef = useRef([]);
    const linesRef = useRef([]);

    useFrame(() => {
        const rawLandmarks = handData[side].landmarks;
        if (!rawLandmarks || !isVisible) return;

        const mappedPoints = rawLandmarks.map(mapLandmark);

        // Update joint positions directly via three.js Mesh properties (High performance)
        spheresRef.current.forEach((sphere, i) => {
            if (sphere && mappedPoints[i]) {
                sphere.position.set(...mappedPoints[i]);
            }
        });

        // Update bone points
        // Note: Line in drei is a Line2 (Fat Line). 
        // For best performance, we can use the geometry.setPositions method.
        linesRef.current.forEach((line, i) => {
            if (line && line.geometry) {
                const [start, end] = CONNECTIONS[i];
                const p1 = mappedPoints[start];
                const p2 = mappedPoints[end];

                // setPositions expects a flattened array [x1,y1,z1, x2,y2,z2]
                line.geometry.setPositions([...p1, ...p2]);
                line.computeLineDistances();
            }
        });
    });

    if (!isVisible) return null;

    return (
        <group>
            {/* Joints - using refs for direct position updates */}
            {[...Array(21)].map((_, i) => (
                <Sphere
                    key={i}
                    ref={el => spheresRef.current[i] = el}
                    args={[0.15, 16, 16]}
                >
                    <meshStandardMaterial
                        color={side === 'left' ? '#4dabf7' : '#ff922b'}
                        emissive={side === 'left' ? '#4dabf7' : '#ff922b'}
                        emissiveIntensity={0.5}
                    />
                </Sphere>
            ))}

            {/* Bones - using refs for direct attribute updates */}
            {CONNECTIONS.map((_, i) => (
                <Line
                    key={i}
                    ref={el => linesRef.current[i] = el}
                    points={[[0, 0, 0], [0.001, 0.001, 0.001]]} // Initial dummy points to prevent Drei crash
                    color={side === 'left' ? '#74c0fc' : '#ffa94d'}
                    lineWidth={2}
                    transparent
                    opacity={0.6}
                />
            ))}
        </group>
    );
};
