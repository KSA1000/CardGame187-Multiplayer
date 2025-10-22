const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// تخزين الغرف النشطة
const rooms = new Map();

// API Routes

// إنشاء غرفة جديدة
app.post('/api/create-room', (req, res) => {
    const roomId = uuidv4().substring(0, 8);
    
    database.createGame(roomId, (err, gameId) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create game' });
        }

        rooms.set(roomId, {
            gameId: gameId,
            players: [],
            gameState: null,
            status: 'waiting'
        });

        res.json({ roomId, gameId });
    });
});

// الانضمام إلى غرفة
app.post('/api/join-room', (req, res) => {
    const { roomId, playerName } = req.body;

    if (!rooms.has(roomId)) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const room = rooms.get(roomId);

    if (room.players.length >= 4) {
        return res.status(400).json({ error: 'Room is full' });
    }

    if (room.status !== 'waiting') {
        return res.status(400).json({ error: 'Game already started' });
    }

    database.createPlayer(playerName, (err, playerId) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create player' });
        }

        res.json({ success: true, playerId });
    });
});

// الحصول على معلومات الغرفة
app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;

    if (!rooms.has(roomId)) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const room = rooms.get(roomId);
    res.json({
        roomId,
        players: room.players.map(p => ({ name: p.name, id: p.id })),
        status: room.status,
        playerCount: room.players.length
    });
});

// الحصول على لوحة التسجيل
app.get('/api/leaderboard', (req, res) => {
    database.getLeaderboard((err, leaderboard) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get leaderboard' });
        }
        res.json(leaderboard);
    });
});

// الحصول على سجل المباريات
app.get('/api/games', (req, res) => {
    database.getAllGames((err, games) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get games' });
        }
        res.json(games);
    });
});

// الحصول على تفاصيل مباراة
app.get('/api/game/:gameId', (req, res) => {
    const { gameId } = req.params;
    
    database.getGameDetails(parseInt(gameId), (err, details) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get game details' });
        }
        res.json(details);
    });
});

// Socket.IO Events
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // الانضمام إلى غرفة
    socket.on('join-room', ({ roomId, playerName, playerId }) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const room = rooms.get(roomId);

        if (room.players.length >= 4) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        if (room.status !== 'waiting') {
            socket.emit('error', { message: 'Game already started' });
            return;
        }

        // إضافة اللاعب للغرفة
        const player = {
            id: playerId,
            name: playerName,
            socketId: socket.id,
            position: room.players.length
        };

        room.players.push(player);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerId = playerId;

        // تحديث قاعدة البيانات
        const updateData = {};
        updateData[`player${player.position + 1}_id`] = playerId;
        updateData[`player${player.position + 1}_name`] = playerName;

        database.updateGame(room.gameId, updateData, () => {
            // إرسال تحديث لجميع اللاعبين في الغرفة
            io.to(roomId).emit('room-update', {
                players: room.players.map(p => ({ name: p.name, id: p.id, position: p.position })),
                playerCount: room.players.length,
                status: room.status
            });

            console.log(`✅ Player ${playerName} joined room ${roomId} (${room.players.length}/4)`);

            // إذا اكتمل العدد، ابدأ اللعبة
            if (room.players.length === 4) {
                setTimeout(() => {
                    startGame(roomId);
                }, 2000);
            }
        });
    });

    // بدء اللعبة
    socket.on('start-game', () => {
        const roomId = socket.roomId;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            
            // ملء الأماكن الفارغة بلاعبين AI
            while (room.players.length < 4) {
                const aiPlayer = {
                    id: `ai-${room.players.length}`,
                    name: `AI ${room.players.length}`,
                    socketId: null,
                    position: room.players.length,
                    isAI: true
                };
                room.players.push(aiPlayer);
                
                // تحديث قاعدة البيانات
                const updateData = {};
                updateData[`player${aiPlayer.position + 1}_id`] = 0; // AI has id 0
                updateData[`player${aiPlayer.position + 1}_name`] = aiPlayer.name;
                database.updateGame(room.gameId, updateData, () => {});
            }
            
            // إرسال تحديث للاعبين
            io.to(roomId).emit('room-update', {
                players: room.players.map(p => ({ name: p.name, id: p.id, position: p.position, isAI: p.isAI || false })),
                playerCount: room.players.length,
                status: room.status
            });
            
            // بدء اللعبة
            setTimeout(() => {
                startGame(roomId);
            }, 1000);
        }
    });

    // إجراءات اللعبة
    socket.on('game-action', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        
        // إعادة إرسال الإجراء لجميع اللاعبين
        io.to(roomId).emit('game-action', {
            playerId: socket.playerId,
            action: data.action,
            data: data.data
        });

        // حفظ الإجراءات المهمة في قاعدة البيانات
        if (data.action === 'round-end') {
            saveRoundData(room, data.data);
        } else if (data.action === 'game-end') {
            saveGameEnd(room, data.data);
        }
    });

    // مغادرة الغرفة
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);

        const roomId = socket.roomId;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                console.log(`❌ Player ${player.name} left room ${roomId}`);

                // إذا كانت اللعبة لم تبدأ، احذف اللاعب
                if (room.status === 'waiting') {
                    room.players.splice(playerIndex, 1);
                    
                    io.to(roomId).emit('room-update', {
                        players: room.players.map(p => ({ name: p.name, id: p.id, position: p.position })),
                        playerCount: room.players.length,
                        status: room.status
                    });

                    // إذا لم يبق أحد، احذف الغرفة
                    if (room.players.length === 0) {
                        rooms.delete(roomId);
                        console.log(`🗑️ Room ${roomId} deleted (empty)`);
                    }
                } else {
                    // إذا كانت اللعبة بدأت، أعلم الآخرين
                    io.to(roomId).emit('player-disconnected', {
                        playerId: player.id,
                        playerName: player.name
                    });
                }
            }
        }
    });
});

