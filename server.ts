import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  // Simple room management
  const queues: Record<string, string[]> = {
    "1v1": [],
    "2v2": []
  };

  const rooms: Record<string, any> = {};

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_queue", (mode: string) => {
      console.log(`Player ${socket.id} joined ${mode} queue`);
      queues[mode].push(socket.id);

      const targetCount = mode === "1v1" ? 2 : 4;
      if (queues[mode].length >= targetCount) {
        const playersInMatch = queues[mode].splice(0, targetCount);
        const roomId = "room_" + Date.now();
        
        const roomState = {
          id: roomId,
          players: playersInMatch.map((id, index) => ({
            id,
            team: index < targetCount / 2 ? "ATTACKERS" : "DEFENDERS",
            pos: index < targetCount / 2 ? [0, 4, 25] : [0, 4, -25], // Corrected spawn
            health: 100,
            isAlive: true
          })),
          gameState: "FREEZE_TIME",
          timer: 10,
          bombPos: [0, 0.5, 20], // Near attackers side for pickup
          bombCarrierId: null,
          attackerScore: 0,
          defenderScore: 0,
          currentRound: 1
        };

        rooms[roomId] = roomState;

        playersInMatch.forEach(pid => {
          const s = io.sockets.sockets.get(pid);
          if (s) {
            s.join(roomId);
            s.emit("match_found", { roomId, initialState: roomState });
          }
        });

        // Start server-side tick for this room
        const interval = setInterval(() => {
          const room = rooms[roomId];
          if (!room) {
              clearInterval(interval);
              return;
          }

          if (room.gameState === "FREEZE_TIME" || room.gameState === "PLAYING" || room.gameState === "BOMB_PLANTED") {
              room.timer--;
              
              if (room.timer <= 0) {
                  if (room.gameState === "FREEZE_TIME") {
                      room.gameState = "PLAYING";
                      room.timer = 60;
                      io.to(roomId).emit("state_update", { gameState: "PLAYING", timer: 60 });
                  } else if (room.gameState === "PLAYING") {
                      // Time up, attackers failed to plant
                      room.defenderScore++;
                      room.gameState = "ROUND_OVER";
                      io.to(roomId).emit("round_end", { winner: "DEFENDERS", scores: { attacker: room.attackerScore, defender: room.defenderScore } });
                  } else if (room.gameState === "BOMB_PLANTED") {
                      // Bomb exploded
                      room.attackerScore++;
                      room.gameState = "ROUND_OVER";
                      io.to(roomId).emit("round_end", { winner: "ATTACKERS", scores: { attacker: room.attackerScore, defender: room.defenderScore } });
                  }
              }
          }
        }, 1000);
      }
    });

    socket.on("damage_player", ({ roomId, targetId, amount }) => {
         const room = rooms[roomId];
         if (!room) return;
         const player = room.players.find((p: any) => p.id === targetId);
         if (player && player.isAlive) {
             player.health = Math.max(0, player.health - amount);
             if (player.health <= 0) {
                 player.isAlive = false;
                 io.to(roomId).emit("player_damaged", { targetId, amount });
                 
                 // Check win conditions
                 const attackersAlive = room.players.filter((p: any) => p.team === "ATTACKERS" && p.isAlive).length;
                 const defendersAlive = room.players.filter((p: any) => p.team === "DEFENDERS" && p.isAlive).length;

                 if (room.gameState === "PLAYING") {
                     if (attackersAlive === 0) {
                         // Defenders win round
                         room.defenderScore++;
                         room.gameState = "ROUND_OVER";
                         io.to(roomId).emit("round_end", { winner: "DEFENDERS", scores: { attacker: room.attackerScore, defender: room.defenderScore } });
                     } else if (defendersAlive === 0) {
                         // Defenders dead, but attackers must still plant according to rules
                         // No immediate win
                     }
                 } else if (room.gameState === "BOMB_PLANTED") {
                     if (defendersAlive === 0) {
                         // Attackers win
                         room.attackerScore++;
                         room.gameState = "ROUND_OVER";
                         io.to(roomId).emit("round_end", { winner: "ATTACKERS", scores: { attacker: room.attackerScore, defender: room.defenderScore } });
                     }
                 }
             } else {
                 io.to(roomId).emit("player_damaged", { targetId, amount });
             }
         }
    });

    socket.on("update_pos", ({ roomId, pos, rot }) => {
        socket.to(roomId).emit("player_moved", { id: socket.id, pos, rot });
    });

    socket.on("shoot", ({ roomId, origin, direction }) => {
        socket.to(roomId).emit("player_shot", { id: socket.id, origin, direction });
    });

    socket.on("pickup_bomb", ({ roomId }) => {
      const room = rooms[roomId];
      if (room && !room.bombCarrierId) {
          room.bombCarrierId = socket.id;
          io.to(roomId).emit("bomb_picked_up", { id: socket.id });
      }
    });

    socket.on("plant_bomb", ({ roomId }) => {
         const room = rooms[roomId];
         if (room) {
             room.gameState = "BOMB_PLANTED";
             room.timer = 30;
             io.to(roomId).emit("bomb_planted");
         }
    });

    socket.on("defuse_bomb", ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            room.defenderScore++;
            room.gameState = "ROUND_OVER";
            io.to(roomId).emit("round_end", { winner: "DEFENDERS", scores: { attacker: room.attackerScore, defender: room.defenderScore } });
            io.to(roomId).emit("bomb_defused");
        }
    });

    socket.on("ready_next", ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.gameState === "ROUND_OVER") {
             // For simplicity, reset immediately or wait for all? 
             // Let's reset immediately to keep flow fast for a 1v1
             room.gameState = "FREEZE_TIME";
             room.timer = 10;
             room.bombCarrierId = null;
             room.bombPos = [0, 0.5, 20];
             room.players.forEach((p: any) => {
                 p.health = 100;
                 p.isAlive = true;
             });
             io.to(roomId).emit("match_found", { roomId, initialState: room }); 
        }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      Object.keys(queues).forEach(mode => {
        queues[mode] = queues[mode].filter(id => id !== socket.id);
      });
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
