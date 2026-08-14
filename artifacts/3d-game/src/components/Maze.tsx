import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { CELL_SIZE, WALL_HEIGHT } from "../constants";
import type { MazeData } from "../mazeData";

const WALL_MATERIAL  = new THREE.MeshBasicMaterial({ color: 0x1a3a5c });
const FLOOR_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x0d2010 });
const CEIL_MATERIAL  = new THREE.MeshBasicMaterial({ color: 0x050d05 });

interface MazeWallsProps {
  mazeData: MazeData;
}

export default function MazeWalls({ mazeData }: MazeWallsProps) {
  const { maze, rows, cols } = mazeData;
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { wallCount, wallGeo, floorGeo, ceilGeo } = useMemo(() => {
    let count = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (maze[r][c] === 1) count++;
    return {
      wallCount: count,
      wallGeo:  new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE),
      floorGeo: new THREE.PlaneGeometry(cols * CELL_SIZE, rows * CELL_SIZE),
      ceilGeo:  new THREE.PlaneGeometry(cols * CELL_SIZE, rows * CELL_SIZE),
    };
  }, [maze, rows, cols]);

  const offsetX = (cols * CELL_SIZE) / 2;
  const offsetZ = (rows * CELL_SIZE) / 2;

  useEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (maze[r][c] !== 1) continue;
        const x = c * CELL_SIZE - offsetX + CELL_SIZE / 2;
        const z = r * CELL_SIZE - offsetZ + CELL_SIZE / 2;
        matrix.setPosition(x, WALL_HEIGHT / 2, z);
        mesh.setMatrixAt(idx++, matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [maze, rows, cols, offsetX, offsetZ]);

  return (
    <>
      <instancedMesh
        ref={instancedRef}
        args={[wallGeo, WALL_MATERIAL, wallCount]}
        frustumCulled={false}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={FLOOR_MATERIAL}>
        <primitive object={floorGeo} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} material={CEIL_MATERIAL}>
        <primitive object={ceilGeo} />
      </mesh>
    </>
  );
}
