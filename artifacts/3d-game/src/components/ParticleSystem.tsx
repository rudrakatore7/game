import { useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ParticleSystemHandle {
  spawnExplosion: (pos: THREE.Vector3, color?: number, count?: number) => void;
  spawnCollectSparkles: (pos: THREE.Vector3) => void;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  scale: number;
  maxLife: number;
  life: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 150;
const AMBIENT_COUNT = 80;

const _tempMatrix = new THREE.Matrix4();
const _tempQuat   = new THREE.Quaternion();
const _tempEuler  = new THREE.Euler();
const _tempScale  = new THREE.Vector3();

const ParticleSystem = forwardRef<ParticleSystemHandle, {}>((_, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Pre-created geometry & material for instanced burst particles
  const particleGeo = useMemo(() => new THREE.BoxGeometry(0.12, 0.12, 0.12), []);
  const particleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    []
  );

  // Ambient cyber dust particles floating in maze atmosphere
  const ambientPositions = useMemo(() => {
    const pos = new Float32Array(AMBIENT_COUNT * 3);
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 3 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, []);

  const ambientGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(ambientPositions, 3));
    return geo;
  }, [ambientPositions]);

  const ambientMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.08,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useImperativeHandle(ref, () => ({
    spawnExplosion: (pos: THREE.Vector3, colorHex = 0xff3300, count = 24) => {
      const pList = particlesRef.current;
      const baseColor = new THREE.Color(colorHex);

      for (let i = 0; i < count; i++) {
        if (pList.length >= MAX_PARTICLES) pList.shift();

        // Random directional velocity burst
        const speed = 3 + Math.random() * 7;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        const vx = Math.cos(phi) * Math.cos(theta) * speed;
        const vy = Math.sin(phi) * speed + 1.5;
        const vz = Math.cos(phi) * Math.sin(theta) * speed;

        // Slight color variation (spark/orange/yellow/white)
        const col = baseColor.clone();
        if (Math.random() > 0.4) col.offsetHSL(0.05, 0.2, (Math.random() - 0.3) * 0.4);

        pList.push({
          pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)),
          vel: new THREE.Vector3(vx, vy, vz),
          rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
          rotVel: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
          scale: 0.8 + Math.random() * 1.2,
          maxLife: 0.35 + Math.random() * 0.45,
          life: 0,
          color: col,
        });
      }
    },

    spawnCollectSparkles: (pos: THREE.Vector3) => {
      const pList = particlesRef.current;
      const count = 28;

      for (let i = 0; i < count; i++) {
        if (pList.length >= MAX_PARTICLES) pList.shift();

        const speed = 2 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5; // upward burst

        const vx = Math.cos(phi) * Math.cos(theta) * speed;
        const vy = Math.sin(phi) * speed + 2;
        const vz = Math.cos(phi) * Math.sin(theta) * speed;

        const goldCol = new THREE.Color().setHSL(0.12 + Math.random() * 0.05, 1, 0.6 + Math.random() * 0.3);

        pList.push({
          pos: pos.clone(),
          vel: new THREE.Vector3(vx, vy, vz),
          rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
          rotVel: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
          scale: 0.6 + Math.random() * 1.0,
          maxLife: 0.4 + Math.random() * 0.5,
          life: 0,
          color: goldCol,
        });
      }
    },
  }));

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Update active burst particles
    const pList = particlesRef.current;
    let validCount = 0;

    for (let i = pList.length - 1; i >= 0; i--) {
      const p = pList[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        pList.splice(i, 1);
        continue;
      }

      // Physics integration
      p.vel.y -= 12 * delta; // Gravity
      p.vel.multiplyScalar(Math.max(0, 1 - 2 * delta)); // Drag
      p.pos.addScaledVector(p.vel, delta);

      p.rot.addScaledVector(p.rotVel, delta);

      const lifeRatio = 1 - p.life / p.maxLife;
      const currentScale = p.scale * Math.sin(lifeRatio * Math.PI); // Smooth pop & shrink

      _tempScale.set(currentScale, currentScale, currentScale);
      _tempEuler.set(p.rot.x, p.rot.y, p.rot.z);
      _tempQuat.setFromEuler(_tempEuler);

      _tempMatrix.compose(p.pos, _tempQuat, _tempScale);
      mesh.setMatrixAt(validCount, _tempMatrix);
      mesh.setColorAt(validCount, p.color);
      validCount++;
    }

    mesh.count = validCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Ambient floating dust motion
    const time = state.clock.elapsedTime;
    const attr = ambientGeo.attributes.position as THREE.BufferAttribute;
    const array = attr.array as Float32Array;

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      array[i * 3 + 1] += Math.sin(time + i) * 0.002;
      array[i * 3 + 0] += Math.cos(time * 0.5 + i) * 0.001;
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      {/* Instanced burst particles */}
      <instancedMesh
        ref={meshRef}
        args={[particleGeo, particleMat, MAX_PARTICLES]}
        frustumCulled={false}
      />

      {/* Ambient glowing dust */}
      <points geometry={ambientGeo} material={ambientMat} />
    </group>
  );
});

export default ParticleSystem;
