import { useStore, GameState, Team } from './store';
import { Target, Shield, Clock, Heart, Bomb, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

export const HUD = () => {
  const { 
    gameState, 
    timer, 
    bombTimer, 
    attackerScore, 
    defenderScore, 
    players, 
    myId, 
    joinQueue,
    resetGame,
    roundWinner,
    winningTeam,
    setGameState,
    bombCarrierId,
    bombPlanted
  } = useStore();

  const me = players[myId];
  const [localTimer, setLocalTimer] = useState(0);

  const socket = useStore(state => state.socket);
  const roomId = useStore(state => state.roomId);

  const handleNextRound = () => {
    if (socket && roomId) {
        socket.emit('ready_next', { roomId });
    }
  };

  // Local timer sync for visual only
  useEffect(() => {
    if (gameState === GameState.FREEZE_TIME || gameState === GameState.PLAYING || gameState === GameState.BOMB_PLANTED) {
        setLocalTimer(timer);
        const interval = setInterval(() => {
            setLocalTimer(prev => {
                if (prev <= 1) {
                    // Logic for state transitions if server didn't already
                    if (gameState === GameState.FREEZE_TIME) {
                        setGameState(GameState.PLAYING);
                        return 60;
                    }
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [gameState, timer, setGameState]);

  if (gameState === GameState.LOBBY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-50">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <motion.h1 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-7xl font-black mb-12 tracking-tighter text-cyan-500 italic"
        >
          TACTICAL EDGE
        </motion.h1>
        
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full px-8 relative z-10">
            <button 
                onClick={() => joinQueue('1v1')}
                className="group p-8 border-2 border-white/20 bg-white/5 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all rounded-xl text-left"
            >
                <Users className="w-12 h-12 mb-4 text-cyan-500" />
                <h2 className="text-3xl font-bold mb-2">1 vs 1</h2>
                <p className="text-gray-400 group-hover:text-gray-200">Standard tactical duel. Outsmart and outaim your opponent.</p>
            </button>
            
            <button 
                onClick={() => joinQueue('2v2')}
                className="group p-8 border-2 border-white/20 bg-white/5 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all rounded-xl text-left"
            >
                <Users className="w-12 h-12 mb-4 text-cyan-500 group-hover:text-cyan-400" />
                <h2 className="text-3xl font-bold mb-2 text-white">2 vs 2</h2>
                <p className="text-gray-400 group-hover:text-gray-200">Team-based strategy. Coordinate with your ally to take the site.</p>
            </button>
        </div>
        
        <p className="mt-12 text-zinc-500 font-mono tracking-widest text-xs uppercase animate-pulse">Waiting for selection...</p>
      </div>
    );
  }

  if (gameState === GameState.MATCHMAKING) {
      return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-50">
              <Search className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
              <h1 className="text-4xl font-bold mb-2 tracking-tight">FINDING OPPONENTS</h1>
              <p className="text-zinc-500 font-mono italic">ESTIMATED TIME: 1-5 SECONDS</p>
              <button 
                onClick={resetGame}
                className="mt-8 px-6 py-2 border border-white/20 hover:bg-white/10 text-xs tracking-widest uppercase"
              >
                  Cancel
              </button>
          </div>
      )
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 font-sans">
      {/* Top HUD: Score & Timer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-12 bg-neutral-900/90 backdrop-blur-xl px-12 py-4 rounded-b-3xl border-x border-b border-white/10 shadow-emerald-500/5 shadow-2xl">
        <div className="text-center">
            <div className={`text-[10px] font-bold tracking-[0.3em] uppercase ${me?.team === Team.ATTACKERS ? 'text-cyan-400' : 'text-zinc-500'}`}>Attackers</div>
            <div className="text-4xl font-black italic text-white">{attackerScore}</div>
        </div>
        
        <div className="flex flex-col items-center min-w-[120px]">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                {gameState === GameState.FREEZE_TIME ? 'PRE-ROUND' : bombPlanted ? 'PLANTED' : 'ROUND TIME'}
            </div>
            <div className={`text-5xl font-mono font-black tabular-nums ${bombPlanted ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {localTimer}
            </div>
        </div>

        <div className="text-center">
            <div className={`text-[10px] font-bold tracking-[0.3em] uppercase ${me?.team === Team.DEFENDERS ? 'text-cyan-400' : 'text-zinc-500'}`}>Defenders</div>
            <div className="text-4xl font-black italic text-white">{defenderScore}</div>
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-green-400 rounded-full shadow-[0_0_5px_#4ade80]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-green-400/50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-green-400/50" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-green-400/50" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-green-400/50" />
      </div>

      {/* Bottom Stats */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2">
          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur px-6 py-4 border-l-4 border-cyan-500 rounded-r-xl">
              <Heart className="w-8 h-8 text-red-500" />
              <div>
                  <div className="text-4xl font-black italic text-white leading-none">{Math.round(me?.health || 0)}</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Health</div>
              </div>
          </div>
      </div>

      <div className="absolute bottom-8 right-8 text-right">
          <div className="bg-zinc-900/80 backdrop-blur px-8 py-4 border-r-4 border-cyan-500 rounded-l-xl flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                  {bombCarrierId === myId && <Bomb className="w-5 h-5 text-red-500" />}
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Standard-X Rifle</span>
              </div>
              <div className="text-4xl font-black italic text-white leading-none">∞ / ∞</div>
          </div>
      </div>

      {/* Interaction Prompts */}
      <AnimatePresence>
          {gameState === GameState.FREEZE_TIME && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 flex items-center justify-center pt-[40vh]"
              >
                  <div className="bg-black/60 px-8 py-3 rounded border border-white/10 text-xl font-bold tracking-widest animate-pulse">
                      WAIT FOR ROUND START
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* End State */}
      <AnimatePresence>
          {(gameState === GameState.ROUND_OVER || gameState === GameState.GAME_OVER) && (
              <motion.div 
                className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center pointer-events-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                  <h1 className={`text-9xl font-black italic tracking-tighter ${roundWinner === Team.ATTACKERS ? 'text-red-600' : 'text-cyan-500'}`}>
                      {roundWinner === Team.ATTACKERS ? 'ROUND WON' : 'ROUND LOST'}
                  </h1>
                  <p className="text-zinc-500 font-mono mt-4">SYNCING WITH SERVER...</p>
                  
                  {gameState === GameState.GAME_OVER ? (
                      <div className="mt-12 flex flex-col items-center">
                          <h2 className="text-3xl text-white mb-8">Victory to the {winningTeam}</h2>
                          <button onClick={resetGame} className="px-12 py-4 bg-white text-black font-black text-xl hover:scale-110 transition-transform">BACK TO MENU</button>
                      </div>
                  ) : (
                      <button onClick={handleNextRound} className="mt-12 px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl pointer-events-auto">NEXT ROUND</button>
                  )}
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
