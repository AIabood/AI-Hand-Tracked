import * as THREE from 'three';

export const Voxel = ({ position, type = 'default' }) => {
    let color = '#333';
    let emissive = '#000';
    let emissiveIntensity = 0;

    if (type === 'correct') {
        color = '#00ff88';
        emissive = '#00ff88';
        emissiveIntensity = 0.5;
    } else if (type === 'extra') {
        color = '#ff4444';
        emissive = '#ff4444';
        emissiveIntensity = 0.5;
    } else if (type === 'mistake') {
        color = '#ff0000';
        emissive = '#ff0000';
        emissiveIntensity = 2.0;
    }

    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color={color}
                roughness={0.7}
                metalness={0.2}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
            />
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                <lineBasicMaterial color={type === 'default' ? '#555' : color} />
            </lineSegments>
        </mesh>
    );
};

