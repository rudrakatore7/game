import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import MazeWalls from "./Maze";
import Player from "./Player";
import Headlamp from "./Headlamp";
import Collectible from "./Collectible";
import Obstacle from "./Obstacle";
import Chaser from "./Chaser";
import Pistol from "./Pistol";
import HUD from "./HUD";
import HitEffect from "./HitEffect";
import Minimap from "./Minimap";
import SmartCrosshair from "./SmartCrosshair";
import TouchControls from "./TouchControls";
import ParticleSystem from "./ParticleSystem";
import type { ParticleSystemHandle } from "./ParticleSystem";
import { useMobileControls, isMobile } from "../hooks/useMobileControls";
import { CELL_SIZE } from "../constants";
import { getMazeData, type MazeData } from "../mazeData";
import type { Difficulty } from "../difficulty";
import { DIFFICULTY_CONFIGS } from "../difficulty";
import {
  playCollectSound, playHitSound, playWinSound, playLoseSound, playTimerBeep,
  playShootSound, playBulletHitSound, playDroneDestroySound, playDroneWarningSound,
} from "../hooks/useSound";

const KEY_MAP = [
  { name: "forward", keys: ["ArrowUp",    "KeyW"] },
  { name: "back",    keys: ["ArrowDown",  "KeyS"] },
  { name: "left",    keys: ["ArrowLeft",  "KeyA"] },
  { name: "right",   keys: ["ArrowRight", "KeyD"] },
];

import {
  MIN_SPAWN_DIST, DRONE_MAX_HP, CHASER_MAX_HP, CHASER_ID,
  SHOOT_COOLDOWN, SHOOT_RANGE, SHOOT_COS_CONE, DRONE_KILL_PTS, CHASER_KILL_PTS
} from "../constants";

interface GameProps {
  difficulty: Difficulty;
  onGameOver: (score: number, collected: number, won: boolean) => void;
}

