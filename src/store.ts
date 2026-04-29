import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export enum GameState {
  LOBBY = 'LOBBY',
  MATCHMAKING = 'MATCHMAKING',
  FREEZE_TIME = 'FREEZE_TIME',
  PLAYING = 'PLAYING',
  BOMB_PLANTED = 'BOMB_PLANTED',
  ROUND_OVER = 'ROUND_OVER',
  GAME_OVER = 'GAME_OVER'
}

export enum Team {
  ATTACKERS = 'ATTACKERS',
  DEFENDERS = 'DEFENDERS'
}

interface PlayerState {
  id: string;
  team: Team;
  health: number;
  isAlive: boolean;
  pos: [number, number, number];
  rot: [number, number, number];
}

interface GameStore {
  socket: Socket | null;
  gameState: GameState;
  roomId: string | null;
  attackerScore: number;
  defenderScore: number;
  currentRound: number;
  timer: number;
  bombTimer: number;
  bombPlanted: boolean;
  bombDefused: boolean;
  bombCarrierId: string | null;
  bombOnGround: boolean;
  bombPos: [number, number, number];
  players: Record<string, PlayerState>;
  myId: string;
  winningTeam: Team | null;
  roundWinner: Team | null;

  // Actions
  initSocket: () => void;
  joinQueue: (mode: '1v1' | '2v2') => void;
  updateLocalPos: (pos: [number, number, number], rot: [number, number, number]) => void;
  shoot: (origin: [number, number, number], direction: [number, number, number]) => void;
  damagePlayer: (targetId: string, amount: number) => void;
  plantBomb: () => void;
  defuseBomb: () => void;
  pickupBomb: () => void;
  resetGame: () => void;
  setGameState: (state: GameState) => void;
}

export const useStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: GameState.LOBBY,
  roomId: null,
  attackerScore: 0,
  defenderScore: 0,
  currentRound: 1,
  timer: 10, // Freeze time
  bombTimer: 30,
  bombPlanted: false,
  bombDefused: false,
  bombCarrierId: null,
  bombOnGround: true,
  bombPos: [0, 0, 5], // Example center location
  players: {},
  myId: '',
  winningTeam: null,
  roundWinner: null,

  initSocket: () => {
    if (get().socket) return;
    const socket = io();
    
    socket.on('connect', () => {
      console.log('[CLIENT] Connected with ID:', socket.id);
      set({ myId: socket.id });
    });

    socket.on('match_found', ({ roomId, initialState }) => {
      console.log('[CLIENT] Match found! Room:', roomId, 'State:', initialState);
      set({ 
        roomId, 
        gameState: GameState.FREEZE_TIME, 
        players: Object.fromEntries(initialState.players.map((p: any) => [p.id, p])),
        timer: 10,
        bombPos: initialState.bombPos,
        bombCarrierId: null,
        bombOnGround: true,
        attackerScore: initialState.attackerScore,
        defenderScore: initialState.defenderScore
      });
    });

    socket.on('player_moved', ({ id, pos, rot }) => {
      set((state) => ({
        players: {
          ...state.players,
          [id]: { ...state.players[id], pos, rot }
        }
      }));
    });

    socket.on('player_damaged', ({ targetId, amount }) => {
      set((state) => {
        const player = state.players[targetId];
        if (!player) return state;
        const newHealth = Math.max(0, player.health - amount);
        return {
          players: {
            ...state.players,
            [targetId]: { ...player, health: newHealth, isAlive: newHealth > 0 }
          }
        };
      });
    });

    socket.on('bomb_picked_up', ({ id }) => {
      set({ bombCarrierId: id, bombOnGround: false });
    });

    socket.on('bomb_planted', () => {
      set({ gameState: GameState.BOMB_PLANTED, bombPlanted: true, bombTimer: 30 });
    });

    socket.on('bomb_defused', () => {
      set({ gameState: GameState.ROUND_OVER, roundWinner: Team.DEFENDERS });
    });

    socket.on('state_update', ({ gameState, timer }) => {
      set({ gameState, timer });
    });

    socket.on('round_end', ({ winner, scores }) => {
      const nextRound = get().currentRound + 1;
      const isGameOver = scores.attacker >= 5 || scores.defender >= 5;
      
      set({
        gameState: isGameOver ? GameState.GAME_OVER : GameState.ROUND_OVER,
        roundWinner: winner,
        attackerScore: scores.attacker,
        defenderScore: scores.defender,
        winningTeam: isGameOver ? (scores.attacker >= 5 ? Team.ATTACKERS : Team.DEFENDERS) : null,
        currentRound: nextRound
      });
    });

    set({ socket });
  },

  joinQueue: (mode) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_queue', mode);
      set({ gameState: GameState.MATCHMAKING });
    }
  },

  updateLocalPos: (pos, rot) => {
    const { socket, roomId, myId } = get();
    if (socket && roomId) {
      socket.emit('update_pos', { roomId, pos, rot });
    }
    set((state) => ({
        players: {
            ...state.players,
            [myId]: { ...state.players[myId], pos, rot }
        }
    }));
  },

  shoot: (origin, direction) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('shoot', { roomId, origin, direction });
    }
  },

  damagePlayer: (targetId, amount) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('damage_player', { roomId, targetId, amount });
    }
  },

  plantBomb: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('plant_bomb', { roomId });
    }
  },

  defuseBomb: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('defuse_bomb', { roomId });
    }
  },

  pickupBomb: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('pickup_bomb', { roomId });
    }
  },

  setGameState: (state) => set({ gameState: state }),

  resetGame: () => set({
    gameState: GameState.LOBBY,
    attackerScore: 0,
    defenderScore: 0,
    currentRound: 1,
    timer: 10,
    players: {},
    roomId: null,
    bombCarrierId: null,
    bombOnGround: true
  })
}));
