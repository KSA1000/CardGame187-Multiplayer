const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'game187.db'), (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('✅ Database connected successfully');
                this.initTables();
            }
        });
    }

    initTables() {
        // جدول اللاعبين
        this.db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // جدول المباريات
        this.db.run(`
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL UNIQUE,
                player1_id INTEGER,
                player2_id INTEGER,
                player3_id INTEGER,
                player4_id INTEGER,
                player1_name TEXT,
                player2_name TEXT,
                player3_name TEXT,
                player4_name TEXT,
                winner_id INTEGER,
                winner_name TEXT,
                started_at DATETIME,
                ended_at DATETIME,
                status TEXT DEFAULT 'waiting',
                FOREIGN KEY (player1_id) REFERENCES players(id),
                FOREIGN KEY (player2_id) REFERENCES players(id),
                FOREIGN KEY (player3_id) REFERENCES players(id),
                FOREIGN KEY (player4_id) REFERENCES players(id),
                FOREIGN KEY (winner_id) REFERENCES players(id)
            )
        `);

        // جدول الجولات
        this.db.run(`
            CREATE TABLE IF NOT EXISTS rounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                round_number INTEGER NOT NULL,
                bid_winner_id INTEGER,
                bid_amount INTEGER,
                trump_suit TEXT,
                player1_score INTEGER DEFAULT 0,
                player2_score INTEGER DEFAULT 0,
                player3_score INTEGER DEFAULT 0,
                player4_score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id)
            )
        `);

        // جدول النتائج النهائية
        this.db.run(`
            CREATE TABLE IF NOT EXISTS final_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                player_name TEXT NOT NULL,
                final_score INTEGER NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (player_id) REFERENCES players(id)
            )
        `);

        console.log('✅ Database tables initialized');
    }

    // إنشاء لاعب جديد
    createPlayer(name, callback) {
        this.db.run(
            'INSERT INTO players (name) VALUES (?)',
            [name],
            function(err) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, this.lastID);
                }
            }
        );
    }

    // إنشاء مباراة جديدة
    createGame(roomId, callback) {
        this.db.run(
            'INSERT INTO games (room_id, status, started_at) VALUES (?, ?, datetime("now"))',
            [roomId, 'waiting'],
            function(err) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, this.lastID);
                }
            }
        );
    }

    // تحديث معلومات المباراة
    updateGame(gameId, data, callback) {
        const fields = [];
        const values = [];

        if (data.player1_id !== undefined) {
            fields.push('player1_id = ?', 'player1_name = ?');
            values.push(data.player1_id, data.player1_name);
        }
        if (data.player2_id !== undefined) {
            fields.push('player2_id = ?', 'player2_name = ?');
            values.push(data.player2_id, data.player2_name);
        }
        if (data.player3_id !== undefined) {
            fields.push('player3_id = ?', 'player3_name = ?');
            values.push(data.player3_id, data.player3_name);
        }
        if (data.player4_id !== undefined) {
            fields.push('player4_id = ?', 'player4_name = ?');
            values.push(data.player4_id, data.player4_name);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.winner_id !== undefined) {
            fields.push('winner_id = ?', 'winner_name = ?', 'ended_at = datetime("now")');
            values.push(data.winner_id, data.winner_name);
        }

        values.push(gameId);

        const sql = `UPDATE games SET ${fields.join(', ')} WHERE id = ?`;
        
        this.db.run(sql, values, callback);
    }

    // حفظ جولة
    saveRound(data, callback) {
        this.db.run(
            `INSERT INTO rounds (game_id, round_number, bid_winner_id, bid_amount, trump_suit, 
             player1_score, player2_score, player3_score, player4_score) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.game_id,
                data.round_number,
                data.bid_winner_id,
                data.bid_amount,
                data.trump_suit,
                data.player1_score,
                data.player2_score,
                data.player3_score,
                data.player4_score
            ],
            callback
        );
    }

    // حفظ النتائج النهائية
    saveFinalScores(gameId, scores, callback) {
        const stmt = this.db.prepare(
            'INSERT INTO final_scores (game_id, player_id, player_name, final_score, position) VALUES (?, ?, ?, ?, ?)'
        );

        scores.forEach((score, index) => {
            stmt.run([gameId, score.player_id, score.player_name, score.final_score, index + 1]);
        });

        stmt.finalize(callback);
    }

    // الحصول على مباراة بواسطة room_id
    getGameByRoomId(roomId, callback) {
        this.db.get(
            'SELECT * FROM games WHERE room_id = ?',
            [roomId],
            callback
        );
    }

    // الحصول على جميع المباريات
    getAllGames(callback) {
        this.db.all(
            'SELECT * FROM games ORDER BY started_at DESC LIMIT 50',
            callback
        );
    }

    // الحصول على تفاصيل مباراة مع الجولات
    getGameDetails(gameId, callback) {
        this.db.get(
            'SELECT * FROM games WHERE id = ?',
            [gameId],
            (err, game) => {
                if (err || !game) {
                    callback(err, null);
                    return;
                }

                this.db.all(
                    'SELECT * FROM rounds WHERE game_id = ? ORDER BY round_number',
                    [gameId],
                    (err, rounds) => {
                        if (err) {
                            callback(err, null);
                            return;
                        }

                        this.db.all(
                            'SELECT * FROM final_scores WHERE game_id = ? ORDER BY position',
                            [gameId],
                            (err, scores) => {
                                callback(err, {
                                    game,
                                    rounds,
                                    scores
                                });
                            }
                        );
                    }
                );
            }
        );
    }

    // الحصول على لوحة التسجيل (أفضل اللاعبين)
    getLeaderboard(callback) {
        this.db.all(
            `SELECT 
                player_name,
                COUNT(*) as games_played,
                SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END) as wins,
                AVG(final_score) as avg_score
             FROM final_scores
             GROUP BY player_name
             ORDER BY wins DESC, avg_score DESC
             LIMIT 20`,
            callback
        );
    }

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = new Database();

