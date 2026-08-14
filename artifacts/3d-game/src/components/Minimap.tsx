import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { CELL_SIZE } from "../constants";
import type { MazeData } from "../mazeData";

interface MinimapProps {
  playerPos:       React.MutableRefObject<THREE.Vector3>;
  playerYaw:       React.MutableRefObject<number>;
  collectedIds:    Set<number>;
  dronePositions:  React.MutableRefObject<Map<number, THREE.Vector3>>;
  chasingDrones:   React.MutableRefObject<Set<number>>;
  isMobile:        boolean;
  mazeData:        MazeData;
}

function buildMazeBg(mazeData: MazeData, mapSize: number): HTMLCanvasElement {
  const { maze, rows, cols } = mazeData;
  const cw = Math.ceil(mapSize / cols);
  const ch = Math.ceil(mapSize / rows);
  const off = document.createElement("canvas");
  off.width = mapSize;
  off.height = mapSize;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = "#05100a";
  ctx.fillRect(0, 0, mapSize, mapSize);
  ctx.fillStyle = "#112233";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (maze[r][c] === 1)
        ctx.fillRect(Math.floor((c / cols) * mapSize), Math.floor((r / rows) * mapSize), cw + 1, ch + 1);
    }
  }
  return off;
}

export default function Minimap({
  playerPos, playerYaw, collectedIds, dronePositions, chasingDrones, isMobile, mazeData,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef     = useRef<HTMLCanvasElement | null>(null);
  const rafRef    = useRef<number>(0);
  const mapSize   = isMobile ? 110 : 150;

  const { rows, cols, collectiblePositions } = mazeData;
  const OFFSET_X = (cols * CELL_SIZE) / 2;
  const OFFSET_Z = (rows * CELL_SIZE) / 2;

  function worldToMap(wx: number, wz: number) {
    return {
      mx: ((wx + OFFSET_X) / (cols * CELL_SIZE)) * mapSize,
      my: ((wz + OFFSET_Z) / (rows * CELL_SIZE)) * mapSize,
    };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!bgRef.current) bgRef.current = buildMazeBg(mazeData, mapSize);

    ctx.clearRect(0, 0, mapSize, mapSize);
    ctx.drawImage(bgRef.current, 0, 0);

    // Uncollected gems
    collectiblePositions.forEach((pos, i) => {
      if (collectedIds.has(i)) return;
      const { mx, my } = worldToMap(pos.x, pos.z);
      ctx.beginPath();
      ctx.arc(mx, my, isMobile ? 2 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
    });

    // Drones + CET
    const now = Date.now();
    dronePositions.current.forEach((pos, id) => {
      const { mx, my } = worldToMap(pos.x, pos.z);
      const isCET     = id === 999;
      const chasing   = isCET || chasingDrones.current.has(id);
      const pulse     = Math.abs(Math.sin(now / (isCET ? 90 : 120)));

      if (isCET) {
        // CET: large pulsing purple ring
        ctx.beginPath();
        ctx.arc(mx, my, (isMobile ? 7 : 9) + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 0, 255, ${0.2 + pulse * 0.35})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, isMobile ? 4.5 : 6, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(270, 100%, ${50 + pulse * 20}%)`;
        ctx.shadowColor = "#8800ff";
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // "CET" label
        ctx.font        = `bold ${isMobile ? 7 : 8}px monospace`;
        ctx.fillStyle   = "#dd88ff";
        ctx.textAlign   = "center";
        ctx.fillText("CET", mx, my - (isMobile ? 8 : 10));
        ctx.textAlign   = "left";
      } else {
        // Regular drone
        if (chasing) {
          ctx.beginPath();
          ctx.arc(mx, my, (isMobile ? 5.5 : 7) + pulse * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 100, 0, ${0.25 + pulse * 0.35})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(mx, my, chasing ? (isMobile ? 3.5 : 4.5) : (isMobile ? 2.5 : 3), 0, Math.PI * 2);
        ctx.fillStyle = chasing ? "#ff6600" : "#ff3344";
        if (chasing) { ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 6; }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Player triangle
    const { mx, my } = worldToMap(playerPos.current.x, playerPos.current.z);
    const yaw = playerYaw.current;
    const r   = isMobile ? 4 : 5;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(yaw + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.6, r * 0.8);
    ctx.lineTo(-r * 0.6, r * 0.8);
    ctx.closePath();
    ctx.fillStyle  = "#00eeff";
    ctx.shadowColor = "#00eeff";
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, [collectedIds, dronePositions, chasingDrones, isMobile, mapSize, playerPos, playerYaw, mazeData, collectiblePositions]);

  useEffect(() => {
    bgRef.current  = null;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const padding   = 12;
  const topOffset = isMobile ? 72 : 88;

  return (
    <div style={{ position: "fixed", top: topOffset, right: padding, zIndex: 30, pointerEvents: "none" }}>
      <div
        style={{
          width: mapSize, height: mapSize,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(0,220,255,0.35)",
          boxShadow: "0 0 12px rgba(0,180,255,0.25), inset 0 0 6px rgba(0,0,0,0.6)",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <canvas ref={canvasRef} width={mapSize} height={mapSize} style={{ display: "block" }} />
      </div>
      <div style={{
        textAlign: "center", marginTop: 4,
        color: "rgba(0,220,255,0.5)", fontSize: 9,
        letterSpacing: 2, fontFamily: "'Courier New', monospace",
      }}>
        MAP
      </div>
    </div>
  );
}
