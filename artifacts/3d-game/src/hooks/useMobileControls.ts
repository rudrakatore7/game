import { useRef, useEffect, useCallback } from "react";

export interface MobileState {
  forward: number;
  right: number;
  lookDeltaX: number;
  lookDeltaY: number;
}

import { JOYSTICK_RADIUS, TOUCH_SENSITIVITY } from "../constants";
export function useMobileControls(enabled: boolean) {
  const state = useRef<MobileState>({ forward: 0, right: 0, lookDeltaX: 0, lookDeltaY: 0 });

  // Joystick touch
  const joystickTouch = useRef<number | null>(null);
  const joystickOrigin = useRef({ x: 0, y: 0 });

  // Look touch (right half of screen)
  const lookTouch = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  // Callbacks for UI
  const knobPos = useRef({ x: 0, y: 0 });
  const onKnobChange = useRef<((x: number, y: number) => void) | null>(null);

  const setKnobListener = useCallback((fn: (x: number, y: number) => void) => {
    onKnobChange.current = fn;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const isLeft = t.clientX < window.innerWidth / 2;

        if (isLeft && joystickTouch.current === null) {
          joystickTouch.current = t.identifier;
          joystickOrigin.current = { x: t.clientX, y: t.clientY };
          knobPos.current = { x: 0, y: 0 };
          onKnobChange.current?.(0, 0);
        } else if (!isLeft && lookTouch.current === null) {
          lookTouch.current = t.identifier;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      state.current.lookDeltaX = 0;
      state.current.lookDeltaY = 0;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];

        if (t.identifier === joystickTouch.current) {
          const dx = t.clientX - joystickOrigin.current.x;
          const dy = t.clientY - joystickOrigin.current.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const clamped = Math.min(len, JOYSTICK_RADIUS);
          const angle = Math.atan2(dy, dx);
          const nx = (clamped / JOYSTICK_RADIUS) * Math.cos(angle);
          const ny = (clamped / JOYSTICK_RADIUS) * Math.sin(angle);

          // ny = forward/back (up = forward), nx = left/right
          state.current.forward = -ny;
          state.current.right = nx;

          const kx = Math.cos(angle) * Math.min(clamped, JOYSTICK_RADIUS);
          const ky = Math.sin(angle) * Math.min(clamped, JOYSTICK_RADIUS);
          knobPos.current = { x: kx, y: ky };
          onKnobChange.current?.(kx, ky);
        }

        if (t.identifier === lookTouch.current) {
          state.current.lookDeltaX = (t.clientX - lookLast.current.x) * TOUCH_SENSITIVITY;
          state.current.lookDeltaY = (t.clientY - lookLast.current.y) * TOUCH_SENSITIVITY;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouch.current) {
          joystickTouch.current = null;
          state.current.forward = 0;
          state.current.right = 0;
          knobPos.current = { x: 0, y: 0 };
          onKnobChange.current?.(0, 0);
        }
        if (t.identifier === lookTouch.current) {
          lookTouch.current = null;
          state.current.lookDeltaX = 0;
          state.current.lookDeltaY = 0;
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled]);

  return { state, setKnobListener };
}

export function isMobile(): boolean {
  return navigator.maxTouchPoints > 0 || window.innerWidth < 768;
}
