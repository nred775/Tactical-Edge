import { useBox, usePlane } from '@react-three/cannon';
import { useStore, GameState } from './store';

const Wall = ({ position, args, color = "#1a1a1a" }: { position: [number, number, number], args: [number, number, number], color?: string }) => {
  const [ref] = useBox(() => ({ type: 'Static', position, args }));
  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} />
      <mesh position={[0,0,0]} scale={[1.001, 1.001, 1.001]}>
         <boxGeometry args={args} />
         <meshStandardMaterial color="#444" wireframe />
      </mesh>
    </mesh>
  );
};

export const Map = () => {
    const bombPlanted = useStore(state => state.bombPlanted);
    const gameState = useStore(state => state.gameState);
    const bombOnGround = useStore(state => state.bombOnGround);
    const bombPos = useStore(state => state.bombPos);

  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <group>
      <mesh ref={floorRef as any} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      
      {/* Grid Helper */}
      <gridHelper args={[100, 50, "#1a1a1a", "#0a0a0a"]} position={[0, 0.01, 0]} />

      {/* Map Boundary */}
      <Wall position={[0, 5, -30]} args={[60, 10, 2]} />
      <Wall position={[0, 5, 30]} args={[60, 10, 2]} />
      <Wall position={[-30, 5, 0]} args={[2, 10, 60]} />
      <Wall position={[30, 5, 0]} args={[2, 10, 60]} />

      {/* Dividing Wall (Freeze Time only) */}
      {gameState === GameState.FREEZE_TIME && (
          <Wall position={[0, 5, 0]} args={[60, 10, 0.5]} color="#222" />
      )}

      {/* Obstacles */}
      <Wall position={[10, 2, 10]} args={[5, 4, 5]} color="#111" />
      <Wall position={[-10, 2, -10]} args={[5, 4, 5]} color="#111" />
      <Wall position={[15, 3, -5]} args={[2, 6, 8]} color="#111" />
      <Wall position={[-15, 3, 5]} args={[2, 6, 8]} color="#111" />

      {/* Site A Marker */}
      <group position={[0, 0.1, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.8, 4, 4]} />
            <meshStandardMaterial color={bombPlanted ? "#ef4444" : "#60a5fa"} emissive={bombPlanted ? "#ef4444" : "#60a5fa"} emissiveIntensity={5} />
        </mesh>
        <pointLight position={[0, 2, 0]} color={bombPlanted ? "#ef4444" : "#60a5fa"} intensity={5} distance={15} />
      </group>

      {/* Pickable Bomb */}
      {bombOnGround && (
          <mesh position={bombPos}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#333" emissive="#ef4444" emissiveIntensity={2} />
              <pointLight color="#ef4444" intensity={2} distance={5} />
          </mesh>
      )}

      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[20, 50, 20]} 
        intensity={0.8} 
        castShadow 
      />
    </group>
  );
};
