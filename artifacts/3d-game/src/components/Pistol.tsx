import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface PistolProps {
  isFiring: boolean;
}

const MAX_CASINGS = 8;

interface CasingData {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
}

// Materials
const matFrame  = new THREE.MeshLambertMaterial({ color: 0x111111, depthTest: false });
const matSlide  = new THREE.MeshLambertMaterial({ color: 0x2e2e2e, depthTest: false });
const matHandle = new THREE.MeshLambertMaterial({ color: 0x181818, depthTest: false });
const matBrass  = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.3, metalness: 0.8, depthTest: false });
const matFlash  = new THREE.MeshBasicMaterial({ color: 0xffbb22, depthTest: false, transparent: true, opacity: 0.95 });

const _offset     = new THREE.Vector3();
const _recoilQ    = new THREE.Quaternion();
const _recoilAxis = new THREE.Vector3(1, 0, 0);
const _rollAxis   = new THREE.Vector3(0, 0, 1);

export default function Pistol({ isFiring }: PistolProps) {
  const { camera }  = useThree();
  const groupRef    = useRef<THREE.Group>(null);
  const slideRef    = useRef<THREE.Mesh>(null);
  const flashRef    = useRef<THREE.Mesh>(null);
  const flashLight  = useRef<THREE.PointLight>(null);

  const recoilZ     = useRef(0);
  const recoilPitch = useRef(0);
  const recoilRoll  = useRef(0);
  const slideZ      = useRef(0);
  const swayTime    = useRef(0);
  const flashRot    = useRef(0);

  // Use a pre-allocated object pool for casings to avoid React re-renders in useFrame
  const casingMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const casingsData = useRef<CasingData[]>(
    Array.from({ length: MAX_CASINGS }).map(() => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      rotVel: new THREE.Vector3(),
      life: 0,
    }))
  );
  const casingIdx = useRef(0);

  // Trigger recoil and spawn ejected shell casing on shot
  useEffect(() => {
    if (isFiring && groupRef.current) {
      recoilZ.current     = 0.14;
      recoilPitch.current = -0.25;
      recoilRoll.current  = (Math.random() - 0.5) * 0.08;
      slideZ.current      = 0.08;
      flashRot.current    = Math.random() * Math.PI * 2;

      // Spawn shell casing from ejection port position
      const worldPort = new THREE.Vector3(0.04, 0.05, -0.01);
      worldPort.applyQuaternion(groupRef.current.quaternion);
      worldPort.add(groupRef.current.position);

      const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const upVec    = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

      const ejectVel = rightVec.clone().multiplyScalar(1.5 + Math.random() * 0.5)
        .add(upVec.clone().multiplyScalar(1.2 + Math.random() * 0.4))
        .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -0.5);

      // Grab the next casing from the pool
      const c = casingsData.current[casingIdx.current];
      c.active = true;
      c.life = 0;
      c.pos.copy(worldPort);
      c.vel.copy(ejectVel);
      c.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      c.rotVel.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);

      casingIdx.current = (casingIdx.current + 1) % MAX_CASINGS;
    }
  }, [isFiring, camera]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    swayTime.current += delta * 4.5;
    const swayX = Math.sin(swayTime.current) * 0.007;
    const swayY = Math.cos(swayTime.current * 1.6) * 0.006;

    // Smooth recovery from recoil
    recoilZ.current     = THREE.MathUtils.lerp(recoilZ.current,     0, 18 * delta);
    recoilPitch.current = THREE.MathUtils.lerp(recoilPitch.current, 0, 18 * delta);
    recoilRoll.current  = THREE.MathUtils.lerp(recoilRoll.current,  0, 18 * delta);
    slideZ.current      = THREE.MathUtils.lerp(slideZ.current,      0, 24 * delta);

    if (slideRef.current) {
      slideRef.current.position.z = -0.02 + slideZ.current;
    }

    // Place gun in view with sway & recoil offset
    _offset.set(0.22 + swayX, -0.22 + swayY, -0.42 + recoilZ.current);
    _offset.applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(_offset);

    // Apply combined pitch & roll recoil quaternion
    _recoilQ.setFromAxisAngle(_recoilAxis, recoilPitch.current);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(_rollAxis, recoilRoll.current);
    _recoilQ.multiply(rollQ);

    groupRef.current.quaternion.copy(camera.quaternion).multiply(_recoilQ);

    // Dynamic muzzle flash
    if (flashRef.current) {
      flashRef.current.visible = isFiring;
      if (isFiring) {
        flashRef.current.rotation.z = flashRot.current;
        const scale = 0.8 + Math.random() * 0.4;
        flashRef.current.scale.set(scale, scale, scale);
      }
    }
    if (flashLight.current) flashLight.current.visible = isFiring;

    // Update active shell casings directly via refs (no setState!)
    for (let i = 0; i < MAX_CASINGS; i++) {
      const c = casingsData.current[i];
      const mesh = casingMeshes.current[i];
      if (c.active && mesh) {
        c.life += delta;
        if (c.life >= 1.2) {
          c.active = false;
          mesh.visible = false;
        } else {
          c.vel.y -= 9.8 * delta; // Gravity
          c.pos.addScaledVector(c.vel, delta);
          c.rot.addScaledVector(c.rotVel, delta);
          
          mesh.position.copy(c.pos);
          mesh.rotation.set(c.rot.x, c.rot.y, c.rot.z);
          const s = Math.max(0, 1 - c.life * 0.5);
          mesh.scale.set(s, s, s);
          mesh.visible = true;
        }
      }
    }
  });

  return (
    <>
      <group ref={groupRef} renderOrder={999}>
        {/* Frame / body */ }
        <mesh renderOrder={999} material={matFrame} position={[0, 0, 0]}>
          <boxGeometry args={[0.065, 0.09, 0.28]} />
        </mesh>

        {/* Slide (top rail - animated blowback) */ }
        <mesh ref={slideRef} renderOrder={999} material={matSlide} position={[0, 0.056, -0.02]}>
          <boxGeometry args={[0.055, 0.030, 0.20]} />
        </mesh>

        {/* Barrel */ }
        <mesh renderOrder={999} material={matFrame} position={[0, 0.040, -0.25]}>
          <boxGeometry args={[0.024, 0.024, 0.18]} />
        </mesh>

        {/* Handle / grip */ }
        <mesh renderOrder={999} material={matHandle} position={[0, -0.105, 0.08]}>
          <boxGeometry args={[0.055, 0.130, 0.065]} />
        </mesh>

        {/* Trigger guard */ }
        <mesh renderOrder={999} material={matFrame} position={[0, -0.048, -0.04]}>
          <boxGeometry args={[0.018, 0.042, 0.11]} />
        </mesh>

        {/* Ejection port (side detail) */ }
        <mesh renderOrder={999} material={matSlide} position={[0.026, 0.058, -0.01]}>
          <boxGeometry args={[0.009, 0.016, 0.068]} />
        </mesh>

        {/* Front sight */ }
        <mesh renderOrder={999} material={matFrame} position={[0, 0.082, -0.13]}>
          <boxGeometry args={[0.008, 0.018, 0.008]} />
        </mesh>

        {/* Rear sight */ }
        <mesh renderOrder={999} material={matFrame} position={[0, 0.082, 0.068]}>
          <boxGeometry args={[0.022, 0.014, 0.007]} />
        </mesh>

        {/* Muzzle flash star mesh */ }
        <group ref={flashRef} position={[0, 0.040, -0.37]} visible={false}>
          <mesh renderOrder={999} material={matFlash}>
            <sphereGeometry args={[0.07, 6, 6]} />
          </mesh>
          <mesh renderOrder={999} material={matFlash} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.18, 0.04, 0.04]} />
          </mesh>
        </group>

        <pointLight
          ref={flashLight}
          position={[0, 0.040, -0.37]}
          color={0xffbb22}
          intensity={5}
          distance={4}
          visible={false}
        />
      </group>

      {/* Render flying shell casings in 3D world space using a pre-allocated pool */}
      {Array.from({ length: MAX_CASINGS }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (casingMeshes.current[i] = el)}
          material={matBrass}
          visible={false}
        >
          <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
        </mesh>
      ))}
    </>
  );
}
