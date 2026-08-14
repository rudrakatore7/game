import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHASER_SPEED, CHASER_HIT_DISTANCE, CHASER_HIT_COOLDOWN_MS } from "../constants";

const _toPlayer = new THREE.Vector3();

// Colours change per remaining HP
const HP_COLORS: Record<number, { body: number; emissive: number }> = {
  3: { body: 0x6600cc, emissive: 0x440088 }, // dark purple  (full health)
  2: { body: 0xcc00cc, emissive: 0x880055 }, // bright magenta (wounded)
  1: { body: 0xff2200, emissive: 0xaa1100 }, // fiery red     (near death)
};

interface ChaserProps {
  startPosition:    THREE.Vector3;
  hp:               number;
  onHit:            () => void;
  onPositionUpdate: (pos: THREE.Vector3) => void;
  playerPosition:   THREE.Vector3;
  dronePositions:   React.MutableRefObject<Map<number, THREE.Vector3>>;
}

const CHASER_ID = 999;

export default function Chaser({
  startPosition, hp, onHit, onPositionUpdate, playerPosition, dronePositions,
}: ChaserProps) {
  const groupRef    = useRef<THREE.Group>(null);
  const bodyMatRef  = useRef<THREE.MeshLambertMaterial>(null);
  const headMatRef  = useRef<THREE.MeshLambertMaterial>(null);
  const lightRef    = useRef<THREE.PointLight>(null);
  const eyeLightRef = useRef<THREE.PointLight>(null);

  const pos         = useRef(startPosition.clone());
  const lastHit     = useRef(0);
  const phase       = useRef(0);

  // Stagger impulse on hit
  const staggerZ    = useRef(0);
  const prevHp      = useRef(hp);

  useEffect(() => {
    if (hp < prevHp.current) {
      staggerZ.current = -0.45; // Kick back when hit
    }
    prevHp.current = hp;
  }, [hp]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    phase.current += delta;
    const t = phase.current;

    // Smooth recovery from hit stagger
    staggerZ.current = THREE.MathUtils.lerp(staggerZ.current, 0, 8 * delta);

    // Chase player with stagger offset
    _toPlayer.copy(playerPosition).sub(pos.current);
    _toPlayer.y = 0;
    const dist = _toPlayer.length();

    if (dist > 0.2) {
      const speed = CHASER_SPEED * (1 - hp * 0.15);
      pos.current.addScaledVector(_toPlayer.clone().normalize(), speed * delta);
    }

    // Walking bob Y + heavy torso tilt
    const bobY = 1.0 + Math.abs(Math.sin(t * 6.5)) * 0.14;
    const swayX = Math.sin(t * 3.25) * 0.06;
    const torsoTilt = Math.sin(t * 6.5) * 0.08;

    groupRef.current.position.set(pos.current.x + swayX, bobY, pos.current.z);

    // Face player smoothly + stagger pitch tilt
    const targetAngle = Math.atan2(playerPosition.x - pos.current.x, playerPosition.z - pos.current.z);
    let diffAngle = targetAngle - groupRef.current.rotation.y;
    diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));
    groupRef.current.rotation.y += diffAngle * Math.min(1, 10 * delta);

    groupRef.current.rotation.x = torsoTilt + staggerZ.current * 0.5;

    // Arms & legs stride animations
    const armSwing = Math.sin(t * 6.5) * 0.55;
    const lArm = groupRef.current.getObjectByName("arm_l");
    const rArm = groupRef.current.getObjectByName("arm_r");
    const lLeg = groupRef.current.getObjectByName("leg_l");
    const rLeg = groupRef.current.getObjectByName("leg_r");

    if (lArm) lArm.rotation.x =  armSwing;
    if (rArm) rArm.rotation.x = -armSwing;
    if (lLeg) lLeg.rotation.x = -armSwing * 0.75;
    if (rLeg) rLeg.rotation.x =  armSwing * 0.75;

    // Update material colors based on HP
    const col = HP_COLORS[Math.max(1, Math.min(3, hp))] ?? HP_COLORS[1];
    if (bodyMatRef.current) {
      bodyMatRef.current.color.setHex(col.body);
      bodyMatRef.current.emissive.setHex(col.emissive);
      bodyMatRef.current.emissiveIntensity = 0.4 + Math.sin(t * 5) * 0.2;
    }

    if (headMatRef.current) {
      headMatRef.current.color.setHex(col.body);
      headMatRef.current.emissive.setHex(col.emissive);
      headMatRef.current.emissiveIntensity = 0.5 + Math.sin(t * 5 + 1) * 0.2;
    }

    if (lightRef.current) {
      lightRef.current.color.setHex(col.body);
      lightRef.current.intensity = 1.8 + Math.sin(t * 6) * 0.6;
    }

    if (eyeLightRef.current) {
      eyeLightRef.current.intensity = 3 + Math.sin(t * 12) * 1.5;
    }

    // Report position for shoot-detection and minimap
    let cachedPos = dronePositions.current.get(CHASER_ID);
    if (!cachedPos) {
      cachedPos = new THREE.Vector3();
      dronePositions.current.set(CHASER_ID, cachedPos);
    }
    cachedPos.copy(pos.current);
    
    onPositionUpdate(pos.current);

    // Player collision → hit
    const now = Date.now();
    if (dist < CHASER_HIT_DISTANCE) {
      if (now - lastHit.current > CHASER_HIT_COOLDOWN_MS) {
        lastHit.current = now;
        onHit();
      }
    }
  });

  const bodyMat = <meshLambertMaterial ref={bodyMatRef} color={0x6600cc} emissive={0x440088} emissiveIntensity={0.4} />;
  const headMat = <meshLambertMaterial ref={headMatRef} color={0x7700dd} emissive={0x440088} emissiveIntensity={0.5} />;

  return (
    <group ref={groupRef}>
      {/* Torso */ }
      <mesh position={[0, 0, 0]}>{bodyMat}<boxGeometry args={[0.55, 0.78, 0.30]} /></mesh>

      {/* Head */ }
      <mesh position={[0, 0.68, 0]}>{headMat}<boxGeometry args={[0.44, 0.44, 0.44]} /></mesh>

      {/* Red glowing eye */}
      <mesh position={[0, 0.68, 0.23]}>
        <boxGeometry args={[0.18, 0.08, 0.03]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>

      <pointLight ref={eyeLightRef} position={[0, 0.68, 0.35]} color={0xff0000} intensity={3} distance={2.5} />

      {/* Left arm */ }
      <group name="arm_l" position={[-0.38, 0.05, 0]}>
        <mesh>{bodyMat}<boxGeometry args={[0.18, 0.62, 0.22]} /></mesh>
      </group>

      {/* Right arm */ }
      <group name="arm_r" position={[0.36, 0.05, 0]}>
        <mesh>{bodyMat}<boxGeometry args={[0.18, 0.62, 0.22]} /></mesh>
      </group>

      {/* Left leg */ }
      <group name="leg_l" position={[-0.16, -0.68, 0]}>
        <mesh>{bodyMat}<boxGeometry args={[0.22, 0.55, 0.24]} /></mesh>
      </group>

      {/* Right leg */ }
      <group name="leg_r" position={[0.16, -0.68, 0]}>
        <mesh>{bodyMat}<boxGeometry args={[0.22, 0.55, 0.24]} /></mesh>
      </group>

      {/* Glow light */ }
      <pointLight ref={lightRef} position={[0, 0.68, 0]} color={0x6600cc} intensity={1.8} distance={7} />
    </group>
  );
}
