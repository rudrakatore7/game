import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CollectibleProps {
  position: [number, number, number];
  id: number;
  onCollect: (id: number) => void;
  playerPosition: THREE.Vector3;
}

// Shared geometry & material allocations
const GEM_GEO   = new THREE.OctahedronGeometry(0.38, 0);
const RING_GEO  = new THREE.TorusGeometry(0.55, 0.02, 8, 24);

const GEM_MAT   = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xcc8800, emissiveIntensity: 0.7 });
const RING_MAT  = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.7 });

const _tmpVec = new THREE.Vector3();

export default function Collectible({ position, id, onCollect, playerPosition }: CollectibleProps) {
  const groupRef  = useRef<THREE.Group>(null);
  const gemRef    = useRef<THREE.Mesh>(null);
  const ring1Ref  = useRef<THREE.Mesh>(null);
  const ring2Ref  = useRef<THREE.Mesh>(null);

  const collected = useRef(false);
  const baseY     = position[1];

  useFrame((state, delta) => {
    if (!groupRef.current || collected.current) return;

    const t = state.clock.elapsedTime + id * 1.5;

    // Smooth floating wave + breathing scale
    groupRef.current.position.y = baseY + Math.sin(t * 2.4) * 0.18;
    const breathe = 1 + Math.sin(t * 4) * 0.08;
    groupRef.current.scale.setScalar(breathe);

    // Gem rotation
    if (gemRef.current) {
      gemRef.current.rotation.y += delta * 2.2;
      gemRef.current.rotation.x += delta * 0.8;
    }

    // Dual counter-rotating outer rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 3;
      ring1Ref.current.rotation.z += delta * 2.8;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -Math.PI / 3;
      ring2Ref.current.rotation.z -= delta * 2.2;
    }

    // Distance check for pickup
    _tmpVec.set(position[0], position[1], position[2]);
    if (playerPosition.distanceTo(_tmpVec) < 1.25) {
      collected.current = true;
      onCollect(id);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Central Octahedron Gem */ }
      <mesh ref={gemRef} geometry={GEM_GEO} material={GEM_MAT} />

      {/* Outer Ring 1 */ }
      <mesh ref={ring1Ref} geometry={RING_GEO} material={RING_MAT} />

      {/* Outer Ring 2 */ }
      <mesh ref={ring2Ref} geometry={RING_GEO} material={RING_MAT} />

      {/* Gold Aura Point Light */ }
      <pointLight color={0xffd700} intensity={1.8} distance={3.5} />
    </group>
  );
}
