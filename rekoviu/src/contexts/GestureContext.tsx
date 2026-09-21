'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GestureContextType {
  enabled: boolean;
  setEnabled: (val: boolean) => void;
  pointerPos: { x: number; y: number } | null;
  isPinching: boolean;
  hasFace: boolean;
  status: 'off' | 'loading' | 'no_face' | 'face_detected' | 'tracking';
}

const GestureContext = createContext<GestureContextType>({
  enabled: false,
  setEnabled: () => {},
  pointerPos: null,
  isPinching: false,
  hasFace: false,
  status: 'off',
});

// Smoothing factor for pointer (0 = no smoothing, 1 = frozen)
const SMOOTH = 0.55;
// Pinch thresholds with hysteresis to prevent flickering
const PINCH_START_DIST = 0.045;
const PINCH_END_DIST = 0.065;


export function GestureProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [status, setStatus] = useState<'off' | 'loading' | 'no_face' | 'face_detected' | 'tracking'>('off');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>();
  const isPinchingRef = useRef(false);
  const enabledRef = useRef(false);
  const smoothPosRef = useRef<{ x: number; y: number } | null>(null);
  const frameCountRef = useRef(0);
  const clickCooldownRef = useRef(0);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!enabled) return;
      setStatus('loading');

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not available. Ensure HTTPS or localhost.");
        }

        // 1. Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.muted = true;
        video.srcObject = stream;
        videoRef.current = video;
        await video.play();
        console.log('[Gesture] Camera playing:', video.videoWidth, 'x', video.videoHeight);
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        // 2. Load MediaPipe models (Hand)
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        if (!active) return;



        // Hand Landmarker
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (!active) return;
        handLandmarkerRef.current = handLandmarker;
        console.log('[Gesture] HandLandmarker loaded');

        setStatus('tracking');
        detectLoop();

      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          alert("Camera access denied. Please allow camera permissions to use Gesture Controls.");
        } else {
          console.error("[Gesture] Init Error:", err);
          alert("Gesture Init Error: " + (err.message || String(err)));
        }
        setEnabled(false);
        setStatus('off');
      }
    }

    let lastVideoTime = -1;

    function detectLoop() {
      const video = videoRef.current;
      const handLandmarker = handLandmarkerRef.current;

      if (!video || !handLandmarker || !enabledRef.current) return;
      if (video.readyState < 2) {
        requestRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        frameCountRef.current++;

        // Decrement click cooldown
        if (clickCooldownRef.current > 0) clickCooldownRef.current--;

        // --- HAND TRACKING (unconditional) ---
        if (true) {
          try {
            const handResults = handLandmarker.detectForVideo(video, now);

            if (handResults.landmarks && handResults.landmarks.length > 0) {
              const lm = handResults.landmarks[0];
              setStatus('tracking');

              // Index finger tip = 8, Thumb tip = 4
              const indexTip = lm[8];
              const thumbTip = lm[4];

              // Mirror X for selfie camera
              const rawX = (1 - indexTip.x) * window.innerWidth;
              const rawY = indexTip.y * window.innerHeight;

              // Apply exponential smoothing
              if (smoothPosRef.current) {
                smoothPosRef.current = {
                  x: smoothPosRef.current.x * SMOOTH + rawX * (1 - SMOOTH),
                  y: smoothPosRef.current.y * SMOOTH + rawY * (1 - SMOOTH),
                };
              } else {
                smoothPosRef.current = { x: rawX, y: rawY };
              }
              setPointerPos({ ...smoothPosRef.current });

              // Pinch detection with hysteresis
              const dx = indexTip.x - thumbTip.x;
              const dy = indexTip.y - thumbTip.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              const wasPinching = isPinchingRef.current;
              const nowPinching = wasPinching
                ? dist < PINCH_END_DIST    // Wider threshold to release
                : dist < PINCH_START_DIST; // Tighter threshold to start

              if (nowPinching && !wasPinching && clickCooldownRef.current <= 0) {
                // Fire synthetic click
                const el = document.elementFromPoint(
                  smoothPosRef.current.x,
                  smoothPosRef.current.y
                );
                if (el && el instanceof HTMLElement) {
                  el.click();
                }
                // 15 frame cooldown (~250ms) to prevent double clicks
                clickCooldownRef.current = 15;
              }

              isPinchingRef.current = nowPinching;
              setIsPinching(nowPinching);
            } else {
              // Hand lost
              setPointerPos(null);
              smoothPosRef.current = null;
              setIsPinching(false);
              isPinchingRef.current = false;
              setStatus('tracking');
            }
          } catch (e) {
            console.error('[Gesture] Hand detection error:', e);
          }
        }
      }

      requestRef.current = requestAnimationFrame(detectLoop);
    }

    if (enabled) {
      init();
    } else {
      // Cleanup
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current = null;
      }
      handLandmarkerRef.current = null;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setPointerPos(null);
      setIsPinching(false);
      setHasFace(false);
      isPinchingRef.current = false;
      smoothPosRef.current = null;
      frameCountRef.current = 0;
      setStatus('off');
    }

    return () => {
      active = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current = null;
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled]);

  return (
    <GestureContext.Provider value={{ enabled, setEnabled, pointerPos, isPinching, hasFace, status }}>
      {children}
    </GestureContext.Provider>
  );
}

export const useGesture = () => useContext(GestureContext);
