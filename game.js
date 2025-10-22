// لعبة 187 - منطق اللعبة الكامل

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    // الحصول على قيمة النقاط
    getPoints() {
        const pointsMap = {
            'A': 11,
            'K': 4,
            'Q': 4,
            'J': 4,
            '10': 10,
            '9': 0,
            '8': 0,
            '7': 0,
            '6': 0
        };
        
        if (this.rank === '2') {
            return this.suit === 'clubs' ? 25 : 10;
        }
        
        return pointsMap[this.rank] || 0;
    }

    // الحصول على قوة الورقة (للمقارنة)
    getPower() {
        const powerMap = {
            '2': 14,
            'A': 13,
            'K': 12,
            'Q': 11,
            'J': 10,
            '10': 9,
            '9': 8,
            '8': 7,
            '7': 6,
            '6': 5
        };
        return powerMap[this.rank] || 0;
    }

    // الحصول على رمز النوع
    getSuitSymbol() {
        const symbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'spades': '♠',
            'clubs': '♣'
        };
        return symbols[this.suit];
    }

    // الحصول على اسم النوع بالعربي
    getSuitNameAr() {
        const names = {
            'hearts': 'هاس',
            'diamonds': 'دايموند',
            'spades': 'سبيت',
            'clubs': 'كلفس'
        };
        return names[this.suit];
    }

    // تحويل إلى HTML
    toHTML(faceDown = false, selectable = false, selected = false) {
        if (faceDown) {
            return `<div class="card card-back">🂠</div>`;
        }

        const suitClass = (this.suit === 'hearts' || this.suit === 'diamonds') ? 'hearts' : 'spades';
        const selectedClass = selected ? 'selected' : '';
        const selectableClass = selectable ? '' : 'disabled';
        const points = this.getPoints();
        
        return `
            <div class="card ${suitClass} ${selectableClass} ${selectedClass}" 
                 data-rank="${this.rank}" 
                 data-suit="${this.suit}">
                ${points > 0 ? `<div class="card-points">${points}</div>` : ''}
                <div class="card-rank">${this.rank}</div>
                <div class="card-suit">${this.getSuitSymbol()}</div>
                <div class="card-rank">${this.rank}</div>
            </div>
        `;
    }
}

class Player {
    constructor(id, name, isHuman = false) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.hand = [];
        this.score = 0;
        this.roundScore = 0;
        this.consecutiveNoBids = 0;
        this.accumulatedNonBidPoints = 0;
    }

    addCard(card) {
        this.hand.push(card);
    }

    removeCard(card) {
        const index = this.hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (index > -1) {
            this.hand.splice(index, 1);
        }
    }

    // حساب قيمة اليد
    getHandValue() {
        return this.hand.reduce((sum, card) => sum + card.getPoints(), 0);
    }

    // ترتيب الأوراق
    sortHand() {
        this.hand.sort((a, b) => {
            if (a.suit !== b.suit) {
                const suitOrder = { 'hearts': 0, 'diamonds': 1, 'spades': 2, 'clubs': 3 };
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            return b.getPower() - a.getPower();
        });
    }
}

class Game187 {
    constructor() {
        this.players = [];
        this.deck = [];
        this.fieldCards = [];
        this.currentTrick = [];
        this.trumpSuit = null;
        this.currentBid = 0;
        this.bidWinner = null;
        this.currentPlayer = 0;
        this.dealer = 0;
        this.gameState = 'start';
        this.settings = {
            gameSpeed: 'normal',
            aiLevel: 'medium',
            soundEnabled: true
        };
        this.selectedCards = [];
        this.biddingHistory = [];
    }

