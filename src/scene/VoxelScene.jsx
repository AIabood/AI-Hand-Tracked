import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float } from '@react-three/drei';
import { VoxelCursor } from '../voxel/VoxelCursor';
import { Voxel } from '../voxel/Voxel';
import { GhostVoxel } from '../voxel/GhostVoxel';
import { GhostModel } from '../voxel/GhostModel';
import { useVoxelStore } from '../voxel/useVoxelStore';
import { Hand3D } from './Hand3D';
import { SceneInteraction } from './SceneInteraction';
import { TrackpadInteraction } from './TrackpadInteraction';
import { DrawTrail } from './DrawTrail';
import { useMemo } from 'react';
export const VoxelScene = () => {
    const voxels = useVoxelStore((state) => state.voxels);
    const sceneQuaternion = useVoxelStore((state) => state.sceneQuaternion);
    const scenePosition = useVoxelStore((state) => state.scenePosition);
    const sceneScale = useVoxelStore((state) => state.sceneScale);
    const getVoxelCenter = useVoxelStore((state) => state.getVoxelCenter);

    // Get the consistent center from the store
    const voxelCenter = getVoxelCenter();

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 5, 20]} fov={50} />

                {/* Lighting - Enhanced for WOW factor */}
                <ambientLight intensity={0.4} />
                <pointLight position={[15, 15, 15]} castShadow intensity={1.5} shadow-mapSize={[2048, 2048]} />
                <spotLight position={[-15, 20, 10]} angle={0.25} penumbra={1} castShadow intensity={2} color="#4dabf7" />
                <rectAreaLight position={[0, 10, 0]} width={10} height={10} intensity={0.5} />

                {/* Stars and Environment */}
                <Stars radius={100} depth={50} count={7000} factor={4} saturation={0.5} fade speed={1.5} />
                <fog attach="fog" args={['#050505', 20, 60]} />

                {/* Hand Interaction Logic (External to rotation) */}
                <SceneInteraction />
                <TrackpadInteraction />

                {/* Hand Visuals (Camera Space / World Space HUD) */}
                <Hand3D side="left" />
                <Hand3D side="right" />
                <DrawTrail />

                {/* Rotatable and Translatable World Group */}
                <group
                    quaternion={sceneQuaternion}
                    position={[
                        scenePosition[0] + voxelCenter[0],
                        scenePosition[1] + voxelCenter[1],
                        scenePosition[2] + voxelCenter[2]
                    ]}
                    scale={[sceneScale, sceneScale, sceneScale]}
                >
                    {/* Ghost Model (Target Shape) */}
                    <GhostModel voxelCenter={voxelCenter} />

                    {/* Cursor */}
                    <VoxelCursor voxelCenter={voxelCenter} />

                    {/* Ghost Voxel Preview (Index Finger) */}
                    <GhostVoxel />

                    {/* Voxels */}
                    {voxels.map((voxel) => (
                        <Voxel
                            key={voxel.id}
                            position={[
                                voxel.position[0] - voxelCenter[0],
                                voxel.position[1] - voxelCenter[1],
                                voxel.position[2] - voxelCenter[2]
                            ]}
                            type={voxel.type}
                        />
                    ))}
                </group>
            </Canvas>
        </div>
    );
};
