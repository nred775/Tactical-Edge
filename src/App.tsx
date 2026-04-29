import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Sky, Stars } from '@react-three/drei';
import { Player } from './Player';
import { Map } from './Map';
import { OtherPlayers } from './Enemy';
import { HUD } from './HUD';
import { Suspense, useEffect } from 'react';
import { useStore } from './store';

export default function App() {
  const initSocket = useStore(state => state.initSocket);

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <div className="w-full h-screen bg-[#020202] overflow-hidden">
      <HUD />
      <div className="w-full h-full cursor-crosshair">
        <Canvas 
          shadows 
          camera={{ fov: 75, position: [0, 4, 10] }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Sky sunPosition={[100, 20, 100]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            
            <Physics gravity={[0, -9.81, 0]}>
              <Map />
              <Player />
              <OtherPlayers />
            </Physics>
          </Suspense>
        </Canvas>
      </div>
      
      {/* Visual background for UI polish */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-20" />
    </div>
  );
}
