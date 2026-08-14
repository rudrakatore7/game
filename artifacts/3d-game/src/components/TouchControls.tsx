import { useEffect, useState, useRef } from "react";

import { JOYSTICK_RADIUS, KNOB_RADIUS } from "../constants";

interface TouchControlsProps {
  onKnobRegister: (fn: (x: number, y: number) => void) => void;
}

export default function TouchControls({ onKnobRegister }: TouchControlsProps) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const setKnobRef = useRef(setKnob);
  setKnobRef.current = setKnob;

  useEffect(() => {
    onKnobRegister((x, y) => setKnobRef.current({ x, y }));
  }, [onKnobRegister]);

  return (
    <>
      {/* Left side: Joystick base */}
      <div
        style={{
          position: "fixed",
          bottom: 50,
          left: 40,
          width: JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "2px solid rgba(255,255,255,0.25)",
          pointerEvents: "none",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Knob */}
        <div
          style={{
            position: "absolute",
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.35)",
            border: "2px solid rgba(255,255,255,0.6)",
            transform: `translate(${knob.x}px, ${knob.y}px)`,
            transition: knob.x === 0 && knob.y === 0 ? "transform 0.15s ease" : "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Right side hint */}
      <div
        style={{
          position: "fixed",
          bottom: 50,
          right: 40,
          pointerEvents: "none",
          zIndex: 50,
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.25)",
            borderRadius: 12,
            padding: "10px 16px",
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          DRAG TO LOOK
        </div>
      </div>
    </>
  );
}