    // إنشاء المجموعة
    createDeck() {
        const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
        const ranks = ['A', '2', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push(new Card(rank, suit));
            }
        }
    }

    // خلط الأوراق
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // توزيع الأوراق
    dealCards() {
        this.createDeck();
        this.shuffleDeck();
        
        // توزيع 9 أوراق لكل لاعب مع صوت
        let cardIndex = 0;
        const totalCards = 36; // 9 أوراق × 4 لاعبين
        
        const dealWithSound = () => {
            if (cardIndex < totalCards) {
                const playerIndex = Math.floor(cardIndex / 9);
                this.players[playerIndex].addCard(this.deck.pop());
                
                // تشغيل صوت توزيع الورقة
                if (window.soundManager && this.settings.soundEnabled) {
                    soundManager.playCardDeal();
                }
                
                cardIndex++;
                setTimeout(dealWithSound, 80); // 80ms بين كل ورقة
            } else {
                // بعد توزيع أوراق اللاعبين، توزيع أوراق الميدان
                this.fieldCards = [];
                for (let i = 0; i < 4; i++) {
                    this.fieldCards.push(this.deck.pop());
                    if (window.soundManager && this.settings.soundEnabled) {
                        soundManager.playCardDeal();
                    }
                }
                
                // ترتيب أوراق اللاعبين
                this.players.forEach(p => p.sortHand());
                
                // التحقق من إعادة التوزيع (أقل من 12 نقطة)
                for (let player of this.players) {
                    if (player.getHandValue() < 12) {
                        this.showMessage(`${player.name} لديه أقل من 12 نقطة. إعادة التوزيع...`);
                        setTimeout(() => this.dealCards(), 2000);
                        return;
                    }
                }
                
                // تحديث الواجهة بعد انتهاء التوزيع
                this.updateUI();
                
                // بدء المزايدة
                this.currentPlayer = (this.dealer + 1) % 4;
                this.gameState = 'bidding';
                this.showMessage('بدء المزايدة...');
                
                setTimeout(() => {
                    this.startBidding();
                }, 1000);
            }
        };
        
        dealWithSound();
        return true;
        
    }

    // بدء لعبة جديدة
    startNewGame() {
        this.showScreen('gameScreen');
        
        // إنشاء اللاعبين
        this.players = [
            new Player(0, 'أنت', true),
            new Player(1, 'AI 1', false),
            new Player(2, 'AI 2', false),
            new Player(3, 'AI 3', false)
        ];
        
        this.dealer = 0;
        this.players.forEach(p => {
            p.score = 0;
            p.roundScore = 0;
            p.consecutiveNoBids = 0;
            p.accumulatedNonBidPoints = 0;
        });
        
        this.updateScores();
        this.startNewRound();
    }

    // بدء جولة جديدة
    startNewRound() {
        // إعادة تعيين الجولة
        this.trumpSuit = null;
        this.currentBid = 0;
        this.bidWinner = null;
        this.currentTrick = [];
        this.biddingHistory = [];
        this.selectedCards = [];
        
        this.players.forEach(p => {
            p.hand = [];
            p.roundScore = 0;
        });
        
        // توزيع الأوراق (سيتم بدء المزايدة تلقائياً من داخل dealCards)
        this.dealCards();
    }

    // بدء المزايدة
    startBidding() {
        this.biddingHistory = [
            { player: null, bid: null },
            { player: null, bid: null },
            { player: null, bid: null },
            { player: null, bid: null }
        ];
        this.biddingRound = 0; // عداد جولات المزايدة
        this.lastBidPlayer = -1; // آخر لاعب زايد
        this.consecutivePasses = 0; // عدد الباسات المتتالية
        
        this.processBidding();
    }

    // معالجة المزايدة
    processBidding() {
        const player = this.players[this.currentPlayer];
        
        // إذا كان هناك مزايدة ومر 3 لاعبين بعد آخر مزايدة وكلهم باس
        if (this.lastBidPlayer !== -1 && this.consecutivePasses >= 3) {
            this.endBidding();
            return;
        }
        
        // إذا الكل باس في الجولة الأولى
        if (this.biddingRound >= 4 && this.currentBid === 0) {
            this.endBidding();
            return;
        }
        
        this.showMessage(`${player.name} يزايد...`);
        this.updatePlayerTurn();
        
        if (player.isHuman) {
            this.showBiddingModal();
        } else {
            setTimeout(() => {
                const bid = this.getAIBid(player);
                this.placeBid(bid);
            }, 1500);
        }
    }

    // عرض نافذة المزايدة
    showBiddingModal() {
        const modal = document.getElementById('biddingModal');
        const buttonsContainer = document.getElementById('biddingButtons');
        const cardsContainer = document.getElementById('biddingPlayerCards');
        
        buttonsContainer.innerHTML = '';
        cardsContainer.innerHTML = '';
        
        // عرض أوراق اللاعب البشري
        const humanPlayer = this.players.find(p => p.isHuman);
        if (humanPlayer) {
            humanPlayer.hand.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.innerHTML = card.toHTML(false, false, false);
                cardsContainer.appendChild(cardDiv);
            });
        }
        
        // أزرار المزايدة
        const minBid = this.currentBid === 0 ? 100 : this.currentBid + 5;
        
        for (let bid = minBid; bid <= 187; bid += 5) {
            const btn = document.createElement('button');
            btn.className = 'bid-btn';
            btn.textContent = bid;
            btn.onclick = () => this.placeBid(bid);
            buttonsContainer.appendChild(btn);
        }
        
        // زر باس
        const passBtn = document.createElement('button');
        passBtn.className = 'bid-btn pass';
        passBtn.textContent = 'باس';
        passBtn.onclick = () => this.placeBid('pass');
        buttonsContainer.appendChild(passBtn);
        
        modal.classList.add('show');
    }

    // وضع مزايدة
    placeBid(bid) {
        const modal = document.getElementById('biddingModal');
        modal.classList.remove('show');
        
        const player = this.players[this.currentPlayer];
        this.biddingHistory[this.currentPlayer] = { player: this.currentPlayer, bid: bid };
        this.biddingRound++;
        
        if (bid !== 'pass') {
            // لاعب زايد
            if (bid > 187) {
                // منع المزايدة فوق 187
                this.showMessage(`خطأ: لا يمكن المزايدة فوق 187!`);
                return;
            }
            this.currentBid = bid;
            this.bidWinner = this.currentPlayer;
            this.lastBidPlayer = this.currentPlayer;
            this.consecutivePasses = 0; // إعادة تعيين عداد الباسات
            this.showMessage(`${player.name} زايد ${bid}`);
        } else {
            // لاعب باس
            this.consecutivePasses++;
            this.showMessage(`${player.name} باس`);
        }
        
        setTimeout(() => {
            this.currentPlayer = (this.currentPlayer + 1) % 4;
            this.processBidding();
        }, 1500);
    }

    // الحصول على مزايدة الذكاء الاصطناعي
    getAIBid(player) {
        const handValue = player.getHandValue();
        const handPower = player.hand.reduce((sum, card) => sum + card.getPower(), 0);
        
        // إذا كانت المزايدة وصلت 187، لا يمكن المزايدة أكثر
        if (this.currentBid >= 187) {
            return 'pass';
        }
        
        // استراتيجية بسيطة للذكاء الاصطناعي
        if (handValue < 40) {
            return 'pass';
        }
        
        const minBid = this.currentBid === 0 ? 100 : this.currentBid + 5;
        
        // منع المزايدة فوق 187
        if (minBid > 187) {
            return 'pass';
        }
        
        if (handValue >= 80 && handPower >= 70) {
            // يد قوية جدا، مزايدة عالية
            return Math.min(minBid + 10, 150);
        } else if (handValue >= 60) {
            // يد جيدة، مزايدة متوسطة
            return minBid;
        } else if (handValue >= 40 && this.currentBid === 0) {
            // يد متوسطة، مزايدة باب فقط
            return 100;
        }
        
        return 'pass';
    }

    // انتهاء المزايدة
    endBidding() {
        // إذا الكل باس، الباب يروح للاعب الأول
        if (this.currentBid === 0) {
            this.bidWinner = (this.dealer + 1) % 4;
            this.currentBid = 100;
            this.showMessage(`الكل باس! ${this.players[this.bidWinner].name} ياخذ الباب (100)`);
        } else {
            this.showMessage(`${this.players[this.bidWinner].name} فاز بالمزايدة: ${this.currentBid}`);
        }
        
        this.updateRoundInfo();
        
        setTimeout(() => {
            this.giveFieldCardsToWinner();
        }, 2000);
    }

    // إعطاء أوراق الميدان للفائز
    giveFieldCardsToWinner() {
        const winner = this.players[this.bidWinner];
        
        this.showMessage(`${winner.name} يأخذ أوراق الميدان...`);
        
        // إضافة أوراق الميدان للفائز
        this.fieldCards.forEach(card => winner.addCard(card));
        winner.sortHand();
        this.fieldCards = [];
        
        this.updateUI();
        
        setTimeout(() => {
            if (winner.isHuman) {
                this.showReturnCardsModal();
            } else {
                this.aiReturnCards();
            }
        }, 2000);
    }

    // عرض نافذة إعادة الأوراق
    showReturnCardsModal() {
        const modal = document.getElementById('returnCardsModal');
        const cardsArea = document.getElementById('returnCardsArea');
        const confirmBtn = document.getElementById('confirmReturnBtn');
        
        this.selectedCards = [];
        cardsArea.innerHTML = '';
        
        const winner = this.players[this.bidWinner];
        winner.hand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = card.toHTML(false, true, false);
            cardDiv.onclick = () => this.toggleCardSelection(card, cardDiv);
            cardsArea.appendChild(cardDiv);
        });
        
        confirmBtn.disabled = true;
        modal.classList.add('show');
    }

    // تبديل اختيار الورقة
    toggleCardSelection(card, cardDiv) {
        const index = this.selectedCards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        
        if (index > -1) {
            this.selectedCards.splice(index, 1);
            cardDiv.querySelector('.card').classList.remove('selected');
        } else {
            if (this.selectedCards.length < 3) {
                this.selectedCards.push(card);
                cardDiv.querySelector('.card').classList.add('selected');
            }
        }
        
        document.getElementById('confirmReturnBtn').disabled = this.selectedCards.length !== 3;
    }

    // تأكيد إعادة الأوراق
    confirmReturnCards() {
        const modal = document.getElementById('returnCardsModal');
        modal.classList.remove('show');
        
        this.returnCardsToTable(this.selectedCards);
    }

    // الذكاء الاصطناعي يعيد الأوراق
    aiReturnCards() {
        const winner = this.players[this.bidWinner];
        
        // اختيار أضعف 3 أوراق
        const sortedByValue = [...winner.hand].sort((a, b) => {
            const aValue = a.getPoints() + a.getPower();
            const bValue = b.getPoints() + b.getPower();
            return aValue - bValue;
        });
        
        const cardsToReturn = sortedByValue.slice(0, 3);
        
        setTimeout(() => {
            this.returnCardsToTable(cardsToReturn);
        }, 2000);
    }

    // إعادة الأوراق للطاولة
    returnCardsToTable(cards) {
        const winner = this.players[this.bidWinner];
        
        // إزالة الأوراق من يد الفائز
        cards.forEach(card => winner.removeCard(card));
        
        // خلط الأوراق
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        
        // توزيع الأوراق على اللاعبين الآخرين
        let cardIndex = 0;
        for (let i = 0; i < 4; i++) {
            if (i !== this.bidWinner) {
                this.players[i].addCard(shuffledCards[cardIndex]);
                this.players[i].sortHand();
                cardIndex++;
            }
        }
        
        this.updateUI();
        this.showMessage('تم توزيع الأوراق...');
        
        setTimeout(() => {
            if (this.players[this.bidWinner].isHuman) {
                this.showTrumpModal();
            } else {
                this.aiSelectTrump();
            }
        }, 2000);
    }

    // عرض نافذة اختيار الحكم
    showTrumpModal() {
        const modal = document.getElementById('trumpModal');
        const cardsContainer = document.getElementById('trumpPlayerCards');
        
        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            
            // عرض أوراق اللاعب البشري
            const humanPlayer = this.players.find(p => p.isHuman);
            if (humanPlayer && humanPlayer.hand) {
                humanPlayer.hand.forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.innerHTML = card.toHTML(false, false, false);
                    cardsContainer.appendChild(cardDiv);
                });
            }
        }
        
        modal.classList.add('show');
    }

    // اختيار الحكم
    selectTrump(suit) {
        const modal = document.getElementById('trumpModal');
        modal.classList.remove('show');
        
        this.trumpSuit = suit;
        this.updateRoundInfo();
        
        const suitNames = {
            'hearts': 'هاس',
            'diamonds': 'دايموند',
            'spades': 'سبيت',
            'clubs': 'كلفس'
        };
        
        this.showMessage(`الحكم: ${suitNames[suit]}`);
        
        setTimeout(() => {
            this.startPlaying();
        }, 2000);
    }

    // الذكاء الاصطناعي يختار الحكم
    aiSelectTrump() {
        const winner = this.players[this.bidWinner];
        
        // اختيار النوع الذي لديه أكثر أوراق
        const suitCounts = {
            'hearts': 0,
            'diamonds': 0,
            'spades': 0,
            'clubs': 0
        };
        
        winner.hand.forEach(card => {
            suitCounts[card.suit]++;
        });
        
        const bestSuit = Object.keys(suitCounts).reduce((a, b) => 
            suitCounts[a] > suitCounts[b] ? a : b
        );
        
        setTimeout(() => {
            this.selectTrump(bestSuit);
        }, 2000);
    }

    // بدء اللعب
    startPlaying() {
        this.gameState = 'playing';
        this.currentPlayer = (this.dealer + 1) % 4;
        this.currentTrick = [];
        
        this.playTrick();
    }

    // لعب حيلة
    playTrick() {
        if (this.currentTrick.length === 4) {
            this.evaluateTrick();
            return;
        }
        
        const player = this.players[this.currentPlayer];
        this.updatePlayerTurn();
        
        if (player.isHuman) {
            this.showMessage('دورك! اختر ورقة');
            this.enableCardSelection();
        } else {
            setTimeout(() => {
                const card = this.getAICardToPlay(player);
                this.playCard(card);
            }, 1500);
        }
    }

    // تفعيل اختيار الأوراق
    enableCardSelection() {
        const playerHandDiv = document.getElementById('playerHand');
        const player = this.players[0];
        
        playerHandDiv.innerHTML = '';
        
        player.hand.forEach(card => {
            const canPlay = this.canPlayCard(card, player);
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = card.toHTML(false, canPlay, false);
            
            if (canPlay) {
                cardDiv.onclick = () => {
                    this.playCard(card);
                };
            }
            
            playerHandDiv.appendChild(cardDiv);
        });
    }

    // التحقق من إمكانية لعب الورقة
    canPlayCard(card, player) {
        if (this.currentTrick.length === 0) {
            return true;
        }
        
        const ledSuit = this.currentTrick[0].card.suit;
        const hasSuit = player.hand.some(c => c.suit === ledSuit);
        
        if (hasSuit) {
            return card.suit === ledSuit;
        }
        
        return true;
    }

    // لعب ورقة
    playCard(card) {
        const player = this.players[this.currentPlayer];
        
        player.removeCard(card);
        this.currentTrick.push({
            player: this.currentPlayer,
            card: card
        });
        
        // تشغيل صوت لعب الورقة
        if (window.soundManager && this.settings.soundEnabled) {
            soundManager.playCardPlay();
        }
        
        this.updateUI();
        this.updatePlayedCards();
        
        this.currentPlayer = (this.currentPlayer + 1) % 4;
        
        setTimeout(() => {
            this.playTrick();
        }, 1000);
    }

    // الذكاء الاصطناعي يختار ورقة
    getAICardToPlay(player) {
        const validCards = player.hand.filter(card => this.canPlayCard(card, player));
        
        if (validCards.length === 0) {
            return player.hand[0];
        }
        
        // استراتيجية بسيطة: لعب أقوى ورقة إذا كان اللاعب هو الفائز بالمزايدة
        // وإلا لعب أضعف ورقة
        if (this.currentPlayer === this.bidWinner) {
            return validCards.reduce((a, b) => a.getPower() > b.getPower() ? a : b);
        } else {
            // اللاعبون الآخرون يحاولون إعطاء نقاط للاعب الذي سيفوز بالحيلة
            if (this.currentTrick.length > 0) {
                // لعب أعلى نقاط
                return validCards.reduce((a, b) => a.getPoints() > b.getPoints() ? a : b);
            }
            return validCards.reduce((a, b) => a.getPower() < b.getPower() ? a : b);
        }
    }

    // تقييم الحيلة
    evaluateTrick() {
        const ledSuit = this.currentTrick[0].card.suit;
        let winningPlay = this.currentTrick[0];
        
        for (let play of this.currentTrick) {
            const card = play.card;
            const currentWinner = winningPlay.card;
            
            // الحكم يتغلب على غير الحكم
            if (card.suit === this.trumpSuit && currentWinner.suit !== this.trumpSuit) {
                winningPlay = play;
            }
            // كلاهما حكم أو كلاهما من نفس النوع
            else if (card.suit === currentWinner.suit) {
                if (card.getPower() > currentWinner.getPower()) {
                    winningPlay = play;
                }
            }
        }
        
        const winner = this.players[winningPlay.player];
        const trickPoints = this.currentTrick.reduce((sum, play) => sum + play.card.getPoints(), 0);
        
        winner.roundScore += trickPoints;
        
        // تشغيل صوت الفوز بالحيلة
        if (window.soundManager && this.settings.soundEnabled) {
            soundManager.playTrickWin();
        }
        
        this.showMessage(`${winner.name} فاز بالحيلة! (${trickPoints} نقطة)`);
        
        setTimeout(() => {
            this.currentTrick = [];
            this.updatePlayedCards();
            
            // التحقق من نهاية الجولة
            if (this.players[0].hand.length === 0) {
                this.endRound();
            } else {
                this.currentPlayer = winningPlay.player;
                this.playTrick();
            }
        }, 2000);
    }

    // نهاية الجولة
    endRound() {
        this.gameState = 'roundEnd';
        
        const bidWinner = this.players[this.bidWinner];
        const bidSuccessful = bidWinner.roundScore >= this.currentBid;
        
        // حساب النقاط
        if (bidSuccessful) {
            bidWinner.score += bidWinner.roundScore;
        } else {
            bidWinner.score -= this.currentBid;
        }
        
        // اللاعبون الآخرون
        for (let i = 0; i < 4; i++) {
            if (i !== this.bidWinner) {
                const player = this.players[i];
                
                // حد أقصى 50 نقطة للجولة
                const pointsToAdd = Math.min(player.roundScore, 50 - player.accumulatedNonBidPoints);
                player.score += pointsToAdd;
                player.accumulatedNonBidPoints += pointsToAdd;
                
                // إعادة تعيين النقاط المتراكمة إذا وصل 50
                if (player.accumulatedNonBidPoints >= 50) {
                    player.accumulatedNonBidPoints = 50;
                }
            } else {
                // إعادة تعيين النقاط المتراكمة للفائز بالمزايدة
                bidWinner.accumulatedNonBidPoints = 0;
            }
        }
        
        this.updateScores();
        
        // التحقق من نهاية اللعبة
        const gameWinner = this.players.find(p => p.score >= 302);
        const gameLoser = this.players.find(p => p.score <= -302);
        
        if (gameWinner || gameLoser) {
            this.endGame(gameWinner || gameLoser, !!gameWinner);
        } else {
            this.showRoundEndModal(bidSuccessful);
        }
    }

    // عرض نافذة نهاية الجولة
    showRoundEndModal(bidSuccessful) {
        const modal = document.getElementById('roundEndModal');
        const resultsDiv = document.getElementById('roundResults');
        
        // تشغيل صوت الفوز بالجولة إذا نجحت المزايدة
        if (bidSuccessful && window.soundManager && this.settings.soundEnabled) {
            soundManager.playRoundWin();
        }
        
        let html = `<h4>${bidSuccessful ? 'نجحت المزايدة!' : 'فشلت المزايدة!'}</h4>`;
        html += '<div style="margin: 20px 0;">';
        
        this.players.forEach(player => {
            const isBidWinner = player.id === this.bidWinner;
            html += `
                <div style="padding: 10px; margin: 5px 0; background: ${isBidWinner ? '#ffe6cc' : '#f0f0f0'}; border-radius: 8px;">
                    <strong>${player.name}${isBidWinner ? ' (الفائز بالمزايدة)' : ''}</strong><br>
                    نقاط الجولة: ${player.roundScore}<br>
                    النقاط الكلية: ${player.score}
                </div>
            `;
        });
        
        html += '</div>';
        resultsDiv.innerHTML = html;
        
        modal.classList.add('show');
    }

    // بدء الجولة التالية
    startNextRound() {
        const modal = document.getElementById('roundEndModal');
        modal.classList.remove('show');
        
        this.dealer = (this.dealer + 1) % 4;
        this.startNewRound();
    }

    // نهاية اللعبة
    endGame(player, isWinner) {
        this.gameState = 'gameEnd';
        
        const modal = document.getElementById('gameEndModal');
        const titleDiv = document.getElementById('gameEndTitle');
        const scoresDiv = document.getElementById('finalScores');
        
        if (isWinner) {
            titleDiv.textContent = `${player.name} فاز باللعبة! 🎉`;
        } else {
            titleDiv.textContent = `${player.name} خسر اللعبة!`;
        }
        
        let html = '<div style="margin: 20px 0;">';
        const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
        
        sortedPlayers.forEach((p, index) => {
            html += `
                <div style="padding: 15px; margin: 10px 0; background: ${index === 0 ? '#ffd700' : '#f0f0f0'}; border-radius: 10px;">
                    <strong>${index + 1}. ${p.name}</strong><br>
                    النقاط النهائية: ${p.score}
                </div>
            `;
        });
        
        html += '</div>';
        scoresDiv.innerHTML = html;
        
        modal.classList.add('show');
    }

    // تحديث واجهة المستخدم
    updateUI() {
        this.updatePlayerHand();
        this.updateOpponentCards();
        this.updateFieldCards();
        this.updateScores();
    }

    // تحديث يد اللاعب
    updatePlayerHand() {
        const playerHandDiv = document.getElementById('playerHand');
        const player = this.players[0];
        
        playerHandDiv.innerHTML = '';
        
        player.hand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = card.toHTML();
            playerHandDiv.appendChild(cardDiv);
        });
    }

    // تحديث أوراق الخصوم
    updateOpponentCards() {
        for (let i = 1; i < 4; i++) {
            const player = this.players[i];
            const cardsDiv = document.getElementById(`player${i}Cards`);
            const countDiv = document.getElementById(`player${i}CardsCount`);
            
            cardsDiv.innerHTML = '';
            countDiv.textContent = player.hand.length;
            
            // عرض الأوراق المقلوبة
            for (let j = 0; j < Math.min(player.hand.length, 5); j++) {
                const cardDiv = document.createElement('div');
                cardDiv.innerHTML = new Card('A', 'hearts').toHTML(true);
                cardsDiv.appendChild(cardDiv);
            }
        }
    }

    // تحديث أوراق الميدان
    updateFieldCards() {
        const fieldDiv = document.getElementById('fieldCards');
        fieldDiv.innerHTML = '';
        
        this.fieldCards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = card.toHTML(true);
            fieldDiv.appendChild(cardDiv);
        });
    }

    // تحديث الأوراق المرمية
    updatePlayedCards() {
        const playedDiv = document.getElementById('playedCards');
        playedDiv.innerHTML = '';
        
        this.currentTrick.forEach(play => {
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = play.card.toHTML();
            
            // إضافة مؤشر اللاعب
            const cardElement = cardDiv.querySelector('.card');
            if (cardElement) {
                cardElement.setAttribute('data-player', this.players[play.player].name);
            }
            
            playedDiv.appendChild(cardDiv);
        });
    }

    // تحديث النقاط
    updateScores() {
        for (let i = 0; i < 4; i++) {
            const player = this.players[i];
            const scoreDiv = document.getElementById(`player${i}Score`);
            
            if (scoreDiv) {
                scoreDiv.querySelector('.score').textContent = player.score;
            }
        }
    }

    // تحديث معلومات الجولة
    updateRoundInfo() {
        const trumpDiv = document.getElementById('trumpSuit');
        const bidDiv = document.getElementById('currentBid');
        const winnerDiv = document.getElementById('bidWinner');
        
        if (this.trumpSuit) {
            const suitNames = {
                'hearts': 'هاس ♥',
                'diamonds': 'دايموند ♦',
                'spades': 'سبيت ♠',
                'clubs': 'كلفس ♣'
            };
            trumpDiv.textContent = suitNames[this.trumpSuit];
        } else {
            trumpDiv.textContent = '-';
        }
        
        bidDiv.textContent = this.currentBid > 0 ? this.currentBid : '-';
        winnerDiv.textContent = this.bidWinner !== null ? this.players[this.bidWinner].name : '-';
    }

    // تحديث دور اللاعب
    updatePlayerTurn() {
        for (let i = 0; i < 4; i++) {
            const scoreDiv = document.getElementById(`player${i}Score`);
            if (scoreDiv) {
                if (i === this.currentPlayer) {
                    scoreDiv.classList.add('active');
                } else {
                    scoreDiv.classList.remove('active');
                }
            }
        }
    }

    // عرض رسالة
    showMessage(text) {
        const messageDiv = document.getElementById('messageArea');
        messageDiv.textContent = text;
        messageDiv.classList.add('show');
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 2000);
    }

    // عرض شاشة
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // عرض شاشة البداية
    showStartScreen() {
        this.showScreen('startScreen');
        
        // إخفاء جميع النوافذ المنبثقة
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // عرض القواعد
    showRules() {
        this.showScreen('rulesScreen');
    }

    // عرض الإعدادات
    showSettings() {
        this.showScreen('settingsScreen');
    }

    // تحديث الإعدادات
    updateSettings() {
        this.settings.gameSpeed = document.getElementById('gameSpeed').value;
        this.settings.aiLevel = document.getElementById('aiLevel').value;
        this.settings.soundEnabled = document.getElementById('soundEnabled').checked;
        
        // تحديث حالة مدير الأصوات
        if (window.soundManager) {
            soundManager.enabled = this.settings.soundEnabled;
        }
    }

    // عرض قائمة اللعبة
    showGameMenu() {
        if (confirm('هل تريد العودة إلى القائمة الرئيسية؟')) {
            this.showStartScreen();
        }
    }
}

// إنشاء نسخة اللعبة
const game = new Game187();

// تحميل اللعبة عند بدء الصفحة
window.addEventListener('load', () => {
    console.log('لعبة 187 جاهزة!');
});

