import { useVoxelStore } from '../voxel/useVoxelStore';
import { Box, Trash2 } from 'lucide-react';
import { GuidedUI } from './GuidedUI';

export const UIOverlay = () => {
    const mode = useVoxelStore(state => state.mode);
    const voxels = useVoxelStore(state => state.voxels);

    return (
        <div className="ui-overlay">
            <div className="header">
                <h1>AI HAND-TRACKED VOXEL BUILDER</h1>
                <div className="separator"></div>
            </div>

            <GuidedUI />

            <div className="stats-panel glass">
                <div className={`mode-indicator ${mode}`}>
                    {mode === 'add' ? <Box size={24} /> : <Trash2 size={24} />}
                    <span>{mode.toUpperCase()} MODE</span>
                </div>
                <div className="block-count">
                    <span className="label">Total Blocks</span>
                    <span className="value">{voxels.length}</span>
                </div>
            </div>
        </div>
    );
};