export default function Game({ difficulty, onGameOver }: GameProps) {
  const mobile   = useMemo(() => isMobile(), []);
  const cfg      = DIFFICULTY_CONFIGS[difficulty];
  const mazeData = useMemo(() => getMazeData(difficulty), [difficulty]);

  const [score,          setScore]          = useState(0);
  const [lives,          setLives]          = useState(cfg.lives);
  const [collectedIds,   setCollectedIds]   = useState<Set<number>>(new Set());
  const [isLocked,       setIsLocked]       = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(cfg.timeLimit);
  const [hitFlash,       setHitFlash]       = useState(false);
  const [isBlind,        setIsBlind]        = useState(false);
  const [isFiring,       setIsFiring]       = useState(false);
  const [deadDrones,     setDeadDrones]     = useState<Set<number>>(new Set());
  const [damagedDrones,  setDamagedDrones]  = useState<Set<number>>(new Set());
  const [killMsg,        setKillMsg]        = useState("");
  const [chaserHp,       setChaserHp]       = useState(CHASER_MAX_HP);
  const [chaserDead,     setChaserDead]     = useState(false);
  const [hitmarker,      setHitmarker]      = useState(false);
  const [ammo,           setAmmo]           = useState(6);
  const [isReloading,    setIsReloading]    = useState(false);

  const particlesRef     = useRef<ParticleSystemHandle>(null);
  const playerPos        = useRef(new THREE.Vector3(mazeData.playerStart.x, 1, mazeData.playerStart.z));
  const playerYaw        = useRef(0);
  const dronePositions   = useRef<Map<number, THREE.Vector3>>(new Map());
  const chasingDrones    = useRef<Set<number>>(new Set());
  const gameActive       = useRef(true);
  const livesRef         = useRef(cfg.lives);
  const scoreRef         = useRef(0);
  const timeRef          = useRef(cfg.timeLimit);
  const collectedRef     = useRef<Set<number>>(new Set());
  const hitFlashTimer    = useRef<ReturnType<typeof setTimeout>>();
  const blindTimer       = useRef<ReturnType<typeof setTimeout>>();
  const lastShot         = useRef(0);
  const droneHealths     = useRef<Map<number, number>>(new Map());
  const deadDronesRef    = useRef<Set<number>>(new Set());
  const damagedDronesRef = useRef<Set<number>>(new Set());
  const killMsgTimer     = useRef<ReturnType<typeof setTimeout>>();
  const chaserHpRef      = useRef(CHASER_MAX_HP);
  const chaserDeadRef    = useRef(false);
  const ammoRef          = useRef(6);
  const isReloadingRef   = useRef(false);

  const startPosition = useMemo(
    () => new THREE.Vector3(mazeData.playerStart.x, 1, mazeData.playerStart.z),
    [mazeData]
  );

  // CET spawns at the far corner of the maze
  const chaserStart = useMemo(() => {
    const { cols, rows } = mazeData;
    const OX = (cols * CELL_SIZE) / 2;
    const OZ = (rows * CELL_SIZE) / 2;
    return new THREE.Vector3(
      (cols - 2) * CELL_SIZE - OX + CELL_SIZE / 2,
      1,
      (rows - 2) * CELL_SIZE - OZ + CELL_SIZE / 2
    );
  }, [mazeData]);

  // Filter spawn-area drones + build health map
  const obstaclePaths = useMemo(() => {
    const spawnXZ = new THREE.Vector2(mazeData.playerStart.x, mazeData.playerStart.z);
    const paths = mazeData.obstaclePaths
      .filter((p) => {
        const aXZ = new THREE.Vector2(p.a.x, p.a.z);
        const bXZ = new THREE.Vector2(p.b.x, p.b.z);
        return (
          aXZ.distanceTo(spawnXZ) >= MIN_SPAWN_DIST &&
          bXZ.distanceTo(spawnXZ) >= MIN_SPAWN_DIST
        );
      })
      .map((p) => ({
        a:     new THREE.Vector3(p.a.x, p.a.y, p.a.z),
        b:     new THREE.Vector3(p.b.x, p.b.y, p.b.z),
        speed: p.speed * cfg.droneSpeedMult,
      }));
    droneHealths.current.clear();
    paths.forEach((_, i) => droneHealths.current.set(i, DRONE_MAX_HP));
    return paths;
  }, [mazeData, cfg.droneSpeedMult]);

  const { state: mobileState, setKnobListener } = useMobileControls(mobile);

  useEffect(() => {
    if (mobile) return;
    const onChange = () => {
      const canvas = document.querySelector("canvas");
      setIsLocked(document.pointerLockElement === canvas);
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [mobile]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!gameActive.current) return;
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 10 && timeRef.current > 0) playTimerBeep();
      if (timeRef.current <= 0) {
        gameActive.current = false;
        playLoseSound();
        setTimeout(() => onGameOver(scoreRef.current, collectedRef.current.size, false), 200);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [onGameOver]);

  useEffect(() => () => {
    clearTimeout(hitFlashTimer.current);
    clearTimeout(blindTimer.current);
    clearTimeout(killMsgTimer.current);
  }, []);

  // Shoot & Reload
  const handleReload = useCallback(() => {
    if (isReloadingRef.current || ammoRef.current === 6 || !gameActive.current) return;
    isReloadingRef.current = true;
    setIsReloading(true);
    clearTimeout(killMsgTimer.current);
    setKillMsg("RELOADING...");
    
    setTimeout(() => {
      ammoRef.current = 6;
      setAmmo(6);
      isReloadingRef.current = false;
      setIsReloading(false);
      setKillMsg("");
    }, 1200); // 1.2 second reload time
  }, []);

  const handleShoot = useCallback(() => {
    if (!gameActive.current || isReloadingRef.current) return;
    
    if (ammoRef.current <= 0) {
      handleReload();
      return;
    }

    const now = Date.now();
    if (now - lastShot.current < SHOOT_COOLDOWN) return;
    lastShot.current = now;

    // Expend ammo
    ammoRef.current -= 1;
    setAmmo(ammoRef.current);
    if (ammoRef.current === 0) {
      setTimeout(handleReload, 300); // auto reload
    }

    playShootSound();
    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 130);

    const yaw  = playerYaw.current;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    let hitId   = -1;
    let hitDist = Infinity;

    dronePositions.current.forEach((dPos, id) => {
      // Skip dead targets
      if (id === CHASER_ID ? chaserDeadRef.current : deadDronesRef.current.has(id)) return;
      const dx   = dPos.x - playerPos.current.x;
      const dz   = dPos.z - playerPos.current.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > SHOOT_RANGE || dist < 0.1) return;
      const dot = (fwdX * dx + fwdZ * dz) / dist;
      if (dot < SHOOT_COS_CONE) return;
      if (dist < hitDist) { hitDist = dist; hitId = id; }
    });

    if (hitId === -1) return;

    // Trigger hitmarker animation
    setHitmarker(true);
    setTimeout(() => setHitmarker(false), 140);

    const targetPos = dronePositions.current.get(hitId);

    if (hitId === CHASER_ID) {
      // Hit CET
      const hp = chaserHpRef.current - 1;
      chaserHpRef.current = hp;
      setChaserHp(hp);

      if (targetPos) {
        particlesRef.current?.spawnExplosion(targetPos, 0xbb00ff, hp <= 0 ? 36 : 18);
      }

      if (hp <= 0) {
        chaserDeadRef.current = true;
        setChaserDead(true);
        dronePositions.current.delete(CHASER_ID);
        playDroneDestroySound();
        scoreRef.current += CHASER_KILL_PTS;
        setScore(scoreRef.current);
        clearTimeout(killMsgTimer.current);
        setKillMsg(`CET DOWN  +${CHASER_KILL_PTS}`);
        killMsgTimer.current = setTimeout(() => setKillMsg(""), 1800);
      } else {
        playBulletHitSound();
        clearTimeout(killMsgTimer.current);
        setKillMsg(hp === 2 ? "CET HIT!  2 MORE" : "CET HIT!  1 MORE");
        killMsgTimer.current = setTimeout(() => setKillMsg(""), 1100);
      }
    } else {
      // Hit regular drone
      const hp = (droneHealths.current.get(hitId) ?? DRONE_MAX_HP) - 1;
      droneHealths.current.set(hitId, hp);

      if (targetPos) {
        particlesRef.current?.spawnExplosion(targetPos, 0xff3300, hp <= 0 ? 28 : 14);
      }

      if (hp <= 0) {
        deadDronesRef.current  = new Set(deadDronesRef.current).add(hitId);
        damagedDronesRef.current.delete(hitId);
        chasingDrones.current.delete(hitId);
        dronePositions.current.delete(hitId);
        setDeadDrones(new Set(deadDronesRef.current));
        setDamagedDrones(new Set(damagedDronesRef.current));
        playDroneDestroySound();
        scoreRef.current += DRONE_KILL_PTS;
        setScore(scoreRef.current);
        clearTimeout(killMsgTimer.current);
        setKillMsg(`DRONE DOWN  +${DRONE_KILL_PTS}`);
        killMsgTimer.current = setTimeout(() => setKillMsg(""), 1400);
      } else {
        damagedDronesRef.current = new Set(damagedDronesRef.current).add(hitId);
        setDamagedDrones(new Set(damagedDronesRef.current));
        playBulletHitSound();
      }
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "KeyF") {
        e.preventDefault();
        handleShoot();
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        handleReload();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleShoot, handleReload]);

  const handleCanvasClick = useCallback(() => {
    if (mobile) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    if (document.pointerLockElement === canvas) handleShoot();
    else canvas.requestPointerLock();
  }, [mobile, handleShoot]);

  const handleCollect = useCallback(
    (id: number) => {
      if (!gameActive.current) return;
      playCollectSound();

      const gemData = mazeData.collectiblePositions[id];
      if (gemData) {
        particlesRef.current?.spawnCollectSparkles(new THREE.Vector3(gemData.x, gemData.y, gemData.z));
      }

      setCollectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        collectedRef.current = next;
        const newScore = next.size * cfg.gemPoints;
        scoreRef.current = newScore;
        setScore(newScore);
        if (next.size >= cfg.gemsRequired) {
          gameActive.current = false;
          const timeBonus  = timeRef.current * cfg.timeBonusPerSecond;
          const finalScore = newScore + livesRef.current * cfg.livesBonus + timeBonus;
          playWinSound();
          setTimeout(() => onGameOver(finalScore, next.size, true), 500);
        }
        return next;
      });
    },
    [cfg, mazeData, onGameOver]
  );

  const handleHit = useCallback(
    (_id: number) => {
      if (!gameActive.current) return;
      playHitSound();
      clearTimeout(hitFlashTimer.current);
      clearTimeout(blindTimer.current);
      setHitFlash(true);
      setIsBlind(true);
      hitFlashTimer.current = setTimeout(() => setHitFlash(false), 450);
      blindTimer.current    = setTimeout(() => setIsBlind(false), 2000);
      setLives((prev) => {
        const next     = prev - 1;
        livesRef.current = next;
        const newScore = Math.max(0, scoreRef.current - cfg.hitPenalty);
        scoreRef.current = newScore;
        setScore(newScore);
        if (next <= 0) {
          gameActive.current = false;
          playLoseSound();
          setTimeout(() => onGameOver(newScore, collectedRef.current.size, false), 200);
        }
        return next;
      });
    },
    [cfg, onGameOver]
  );

  const handleChaserHit = useCallback(() => handleHit(-1), [handleHit]);

  const handleChaseStart = useCallback((id: number) => {
    if (!chasingDrones.current.has(id)) {
      chasingDrones.current.add(id);
      playDroneWarningSound();
    }
  }, []);

  const handleChaseEnd = useCallback((id: number) => {
    chasingDrones.current.delete(id);
  }, []);

  const handlePlayerUpdate    = useCallback((pos: THREE.Vector3) => { playerPos.current.copy(pos); }, []);
  const handleChaserPosUpdate = useCallback((_pos: THREE.Vector3) => { /* dronePositions updated inside Chaser */ }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas
        onClick={handleCanvasClick}
        camera={{ fov: 75, near: 0.1, far: 80 }}
        style={{ background: "#000", touchAction: "none" }}
        dpr={[1, mobile ? 1 : 1.5]}
        gl={{ antialias: !mobile, powerPreference: "low-power", precision: "mediump",
              stencil: false, depth: true, alpha: false }}
        performance={{ min: 0.5 }}
      >
        <fog attach="fog" args={["#000820", 10, 40]} />
        <ambientLight intensity={0.8} color="#445566" />
        <Headlamp />
        <ParticleSystem ref={particlesRef} />

        <KeyboardControls map={KEY_MAP}>
          <Player
            startPosition={startPosition}
            onPositionUpdate={handlePlayerUpdate}
            isLocked={isLocked}
            mobileState={mobileState}
            isMobile={mobile}
            yawRef={playerYaw}
            mazeData={mazeData}
          />
        </KeyboardControls>

        <MazeWalls mazeData={mazeData} />

        {mazeData.collectiblePositions.map((pos, i) =>
          !collectedIds.has(i) ? (
            <Collectible key={i} id={i} position={[pos.x, pos.y, pos.z]}
              onCollect={handleCollect} playerPosition={playerPos.current} />
          ) : null
        )}

        {obstaclePaths.map((path, i) =>
          !deadDrones.has(i) ? (
            <Obstacle key={i} id={i} pathA={path.a} pathB={path.b} speed={path.speed}
              isDamaged={damagedDrones.has(i)}
              onHit={handleHit} onChaseStart={handleChaseStart} onChaseEnd={handleChaseEnd}
              playerPosition={playerPos.current} dronePositions={dronePositions} />
          ) : null
        )}

        {!chaserDead && (
          <Chaser
            startPosition={chaserStart}
            hp={chaserHp}
            onHit={handleChaserHit}
            onPositionUpdate={handleChaserPosUpdate}
            playerPosition={playerPos.current}
            dronePositions={dronePositions}
          />
        )}

        <Pistol isFiring={isFiring} />
      </Canvas>

      <HUD score={score} lives={lives} maxLives={cfg.lives} collected={collectedIds.size}
        total={cfg.gemsRequired} isLocked={isLocked} isMobile={mobile}
        difficulty={difficulty} timeLeft={timeLeft} timeLimit={cfg.timeLimit} 
        ammo={ammo} isReloading={isReloading} />

      <Minimap playerPos={playerPos} playerYaw={playerYaw} collectedIds={collectedIds}
        dronePositions={dronePositions} chasingDrones={chasingDrones}
        isMobile={mobile} mazeData={mazeData} />

      {mobile && <TouchControls onKnobRegister={setKnobListener} />}

      {/* Dynamic Crosshair & Threat Indicator */ }
      <SmartCrosshair
        playerPos={playerPos}
        playerYaw={playerYaw}
        dronePositions={dronePositions}
        chasingDrones={chasingDrones}
        isFiring={isFiring}
        hitmarker={hitmarker}
      />

      {/* CET health indicator */ }
      {!chaserDead && (
        <div style={{
          position:"fixed", bottom: mobile ? 180 : 20, left: mobile ? "50%" : 20,
          transform: mobile ? "translateX(-50%)" : "none",
          background:"rgba(0,0,0,0.6)",
          border:"1px solid rgba(150,0,220,0.5)",
          borderRadius:8, padding:"6px 12px",
          fontFamily:"'Courier New',monospace",
          pointerEvents:"none", zIndex:50,
          display:"flex", alignItems:"center", gap:8,
        }}>
          <span style={{ color:"#aa44ff", fontSize:10, letterSpacing:3 }}>CET</span>
          <div style={{ display:"flex", gap:3 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:12, height:12, borderRadius:2,
                background: i < chaserHp ? "#8800ff" : "#222",
                boxShadow: i < chaserHp ? "0 0 6px #8800ff" : "none",
                transition:"background 0.3s",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile shoot button */ }
      {mobile && (
        <button onPointerDown={(e) => { e.preventDefault(); handleShoot(); }}
          disabled={isReloading}
          style={{
            position:"fixed", bottom:100, right:28,
            width:68, height:68, borderRadius:"50%",
            background:"rgba(220,40,0,0.72)",
            border:"2px solid rgba(255,90,60,0.85)",
            color:"#fff", fontSize:26,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", zIndex:60,
            boxShadow:"0 0 18px rgba(255,40,0,0.55)",
            userSelect:"none", WebkitUserSelect:"none", touchAction:"none",
          }}>
          🔫
        </button>
      )}

      {/* Kill / hit notification */ }
      {killMsg && (
        <div key={killMsg} style={{
          position:"fixed", top:"38%", left:"50%",
          transform:"translateX(-50%)",
          color: killMsg.startsWith("CET") ? "#cc44ff" : "#ff6600",
          fontSize: mobile ? 14 : 16,
          fontFamily:"'Courier New',monospace",
          fontWeight:"bold", letterSpacing:5,
          textShadow: killMsg.startsWith("CET")
            ? "0 0 14px #aa00ff, 0 0 28px #8800cc"
            : "0 0 14px #ff4400, 0 0 28px #ff2200",
          pointerEvents:"none", zIndex:200,
          animation:"killFadeUp 1.4s ease-out forwards",
          whiteSpace:"nowrap",
        }}>
          {killMsg}
        </div>
      )}

      {!mobile && !isLocked && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          color:"rgba(255,255,255,0.45)", fontSize:11,
          fontFamily:"'Courier New',monospace", letterSpacing:3,
          pointerEvents:"none", zIndex:50,
        }}>
          CLICK TO LOCK · CLICK / SPACE / F TO SHOOT
        </div>
      )}

      <HitEffect hitFlash={hitFlash} isBlind={isBlind} />

      <style>{`
        @keyframes killFadeUp {
          0%   { opacity:0; transform:translateX(-50%) translateY(0); }
          15%  { opacity:1; transform:translateX(-50%) translateY(-6px); }
          70%  { opacity:1; transform:translateX(-50%) translateY(-14px); }
          100% { opacity:0; transform:translateX(-50%) translateY(-24px); }
        }
      `}</style>
    </div>
  );
}
