import { useRef } from 'react';
import { HandTracker } from '../handTracking/HandTracker';
import { useVoxelStore } from '../voxel/useVoxelStore';

export const WebcamView = () => {
    const videoRef = useRef(null);
    const isHandDetected = useVoxelStore((state) => state.isHandDetected);

    return (
        <div className="webcam-container">
            <div className="scanning-line"></div>
            <video
                ref={videoRef}
                className="webcam-feed"
                autoPlay
                playsInline
                muted
            />
            <div className={`video-status ${isHandDetected ? 'detected' : ''}`}>
                {isHandDetected ? 'HANDS TRACKED' : 'INITIALIZING SENSORS...'}
            </div>
            <HandTracker videoRef={videoRef} />
        </div>
    );
};
