import { Html } from '@react-three/drei';
import { useStore } from './store';
import { Team } from './store';

const OtherPlayer = ({ id }: { id: string }) => {
  const player = useStore((state) => state.players[id]);
  
  if (!player || !player.isAlive) return null;

  return (
    <group position={player.pos} rotation={player.rot}>
      <mesh castShadow userData={{ type: 'target', id }}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial 
            color={player.team === Team.ATTACKERS ? '#ef4444' : '#60a5fa'} 
            emissive={player.team === Team.ATTACKERS ? '#ef4444' : '#3b82f6'}
            emissiveIntensity={0.5}
        />
        
        {/* Health Bar */}
        <Html position={[0, 1.2, 0]} center>
          <div className="flex flex-col items-center">
            <div className="w-16 h-1.5 bg-black/50 border border-white/20 rounded-full overflow-hidden mb-1">
                <div 
                    className={`h-full transition-all duration-300 ${player.team === Team.ATTACKERS ? 'bg-red-500' : 'bg-cyan-500'}`}
                    style={{ width: `${player.health}%` }} 
                />
            </div>
            <span className="text-[8px] font-bold text-white uppercase tracking-tighter bg-black/40 px-1 rounded">
                PLR_{id.slice(-4)}
            </span>
          </div>
        </Html>
      </mesh>
      
      {/* Viewmodel representation for others */}
      <mesh position={[0.4, -0.3, -0.4]}>
          <boxGeometry args={[0.1, 0.1, 0.5]} />
          <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

export const OtherPlayers = () => {
    const players = useStore(state => state.players);
    const myId = useStore(state => state.myId);

    return (
        <group>
            {Object.keys(players)
                .filter(id => id !== myId)
                .map(id => <OtherPlayer key={id} id={id} />)
            }
        </group>
    );
}
