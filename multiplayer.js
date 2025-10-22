// Multiplayer Client Logic

let socket = null;
let currentRoomId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let gameState = null;

// Initialize socket connection
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        showError('تم قطع الاتصال بالخادم');
    });
    
    socket.on('error', (data) => {
        showError(data.message);
    });
    
    socket.on('room-update', (data) => {
        updatePlayerslist(data.players);
    });
    
    socket.on('game-start', (data) => {
        console.log('🎮 Game starting!', data);
        startMultiplayerGame(data);
    });
    
    socket.on('game-action', (data) => {
        handleGameAction(data);
    });
    
    socket.on('player-disconnected', (data) => {
        showError(`اللاعب ${data.playerName} غادر اللعبة`);
    });
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    showScreen('home-screen');
}

function showJoinRoom() {
    showScreen('join-screen');
    
    // Reset form
    document.getElementById('room-code').disabled = false;
    document.getElementById('room-code').placeholder = 'أدخل رمز الغرفة';
    
    const joinBtn = document.querySelector('#join-screen .btn-primary');
    joinBtn.textContent = 'انضم الآن';
    joinBtn.onclick = joinRoom;
    
    // Auto-fill room code from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        document.getElementById('room-code').value = roomId;
    }
}

function showCreateRoom() {
    // Show join screen with empty room code
    showScreen('join-screen');
    document.getElementById('room-code').value = '';
    document.getElementById('room-code').placeholder = 'سيتم إنشاء غرفة جديدة تلقائياً';
    document.getElementById('room-code').disabled = true;
    
    // Change button text
    const joinBtn = document.querySelector('#join-screen .btn-primary');
    joinBtn.textContent = 'إنشاء غرفة';
    joinBtn.onclick = createRoomFromForm;
}

function createRoomFromForm() {
    const playerName = document.getElementById('player-name').value.trim();
    
    if (!playerName) {
        showError('الرجاء إدخال اسمك', 'join-error');
        return;
    }
    
    currentPlayerName = playerName;
    createRoom();
}

function showLeaderboard() {
    // TODO: Implement leaderboard screen
    alert('لوحة التسجيل قيد التطوير');
}

function showHistory() {
    // TODO: Implement history screen
    alert('سجل المباريات قيد التطوير');
}

// Create Room
async function createRoom() {
    try {
        const response = await fetch('/api/create-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentRoomId = data.roomId;
            
            // Create player
            const playerResponse = await fetch('/api/join-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: currentRoomId,
                    playerName: currentPlayerName
                })
            });
            
            const playerData = await playerResponse.json();
            
            if (playerResponse.ok) {
                currentPlayerId = playerData.playerId;
                
                // Initialize socket and join room
                if (!socket) initSocket();
                socket.emit('join-room', {
                    roomId: currentRoomId,
                    playerName: currentPlayerName,
                    playerId: currentPlayerId
                });
                
                // Show waiting room
                showWaitingRoom();
            } else {
                showError(playerData.error);
            }
        } else {
            showError(data.error);
        }
    } catch (error) {
        console.error('Error creating room:', error);
        showError('فشل في إنشاء الغرفة');
    }
}

// Join Room
async function joinRoom() {
    const playerName = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!playerName) {
        showError('الرجاء إدخال اسمك', 'join-error');
        return;
    }
    
    if (!roomCode) {
        showError('الرجاء إدخال رمز الغرفة', 'join-error');
        return;
    }
    
    try {
        // Check if room exists
        const roomResponse = await fetch(`/api/room/${roomCode}`);
        
        if (!roomResponse.ok) {
            showError('الغرفة غير موجودة', 'join-error');
            return;
        }
        
        const roomData = await roomResponse.json();
        
        if (roomData.playerCount >= 4) {
            showError('الغرفة ممتلئة', 'join-error');
            return;
        }
        
        if (roomData.status !== 'waiting') {
            showError('اللعبة بدأت بالفعل', 'join-error');
            return;
        }
        
        // Create player and join
        const playerResponse = await fetch('/api/join-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: roomCode,
                playerName: playerName
            })
        });
        
        const playerData = await playerResponse.json();
        
        if (playerResponse.ok) {
            currentRoomId = roomCode;
            currentPlayerId = playerData.playerId;
            currentPlayerName = playerName;
            
            // Initialize socket and join room
            if (!socket) initSocket();
            socket.emit('join-room', {
                roomId: currentRoomId,
                playerName: currentPlayerName,
                playerId: currentPlayerId
            });
            
            // Show waiting room
            showWaitingRoom();
        } else {
            showError(playerData.error, 'join-error');
        }
    } catch (error) {
        console.error('Error joining room:', error);
        showError('فشل في الانضمام إلى الغرفة', 'join-error');
    }
}

