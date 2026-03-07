/**
 * Shared Hand Data (Non-reactive)
 * Used to store high-frequency landmark data for 3D rendering
 * without triggering React re-renders via Zustand.
 */
export const handData = {
    left: {
        landmarks: null,
        palmPosition: [0, 0, 0],
        pinchPosition: [0, 0, 0],
    },
    right: {
        landmarks: null,
        palmPosition: [0, 0, 0],
        pinchPosition: [0, 0, 0],
    }
};
