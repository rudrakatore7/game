import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHASE_RANGE, CHASE_SPEED_MULT, HIT_DISTANCE, HIT_COOLDOWN_MS } from "../constants";

const _diff     = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

// Shared geometries & materials for drone model
const CORE_GEO   = new THREE.OctahedronGeometry(0.48, 1);
const ROTOR_GEO  = new THREE.BoxGeometry(0.36, 0.02, 0.06);
const ARM_GEO    = new THREE.CylinderGeometry(0.025, 0.025, 0.45);
const EYE_GEO    = new THREE.SphereGeometry(0.14, 8, 8);

const matDarkMetal = new THREE.MeshLambertMaterial({ color: 0x1a1a24 });
const matRotor     = new THREE.MeshLambertMaterial({ color: 0x333344 });

interface ObstacleProps {
  pathA:          THREE.Vector3;
  pathB:          THREE.Vector3;
  speed:          number;
  id:             number;
  isDamaged:      boolean;
  onHit:          (id: number) => void;
  onChaseStart:   (id: number) => void;
  onChaseEnd:     (id: number) => void;
  playerPosition: THREE.Vector3;
  dronePositions: React.MutableRefObject<Map<number, THREE.Vector3>>;
}

export default function Obstacle({
  pathA, pathB, speed, id, isDamaged,
  onHit, onChaseStart, onChaseEnd,
  playerPosition, dronePositions,
}: ObstacleProps) {
  const groupRef    = useRef<THREE.Group>(null);
  const matRef      = useRef<THREE.MeshLambertMaterial>(null);
  const eyeMatRef   = useRef<THREE.MeshBasicMaterial>(null);
  const rotorGroup  = useRef<THREE.Group>(null);
  const lightRef    = useRef<THREE.PointLight>(null);

  const direction   = useRef(1);
  const pos         = useRef(pathA.clone());
  const lastHit     = useRef(0);
  const phase       = useRef(id * 1.3);
  const wasChasing  = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current || !matRef.current) return;

    phase.current += delta;
    const t = phase.current;

    const distToPlayer = pos.current.distanceTo(playerPosition);
    const chasing      = distToPlayer < CHASE_RANGE;

    // Chase callbacks
    if (chasing && !wasChasing.current) {
      wasChasing.current = true;
      onChaseStart(id);
    } else if (!chasing && wasChasing.current) {
      wasChasing.current = false;
      onChaseEnd(id);
    }

    if (chasing) {
      _toPlayer.copy(playerPosition).sub(pos.current);
      _toPlayer.y = 0;
      if (_toPlayer.length() > 0.1)
        pos.current.addScaledVector(_toPlayer.normalize(), speed * CHASE_SPEED_MULT * delta);
    } else {
      const target = direction.current === 1 ? pathB : pathA;
      _diff.copy(target).sub(pos.current);
      const dist = _diff.length();
      if (dist < 0.1) direction.current *= -1;
      else pos.current.addScaledVector(_diff.normalize(), speed * delta);
    }

    // Hover bobbing Y + damaged glitch jitter offset
    let glitchX = 0;
    let glitchZ = 0;
    if (isDamaged) {
      glitchX = (Math.random() - 0.5) * 0.08;
      glitchZ = (Math.random() - 0.5) * 0.08;
    }

    const bobY = 0.6 + Math.sin(t * 3.2) * 0.22;
    groupRef.current.position.set(pos.current.x + glitchX, bobY, pos.current.z + glitchZ);

    // Rotation logic
    if (chasing) {
      groupRef.current.rotation.y += delta * 7;
      groupRef.current.rotation.x = Math.sin(t * 8) * 0.2;
    } else {
      groupRef.current.rotation.y += delta * 2.2;
      groupRef.current.rotation.x = Math.sin(t * 2) * 0.08;
    }

    // Spin quad rotors fast
    if (rotorGroup.current) {
      const rSpeed = (chasing ? 35 : 20) * (isDamaged ? 0.5 : 1);
      rotorGroup.current.children.forEach((child) => {
        child.rotation.y += delta * rSpeed;
      });
    }

    // Material colors
    const colorHex = isDamaged ? 0xff5500 : (chasing ? 0xff0033 : 0xff2244);
    const emissiveHex = isDamaged ? 0xaa2200 : (chasing ? 0xcc0022 : 0xaa0000);

    matRef.current.color.setHex(colorHex);
    matRef.current.emissive.setHex(emissiveHex);
    matRef.current.emissiveIntensity = chasing
      ? 0.7 + Math.abs(Math.sin(t * 14)) * 0.5
      : 0.3 + Math.sin(t * 2) * 0.2;

    if (eyeMatRef.current) {
      eyeMatRef.current.color.setHex(isDamaged ? 0xffaa00 : (chasing ? 0xff0000 : 0xff3355));
    }

    if (lightRef.current) {
      lightRef.current.color.setHex(colorHex);
      lightRef.current.intensity = chasing ? 2.5 : 1.2;
    }

    // Scale pulse
    const targetScale = chasing ? 1 + Math.sin(t * 8) * 0.1 : 1;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 10 * delta));

    let cachedPos = dronePositions.current.get(id);
    if (!cachedPos) {
      cachedPos = new THREE.Vector3();
      dronePositions.current.set(id, cachedPos);
    }
    cachedPos.copy(pos.current);

    const now = Date.now();
    if (now - lastHit.current > HIT_COOLDOWN_MS && distToPlayer < HIT_DISTANCE) {
      lastHit.current = now;
      onHit(id);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Drone Core */ }
      <mesh geometry={CORE_GEO}>
        <meshLambertMaterial ref={matRef} color={0xff2244} emissive={0xaa0000} emissiveIntensity={0.3} />
      </mesh>

      {/* Glowing Central Eye */ }
      <mesh position={[0, 0, 0.32]} geometry={EYE_GEO}>
        <meshBasicMaterial ref={eyeMatRef} color={0xff3355} />
      </mesh>

      {/* 4 Rotor Arms & Blades */ }
      <group ref={rotorGroup}>
        {/* Arm 1 (Top-Left) */}
        <group position={[-0.32, 0, -0.32]} rotation={[0, Math.PI / 4, 0]}>
          <mesh geometry={ARM_GEO} material={matDarkMetal} rotation={[Math.PI / 2, 0, 0]} />
          <mesh position={[0, 0.08, 0]} geometry={ROTOR_GEO} material={matRotor} />
        </group>

        {/* Arm 2 (Top-Right) */}
        <group position={[0.32, 0, -0.32]} rotation={[0, -Math.PI / 4, 0]}>
          <mesh geometry={ARM_GEO} material={matDarkMetal} rotation={[Math.PI / 2, 0, 0]} />
          <mesh position={[0, 0.08, 0]} geometry={ROTOR_GEO} material={matRotor} />
        </group>

        {/* Arm 3 (Bottom-Left) */}
        <group position={[-0.32, 0, 0.32]} rotation={[0, -Math.PI / 4, 0]}>
          <mesh geometry={ARM_GEO} material={matDarkMetal} rotation={[Math.PI / 2, 0, 0]} />
          <mesh position={[0, 0.08, 0]} geometry={ROTOR_GEO} material={matRotor} />
        </group>

        {/* Arm 4 (Bottom-Right) */}
        <group position={[0.32, 0, 0.32]} rotation={[0, Math.PI / 4, 0]}>
          <mesh geometry={ARM_GEO} material={matDarkMetal} rotation={[Math.PI / 2, 0, 0]} />
          <mesh position={[0, 0.08, 0]} geometry={ROTOR_GEO} material={matRotor} />
        </group>
      </group>

      <pointLight ref={lightRef} color={0xff2244} intensity={1.5} distance={4} />
    </group>
  );
}
