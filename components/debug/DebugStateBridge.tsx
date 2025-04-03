"use client";

import { useEffect, Dispatch, SetStateAction } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DebugStateBridgeProps {
    isDebugMode: boolean;
    saveCameraTrigger: number;
    saveSlotTarget: 1 | 2;
    recallCameraTrigger: number;
    recallSlotTarget: 1 | 2;
    setSavedCameraPos1: Dispatch<SetStateAction<THREE.Vector3 | null>>;
    setSavedCameraQuat1: Dispatch<SetStateAction<THREE.Quaternion | null>>;
    setSavedCameraPos2: Dispatch<SetStateAction<THREE.Vector3 | null>>;
    setSavedCameraQuat2: Dispatch<SetStateAction<THREE.Quaternion | null>>;
    savedCameraPos1: THREE.Vector3 | null;
    savedCameraQuat1: THREE.Quaternion | null;
    savedCameraPos2: THREE.Vector3 | null;
    savedCameraQuat2: THREE.Quaternion | null;
}

export default function DebugStateBridge({
    isDebugMode,
    saveCameraTrigger,
    saveSlotTarget,
    recallCameraTrigger,
    recallSlotTarget,
    setSavedCameraPos1,
    setSavedCameraQuat1,
    setSavedCameraPos2,
    setSavedCameraQuat2,
    savedCameraPos1,
    savedCameraQuat1,
    savedCameraPos2,
    savedCameraQuat2,
}: DebugStateBridgeProps) {
    const { camera } = useThree();

    // Effect to handle SAVING camera state
    useEffect(() => {
        // Only run if trigger changed (ignore initial render)
        if (saveCameraTrigger > 0) {
            const pos = camera.position.clone();
            const quat = camera.quaternion.clone();
            if (saveSlotTarget === 1) {
                setSavedCameraPos1(pos);
                setSavedCameraQuat1(quat);
                console.log("Saved Camera State to Slot 1:", pos, quat);
            } else { // Slot 2
                setSavedCameraPos2(pos);
                setSavedCameraQuat2(quat);
                console.log("Saved Camera State to Slot 2:", pos, quat);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveCameraTrigger]); // Only trigger on saveCameraTrigger change

    // Effect to handle RECALLING camera state
    useEffect(() => {
        // Only run if trigger changed and in debug mode
        if (recallCameraTrigger > 0 && isDebugMode) {
            let posToRecall: THREE.Vector3 | null = null;
            let quatToRecall: THREE.Quaternion | null = null;

            if (recallSlotTarget === 1) {
                posToRecall = savedCameraPos1;
                quatToRecall = savedCameraQuat1;
            } else { // Slot 2
                posToRecall = savedCameraPos2;
                quatToRecall = savedCameraQuat2;
            }

            if (posToRecall && quatToRecall) {
                camera.position.copy(posToRecall);
                camera.quaternion.copy(quatToRecall);
                console.log(`Recalled Camera State from Slot ${recallSlotTarget}`);
                // Potentially need camera.updateProjectionMatrix() if aspect/fov changed, but probably not here
            } else {
                console.log(`Recall failed: Slot ${recallSlotTarget} not saved.`);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recallCameraTrigger]); // Only trigger on recallCameraTrigger change

    return null; // This component doesn't render anything
} 