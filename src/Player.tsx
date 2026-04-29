import { useSphere } from '@react-three/cannon';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useKeyboard } from './hooks/useKeyboard';
import { useStore, GameState } from './store';

const SPEED = 6;
const JUMP_FORCE = 4.5;

export const Player = () => {
  const { camera } = useThree();
  const { moveForward, moveBackward, moveLeft, moveRight, jump, shoot, interact } = useKeyboard();
  
  const gameState = useStore((state) => state.gameState);
  const myId = useStore((state) => state.myId);
  const playerState = useStore((state) => state.players[myId]);
  
  const updateLocalPos = useStore((state) => state.updateLocalPos);
  const damagePlayer = useStore((state) => state.damagePlayer);
  const plantBomb = useStore((state) => state.plantBomb);
  const defuseBomb = useStore((state) => state.defuseBomb);
  const pickupBomb = useStore((state) => state.pickupBomb);
  const bombOnGround = useStore((state) => state.bombOnGround);
  const bombPos = useStore((state) => state.bombPos);
  const bombCarrierId = useStore((state) => state.bombCarrierId);
  
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: playerState?.team === 'ATTACKERS' ? [0, 4, 25] : [0, 4, -25],
    fixedRotation: true,
    args: [0.6],
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api]);

  const pos = useRef([0, 0, 0]);
  useEffect(() => api.position.subscribe((p) => {
      pos.current = p;
  }), [api]);

  const lastShootTime = useRef(0);
  const lastSyncTime = useRef(0);

  useFrame((state) => {
    if (gameState === GameState.LOBBY || gameState === GameState.MATCHMAKING) return;
    if (!playerState || !playerState.isAlive) return;

    // Camera follow
    camera.position.copy(new THREE.Vector3(...pos.current));

    // Movement
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(moveBackward) - Number(moveForward));
    const sideVector = new THREE.Vector3(Number(moveLeft) - Number(moveRight), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    // Restrictions
    let finalDirection = direction;
    if (gameState === GameState.FREEZE_TIME) {
        // Limited movement area during freeze time
        if (playerState.team === 'ATTACKERS' && pos.current[2] < 2) finalDirection.z = Math.max(0, finalDirection.z);
        if (playerState.team === 'DEFENDERS' && pos.current[2] > -2) finalDirection.z = Math.min(0, finalDirection.z);
    }

    api.velocity.set(finalDirection.x, velocity.current[1], finalDirection.z);

    if (jump && Math.abs(velocity.current[1]) < 0.1) {
      api.velocity.set(velocity.current[0], JUMP_FORCE, velocity.current[2]);
    }

    // Network Sync
    if (state.clock.getElapsedTime() - lastSyncTime.current > 0.05) {
        updateLocalPos(pos.current as [number, number, number], [camera.rotation.x, camera.rotation.y, camera.rotation.z]);
        lastSyncTime.current = state.clock.getElapsedTime();
    }

    // Shooting
    if (shoot && state.clock.getElapsedTime() - lastShootTime.current > 0.1) {
      lastShootTime.current = state.clock.getElapsedTime();
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycaster.far = 1000; // Unlimited range
      
      const intersects = raycaster.intersectObjects(state.scene.children, true);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.type === 'target' && hit.userData.id !== myId) {
          damagePlayer(hit.userData.id, 34); // 3-tap kill
        }
      }
    }

    // Interactions
    if (interact) {
        // Bomb Pickup
        if (bombOnGround) {
            const distToBomb = Math.sqrt((pos.current[0]-bombPos[0])**2 + (pos.current[2]-bombPos[2])**2);
            if (distToBomb < 2 && playerState.team === 'ATTACKERS') {
                pickupBomb();
            }
        }

        // Plant / Defuse
        const distToCenter = Math.sqrt(pos.current[0]**2 + pos.current[2]**2);
        if (distToCenter < 4) {
            if (playerState.team === 'ATTACKERS' && bombCarrierId === myId && gameState === GameState.PLAYING) {
                plantBomb();
            } else if (playerState.team === 'DEFENDERS' && gameState === GameState.BOMB_PLANTED) {
                defuseBomb();
            }
        }
    }
  });

  return (
    <>
      <PointerLockControls />
      <mesh ref={ref as any}>
         <sphereGeometry args={[0.5]} />
         <meshStandardMaterial transparent opacity={0} />
      </mesh>
      
      {/* Viewmodel Weapon (Visual only) */}
      <group position={[0, 0, 0]}>
          <mesh position={[0.4, -0.4, -0.6]} rotation={[0.1, -0.1, 0]}>
              <boxGeometry args={[0.1, 0.12, 0.6]} />
              <meshStandardMaterial color="#222" />
          </mesh>
      </group>
    </>
  );
};
