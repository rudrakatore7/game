import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

interface SmartCrosshairProps {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  playerYaw: React.MutableRefObject<number>;
  dronePositions: React.MutableRefObject<Map<number, THREE.Vector3>>;
  chasingDrones: React.MutableRefObject<Set<number>>;
  isFiring: boolean;
  hitmarker: boolean;
}

export default function SmartCrosshair({
  playerPos, playerYaw, dronePositions, chasingDrones, isFiring, hitmarker
}: SmartCrosshairProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const size = 160;
  const center = size / 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    const yaw = playerYaw.current; // Player facing direction (radians)

    // Draw base crosshair circle
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 243, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw crosshair lines
    const gap = isFiring ? 12 : 6;
    const length = 8;
    ctx.strokeStyle = hitmarker ? "#ff003c" : "rgba(0, 243, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top
    ctx.moveTo(center, center - gap);
    ctx.lineTo(center, center - gap - length);
    // Bottom
    ctx.moveTo(center, center + gap);
    ctx.lineTo(center, center + gap + length);
    // Left
    ctx.moveTo(center - gap, center);
    ctx.lineTo(center - gap - length, center);
    // Right
    ctx.moveTo(center + gap, center);
    ctx.lineTo(center + gap + length, center);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(center, center, hitmarker ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = hitmarker ? "#ff003c" : "rgba(255, 255, 255, 0.9)";
    if (hitmarker) {
      ctx.shadowColor = "#ff003c";
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hitmarker X
    if (hitmarker) {
      const xGap = 6;
      const xLen = 14;
      ctx.strokeStyle = "#ff003c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center - xGap, center - xGap);
      ctx.lineTo(center - xLen, center - xLen);
      ctx.moveTo(center + xGap, center + xGap);
      ctx.lineTo(center + xLen, center + xLen);
      ctx.moveTo(center + xGap, center - xGap);
      ctx.lineTo(center + xLen, center - xLen);
      ctx.moveTo(center - xGap, center + xGap);
      ctx.lineTo(center - xLen, center + xLen);
      ctx.stroke();
    }

    // Threat Indicators (Radar Ring)
    const px = playerPos.current.x;
    const pz = playerPos.current.z;

    dronePositions.current.forEach((pos, id) => {
      const dx = pos.x - px;
      const dz = pos.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      // Only show threats within a certain radius
      if (dist > 30) return;
      
      const angleToEnemy = Math.atan2(dx, dz);
      
      const relativeAngle = angleToEnemy + yaw;
      
      const isChasing = chasingDrones.current.has(id);
      const isCET = id === 999;
      
      const ringRadius = 45;
      const alpha = 1.0 - (dist / 30); 
      
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(relativeAngle);
      
      ctx.beginPath();
      const arcSpread = isCET ? 0.3 : 0.15;
      ctx.arc(0, 0, ringRadius, -arcSpread, arcSpread);
      ctx.lineWidth = isChasing ? 4 : 2;
      
      if (isCET) {
        ctx.strokeStyle = `rgba(150, 0, 255, ${alpha})`;
        ctx.shadowColor = "#aa00ff";
        ctx.shadowBlur = 8;
      } else if (isChasing) {
        ctx.strokeStyle = `rgba(255, 0, 60, ${alpha})`;
        ctx.shadowColor = "#ff003c";
        ctx.shadowBlur = 5;
      } else {
        ctx.strokeStyle = `rgba(255, 150, 0, ${alpha * 0.6})`;
      }
      
      ctx.stroke();
      ctx.restore();
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [playerPos, playerYaw, dronePositions, chasingDrones, isFiring, hitmarker]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 50,
      width: size,
      height: size,
    }}>
      <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />
    </div>
  );
}
