import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { CELL_SIZE } from "../constants";
import type { MazeData } from "../mazeData";
import type { MobileState } from "../hooks/useMobileControls";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

import { PLAYER_SPEED, PLAYER_RADIUS } from "../constants";

interface PlayerProps {
  startPosition: THREE.Vector3;
  onPositionUpdate: (pos: THREE.Vector3) => void;
  isLocked: boolean;
  mobileState: React.MutableRefObject<MobileState>;
  isMobile: boolean;
  yawRef: React.MutableRefObject<number>;
  mazeData: MazeData;
}

const _euler   = new THREE.Euler(0, 0, 0, "YXZ");
const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();
const _dir     = new THREE.Vector3();

export default function Player({
  startPosition, onPositionUpdate, isLocked, mobileState, isMobile, yawRef, mazeData,
}: PlayerProps) {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  const position = useRef(startPosition.clone());
  const yaw      = yawRef;
  const pitch    = useRef(0);

  const { maze, rows, cols } = mazeData;
  const OFFSET_X = (cols * CELL_SIZE) / 2;
  const OFFSET_Z = (rows * CELL_SIZE) / 2;

  function worldToCell(wx: number, wz: number) {
    return {
      col: Math.floor((wx + OFFSET_X) / CELL_SIZE),
      row: Math.floor((wz + OFFSET_Z) / CELL_SIZE),
    };
  }

  function isWall(col: number, row: number): boolean {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
    return maze[row][col] === 1;
  }

  useEffect(() => {
    position.current.copy(startPosition);
    position.current.y = 1;
    camera.position.copy(position.current);
  }, [startPosition, camera]);

  useEffect(() => {
    if (isMobile) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      yaw.current -= e.movementX * 0.002;
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current - e.movementY * 0.002));
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [isLocked, isMobile, yaw]);

  const walkTime     = useRef(0);
  const headBobY     = useRef(0);
  const headBobSway  = useRef(0);
  const strafeRoll   = useRef(0);

  useFrame((_, delta) => {
    if (!isLocked && !isMobile) return;

    if (isMobile) {
      yaw.current -= mobileState.current.lookDeltaX;
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current - mobileState.current.lookDeltaY));
      mobileState.current.lookDeltaX = 0;
      mobileState.current.lookDeltaY = 0;
    }

    const sy = Math.sin(yaw.current);
    const cy = Math.cos(yaw.current);
    _forward.set(-sy, 0, -cy);
    _right.set(cy, 0, -sy);

    const keys = getKeys();
    _dir.set(0, 0, 0);
    let targetStrafe = 0;

    if (keys.forward) _dir.add(_forward);
    if (keys.back)    _dir.sub(_forward);
    if (keys.left)   { _dir.sub(_right); targetStrafe -= 0.035; }
    if (keys.right)  { _dir.add(_right); targetStrafe += 0.035; }

    if (isMobile) {
      const { forward: mf, right: mr } = mobileState.current;
      if (Math.abs(mf) > 0.05) _dir.addScaledVector(_forward, mf);
      if (Math.abs(mr) > 0.05) {
        _dir.addScaledVector(_right, mr);
        targetStrafe += mr * 0.035;
      }
    }

    // Smooth camera strafe lean lerp
    strafeRoll.current = THREE.MathUtils.lerp(strafeRoll.current, targetStrafe, 8 * delta);

    if (_dir.lengthSq() > 0) {
      _dir.normalize().multiplyScalar(PLAYER_SPEED * delta);

      const newX = position.current.x + _dir.x;
      const cxL = worldToCell(newX - PLAYER_RADIUS, position.current.z);
      const cxR = worldToCell(newX + PLAYER_RADIUS, position.current.z);
      if (!isWall(cxL.col, cxL.row) && !isWall(cxR.col, cxR.row))
        position.current.x = newX;

      const newZ = position.current.z + _dir.z;
      const czF = worldToCell(position.current.x, newZ - PLAYER_RADIUS);
      const czB = worldToCell(position.current.x, newZ + PLAYER_RADIUS);
      if (!isWall(czF.col, czF.row) && !isWall(czB.col, czB.row))
        position.current.z = newZ;

      walkTime.current += delta * 11;
      headBobY.current = Math.sin(walkTime.current) * 0.035;
      headBobSway.current = Math.cos(walkTime.current * 0.5) * 0.004;
    } else {
      walkTime.current = 0;
      headBobY.current = THREE.MathUtils.lerp(headBobY.current, 0, 10 * delta);
      headBobSway.current = THREE.MathUtils.lerp(headBobSway.current, 0, 10 * delta);
    }

    _euler.set(pitch.current, yaw.current, headBobSway.current - strafeRoll.current);
    camera.quaternion.setFromEuler(_euler);
    camera.position.set(position.current.x, 1 + headBobY.current, position.current.z);
    onPositionUpdate(position.current);
  });

  return null;
}
