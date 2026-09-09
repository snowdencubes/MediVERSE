'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GestureContextType {
  enabled: boolean;
  setEnabled: (val: boolean) => void;
  pointerPos: { x: number; y: number } | null;
  isPinching: boolean;
}

const GestureContext = createContext<GestureContextType>({
  enabled: false,
  setEnabled: () => {},
  pointerPos: null,
  isPinching: false,
});

export function GestureProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Store as any to avoid needing the type at the top level
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>();
  const isPinchingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function initMediaPipe() {
      if (!enabled) return;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not available. Ensure HTTPS or localhost.");
        }

        // 1. Request camera permission immediately
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.autoplay = true;
        videoRef.current = video;

        // 2. Load heavy models in the background
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        if (!active) return;
        landmarkerRef.current = landmarker;

        video.addEventListener('loadeddata', () => {
          predictWebcam();
        });

      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.warn("Gesture Init: Camera permission denied by user.");
          alert("Camera access was denied. Please allow camera permissions in your browser to use Gesture Controls.");
        } else {
          console.error("Gesture Init Error:", err);
          alert("Gesture Init Error: " + (err.message || String(err)));
        }
        setEnabled(false);
      }
    }

    let lastVideoTime = -1;
    function predictWebcam() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || !enabled) return;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = landmarker.detectForVideo(video, performance.now());
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Index finger tip is 8
          const indexTip = landmarks[8];
          // Thumb tip is 4
          const thumbTip = landmarks[4];

          // Mirror X because it's a user-facing camera
          const x = (1 - indexTip.x) * window.innerWidth;
          const y = indexTip.y * window.innerHeight;
          setPointerPos({ x, y });

          // Calculate distance for pinch
          const dx = indexTip.x - thumbTip.x;
          const dy = indexTip.y - thumbTip.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          const pinching = dist < 0.05;
          
          if (pinching && !isPinchingRef.current) {
            // Trigger a synthetic click!
            const element = document.elementFromPoint(x, y);
            if (element && element instanceof HTMLElement) {
              element.click();
            }
          }
          
          isPinchingRef.current = pinching;
          setIsPinching(pinching);
        } else {
          setPointerPos(null);
          setIsPinching(false);
          isPinchingRef.current = false;
        }
      }
      
      requestRef.current = requestAnimationFrame(predictWebcam);
    }

    if (enabled) {
      initMediaPipe();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setPointerPos(null);
      setIsPinching(false);
      isPinchingRef.current = false;
    }

    return () => {
      active = false;
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled]);

  return (
    <GestureContext.Provider value={{ enabled, setEnabled, pointerPos, isPinching }}>
      {children}
    </GestureContext.Provider>
  );
}

export const useGesture = () => useContext(GestureContext);