// دالة بدء اللعبة
function startGame(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'waiting') return;

    room.status = 'playing';
    
    database.updateGame(room.gameId, { status: 'playing' }, () => {
        io.to(roomId).emit('game-start', {
            players: room.players.map(p => ({ name: p.name, id: p.id, position: p.position })),
            gameId: room.gameId
        });

        console.log(`🎮 Game started in room ${roomId}`);
    });
}

// حفظ بيانات الجولة
function saveRoundData(room, data) {
    const roundData = {
        game_id: room.gameId,
        round_number: data.roundNumber,
        bid_winner_id: data.bidWinnerId,
        bid_amount: data.bidAmount,
        trump_suit: data.trumpSuit,
        player1_score: data.scores[0],
        player2_score: data.scores[1],
        player3_score: data.scores[2],
        player4_score: data.scores[3]
    };

    database.saveRound(roundData, (err) => {
        if (err) {
            console.error('Error saving round:', err);
        } else {
            console.log(`💾 Round ${data.roundNumber} saved for game ${room.gameId}`);
        }
    });
}

// حفظ نهاية اللعبة
function saveGameEnd(room, data) {
    // تحديث الفائز
    database.updateGame(room.gameId, {
        winner_id: data.winnerId,
        winner_name: data.winnerName,
        status: 'finished'
    }, () => {
        // حفظ النتائج النهائية
        const scores = data.finalScores.map((score, index) => ({
            player_id: room.players[index].id,
            player_name: room.players[index].name,
            final_score: score
        })).sort((a, b) => b.final_score - a.final_score);

        database.saveFinalScores(room.gameId, scores, (err) => {
            if (err) {
                console.error('Error saving final scores:', err);
            } else {
                console.log(`🏆 Game ${room.gameId} finished. Winner: ${data.winnerName}`);
            }
        });
    });

    room.status = 'finished';
}

// API Endpoints

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    try {
        const leaderboard = database.getLeaderboard();
        res.json(leaderboard);
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get games history
app.get('/api/games-history', (req, res) => {
    try {
        const games = database.getGamesHistory();
        res.json(games);
    } catch (error) {
        console.error('Error getting games history:', error);
        res.status(500).json({ error: 'Failed to get games history' });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║     🎴 لعبة 187 - Multiplayer Server      ║
║                                            ║
║     🌐 Server running on port ${PORT}       ║
║     🔗 http://localhost:${PORT}             ║
║                                            ║
╚════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    database.close();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