// Show Waiting Room
function showWaitingRoom() {
    showScreen('waiting-screen');
    
    // Display room code
    document.getElementById('display-room-code').textContent = currentRoomId;
    
    // Display share link
    const shareUrl = `${window.location.origin}?room=${currentRoomId}`;
    document.getElementById('share-link').textContent = shareUrl;
}

// Update Players List
function updatePlayerslist(players) {
    const playerSlots = document.querySelectorAll('.player-slot');
    
    playerSlots.forEach((slot, index) => {
        if (players[index]) {
            slot.classList.add('filled');
            const playerName = players[index].name;
            const isAI = players[index].isAI;
            slot.querySelector('.player-name').textContent = playerName + (isAI ? ' 🤖' : '');
            slot.querySelector('.player-status').textContent = `لاعب ${index + 1}${isAI ? ' (AI)' : ''}`;
        } else {
            slot.classList.remove('filled');
            slot.querySelector('.player-name').textContent = 'في انتظار لاعب...';
            slot.querySelector('.player-status').textContent = `${index + 1}/4`;
        }
    });
}

// Copy Link
function copyLink() {
    const link = document.getElementById('share-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
        alert('تم نسخ الرابط!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Leave Room
function leaveRoom() {
    if (confirm('هل أنت متأكد من المغادرة؟')) {
        if (socket) {
            socket.disconnect();
        }
        currentRoomId = null;
        currentPlayerId = null;
        currentPlayerName = null;
        showHome();
    }
}

// Start Game Now (with AI players if needed)
function startGameNow() {
    if (!socket || !currentRoomId) {
        showError('غير متصل بالغرفة');
        return;
    }
    
    // بدء اللعبة مباشرة
    socket.emit('start-game');
}

// Start Multiplayer Game
function startMultiplayerGame(data) {
    console.log('Starting multiplayer game with data:', data);
    showScreen('game-screen');
    
    // Initialize game with multiplayer logic
    if (window.initializeMultiplayerGame) {
        window.initializeMultiplayerGame(data);
    } else {
        console.error('Game initialization function not found');
    }
}

// Handle Game Actions
function handleGameAction(data) {
    console.log('Game action received:', data);
    // TODO: Handle different game actions
}

// Send Game Action
function sendGameAction(action, actionData) {
    if (socket) {
        socket.emit('game-action', {
            action: action,
            data: actionData
        });
    }
}

// Show Error
function showError(message, elementId = null) {
    if (elementId) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    } else {
        alert(message);
    }
}

// Navigate to leaderboard
function showLeaderboard() {
    window.location.href = '/leaderboard.html';
}

// Navigate to games history
function showGamesHistory() {
    window.location.href = '/history.html';
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    connectToServer();
    
    // Attach event listeners to buttons
    const leaderboardBtn = document.querySelector('button[onclick*="لوحة التسجيل"]');
    const historyBtn = document.querySelector('button[onclick*="سجل المباريات"]');
    
    if (leaderboardBtn) {
        leaderboardBtn.onclick = showLeaderboard;
    }
    
    if (historyBtn) {
        historyBtn.onclick = showGamesHistory;
    }
    
    // Check if there's a room code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        // Auto-show join screen if room code is in URL
        showJoinRoom();
    }
});

