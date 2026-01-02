import { GAME_SPEED_START, GAME_SPEED_MAX, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { Dino } from './entities/Dino.js';
import { ObstacleManager } from './entities/ObstacleManager.js';
import { GhostDino } from './entities/GhostDino.js';
import { AudioController } from './AudioController.js';
import { NetworkManager } from './managers/NetworkManager.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = CANVAS_WIDTH;
        this.height = CANVAS_HEIGHT;
        this.gameSpeed = GAME_SPEED_START;
        this.score = 0;
        this.highScore = localStorage.getItem('dinoHighScore') || 0;
        this.frameId = null;
        this.gameOver = false;
        this.lastTime = 0;
        this.isDarkMode = false;
        this.isMultiplayer = false;
        this.isGlobalGameOver = false;
        this.gameStarted = false;

        // Entities
        this.dino = new Dino();
        this.obstacleManager = new ObstacleManager();
        this.audio = new AudioController();
        
        // Multiplayer
        this.networkManager = new NetworkManager();
        this.ghostDino = new GhostDino();
        
        // Stars
        this.stars = [];
        this.initStars();
    }

    startMultiplayerListeners() {
        this.networkManager.onOpponentUpdate = (data) => {
            this.ghostDino.updateState(data);
        };
        
        this.networkManager.onPlayerJoined = () => {
            document.getElementById('p2Status').innerText = "⏳";
        };
        
        this.networkManager.onReadyStateChange = ({ myReady, oppReady, playerCount }) => {
            console.log("Ready state:", { myReady, oppReady, playerCount });
            
            const p1StatusEl = document.getElementById('p1Status');
            const p2StatusEl = document.getElementById('p2Status');
            
            // P1 Slot = ME, P2 Slot = OPPONENT
            if (p1StatusEl) p1StatusEl.innerText = myReady ? "✅" : "⏳";
            if (p2StatusEl) p2StatusEl.innerText = playerCount < 2 ? "❌" : (oppReady ? "✅" : "⏳");
            
            // Both ready? Start game!
            if (playerCount === 2 && myReady && oppReady && !this.gameStarted) {
                console.log("Both ready! Starting game...");
                this.gameStarted = true;
                const waitingRoom = document.getElementById('waiting-room');
                if (waitingRoom) waitingRoom.classList.add('hidden');
                this.start();
            }
        };
        
        this.networkManager.onChatMessage = (msg) => {
            const chatDiv = document.getElementById('chatMessages');
            if (chatDiv) {
                // Prevent duplicates (simple check)
                if (!chatDiv.dataset.lastTime || msg.time > parseInt(chatDiv.dataset.lastTime)) {
                    const line = document.createElement('div');
                    line.textContent = `[${msg.sender}] ${msg.text}`;
                    chatDiv.appendChild(line);
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                    chatDiv.dataset.lastTime = msg.time;
                }
            }
        };
        
        this.networkManager.onRematchRequest = ({ myWants, oppWants }) => {
            console.log("Rematch update:", { myWants, oppWants });
            
            const rematchStatus = document.getElementById('rematchStatus');
            if (myWants && !oppWants) {
                 rematchStatus.innerText = "WAITING FOR OPPONENT...";
            } else if (!myWants && oppWants) {
                 rematchStatus.innerText = "OPPONENT WANTS REMATCH!";
            }

            // Both want? Rematch!
            if (myWants && oppWants) {
                const gameoverScreen = document.getElementById('gameover-screen');
                if (gameoverScreen) gameoverScreen.classList.add('hidden');
                
                // Reset rematch flags
                this.networkManager.setWantsRematch(false);
                this.networkManager.setReady(false);
                this.gameStarted = false;
                
                // Go back to waiting room
                const waitingRoom = document.getElementById('waiting-room');
                if (waitingRoom) waitingRoom.classList.remove('hidden');
                
                // Reset ready buttons
                const btnReady = document.getElementById('btnReady');
                if (btnReady) {
                    btnReady.disabled = false;
                    btnReady.innerText = "READY!";
                }
            }
        };
    }

    async initMultiplayer() {
        if (!this.networkManager.initialized) {
            await this.networkManager.init();
        }
        this.startMultiplayerListeners();
    }

    initStars() {
        for (let i = 0; i < 15; i++) {
             this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height / 2),
                size: Math.random() * 2 + 1,
                alpha: Math.random()
             });
        }
    }
    
    updateStars(deltaTime) {
        if (!this.isDarkMode) return;
        this.stars.forEach(star => {
            if (Math.random() < 0.05) {
                star.alpha = Math.random();
            }
        });
    }

    init() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.spriteSheet = new Image();
        this.spriteSheet.src = 'assets/sprites.png';
        
        this.spriteSheet.onload = () => {
            this.bindEvents();
            this.dino.draw(this.ctx, this.spriteSheet);
            console.log("Assets loaded, waiting for user...");
        };
    }

    bindEvents() {
        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                if (this.gameOver) {
                    if (this.isGlobalGameOver) return;
                    
                    const startScreen = document.getElementById('start-screen');
                    const lobbyScreen = document.getElementById('lobby-screen');
                    
                    if (startScreen && lobbyScreen) {
                        if (startScreen.classList.contains('hidden') && lobbyScreen.classList.contains('hidden')) {
                             this.start();
                        }
                    } else {
                        this.start();
                    }
                } else if (this.dino) { 
                    if (this.dino.jump()) {
                        this.audio.playSound('JUMP');
                    }
                }
            }
            if (e.code === 'ArrowDown') {
                if (this.dino) this.dino.duck(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown') {
                if (this.dino) this.dino.duck(false);
            }
        });

        // --- UI EVENT BINDINGS ---
        const startScreen = document.getElementById('start-screen');
        const lobbyScreen = document.getElementById('lobby-screen');
        
        // Solo Button
        const btnSolo = document.getElementById('btn-solo');
        if (btnSolo) {
            btnSolo.addEventListener('click', () => {
                console.log("Solo Clicked!");
                this.isMultiplayer = false;
                if (startScreen) {
                    startScreen.classList.add('hidden');
                    startScreen.classList.remove('show');
                }
                this.start();
            });
        }

        // Multiplayer Button
        const btnMulti = document.getElementById('btn-multi');
        if (btnMulti) {
            btnMulti.addEventListener('click', () => {
                console.log("Multiplayer Clicked!");
                if (startScreen) {
                    startScreen.classList.add('hidden');
                    startScreen.classList.remove('show');
                }
                if (lobbyScreen) {
                    lobbyScreen.classList.remove('hidden');
                    lobbyScreen.classList.add('show');
                }
                this.initMultiplayer();
            });
        }

        // Back Button
        const btnBack = document.getElementById('btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                if (lobbyScreen) {
                    lobbyScreen.classList.add('hidden');
                    lobbyScreen.classList.remove('show');
                }
                if (startScreen) {
                    startScreen.classList.remove('hidden');
                    startScreen.classList.add('show');
                }
            });
        }

        // Create Room
        const btnCreate = document.getElementById('btnCreate');
        const waitingRoom = document.getElementById('waiting-room');
        const gameoverScreen = document.getElementById('gameover-screen');
        
        if (btnCreate) {
            btnCreate.addEventListener('click', async () => {
                const roomId = this.networkManager.createRoom();
                document.getElementById('inpRoom').value = roomId;
                this.isMultiplayer = true;
                
                // Show waiting room
                lobbyScreen.classList.add('hidden');
                waitingRoom.classList.remove('hidden');
                document.getElementById('waitingRoomId').innerText = "ROOM: " + roomId;
                document.getElementById('p1Status').innerText = "⏳";
                document.getElementById('p2Status').innerText = "❌";
            });
        }

        // Join Room
        const btnJoin = document.getElementById('btnJoin');
        if (btnJoin) {
            btnJoin.addEventListener('click', async () => {
                const roomId = document.getElementById('inpRoom').value;
                if(roomId) {
                    document.getElementById('roomStatus').innerText = "JOINING...";
                    const joined = await this.networkManager.joinRoom(roomId);
                    if (joined) {
                        this.isMultiplayer = true;
                        
                        // Show waiting room
                        lobbyScreen.classList.add('hidden');
                        waitingRoom.classList.remove('hidden');
                        document.getElementById('waitingRoomId').innerText = "ROOM: " + roomId;
                        document.getElementById('p1Status').innerText = "⏳";
                        document.getElementById('p2Status').innerText = "⏳";
                    } else {
                        document.getElementById('roomStatus').innerText = "ERROR JOINING";
                    }
                }
            });
        }

        // Ready Button
        const btnReady = document.getElementById('btnReady');
        if (btnReady) {
            btnReady.addEventListener('click', () => {
                this.networkManager.setReady(true);
                btnReady.innerText = "READY ✓";
                btnReady.disabled = true;
            });
        }

        // Chat Send
        const btnSendChat = document.getElementById('btnSendChat');
        const chatInput = document.getElementById('chatInput');
        if (btnSendChat && chatInput) {
            const sendChat = () => {
                this.networkManager.sendChatMessage(chatInput.value);
                chatInput.value = '';
            };
            btnSendChat.addEventListener('click', sendChat);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendChat();
            });
        }

        // Leave Room
        const btnLeaveRoom = document.getElementById('btnLeaveRoom');
        if (btnLeaveRoom) {
            btnLeaveRoom.addEventListener('click', () => {
                this.networkManager.leaveRoom();
                waitingRoom.classList.add('hidden');
                startScreen.classList.remove('hidden');
            });
        }

        // Rematch Button
        const btnRematch = document.getElementById('btnRematch');
        if (btnRematch) {
            btnRematch.addEventListener('click', () => {
                this.networkManager.setWantsRematch(true);
                document.getElementById('rematchStatus').innerText = "WAITING FOR OPPONENT...";
                btnRematch.disabled = true;
            });
        }

        // Exit Button
        const btnExit = document.getElementById('btnExit');
        if (btnExit) {
            btnExit.addEventListener('click', () => {
                this.networkManager.leaveRoom();
                gameoverScreen.classList.add('hidden');
                startScreen.classList.remove('hidden');
                this.isMultiplayer = false;
                this.gameOver = false;
            });
        }
    }

    start() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        
        this.score = 0;
        this.gameSpeed = GAME_SPEED_START;
        this.gameOver = false;
        this.isGlobalGameOver = false;
        this.lastTime = 0;
        this.isDarkMode = false;
        document.body.classList.remove('dark-mode');
        this.obstacleManager = new ObstacleManager();
        
        requestAnimationFrame((time) => {
            this.lastTime = time;
            this.loop(time);
        });
        
        if (this.dino) {
            this.dino.y = 150 - 30 - 47;
            this.dino.dy = 0;
            this.dino.state = 'STANDING';
            this.dino.jumpTimer = 0;
        }
        
        if (this.isMultiplayer) {
            this.networkManager.sendUpdate({
                y: this.dino ? this.dino.y : 0, 
                state: 'STANDING', 
                score: 0,
                alive: true
            });
        }
    }

    loop(currentTime) {
        if (this.gameOver && !this.isMultiplayer) return;

        let deltaTime = currentTime - this.lastTime;
        
        if (deltaTime > 100) {
            deltaTime = 16;
        }

        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.frameId = requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        if (this.gameSpeed < GAME_SPEED_MAX) {
            this.gameSpeed += 0.00001 * deltaTime;
        }
        
        this.updateStars(deltaTime);

        if (!this.gameOver || !this.isMultiplayer) {
            if (this.dino) this.dino.update();
            this.checkCollisions();
        }
        
        if (this.obstacleManager) this.obstacleManager.update(deltaTime, this.gameSpeed, this.score);
        
        if (this.isMultiplayer) {
            this.networkManager.sendUpdate({
                y: this.dino.y,
                state: this.dino.state,
                score: this.score,
                alive: !this.gameOver
            });
            
            if (this.gameOver && this.ghostDino && this.ghostDino.alive === false && !this.isGlobalGameOver) {
                this.isGlobalGameOver = true;
                
                // Show game over overlay instead of auto-restart
                this.showGameOverOverlay();
            }
        }
        
        if (this.isGlobalGameOver) return;
        
        if (!this.gameOver) {
            const oldScore = Math.floor(this.score);
            this.score += 0.01 * deltaTime * this.gameSpeed;
            const newScore = Math.floor(this.score);

            if (newScore > 0 && newScore % 100 === 0 && newScore !== oldScore) {
                this.audio.playSound('SCORE');
            }

            if (newScore > 0 && newScore % 500 === 0 && newScore !== oldScore) {
                this.toggleDarkMode();
            }
        }
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    checkCollisions() {
        if (!this.dino || !this.obstacleManager) return;

        const dinoBox = {
            x: this.dino.x,
            y: this.dino.y,
            width: this.dino.width,
            height: this.dino.height
        };

        for (const obs of this.obstacleManager.obstacles) {
            const obsHitX = obs.collisionBox ? obs.x + obs.collisionBox.x : obs.x + 5;
            const obsHitY = obs.collisionBox ? obs.y + obs.collisionBox.y : obs.y + 5;
            const obsHitW = obs.collisionBox ? obs.collisionBox.w : obs.width - 10;
            const obsHitH = obs.collisionBox ? obs.collisionBox.h : obs.height - 10;

            const dinoHitX = dinoBox.x + 5;
            const dinoHitY = dinoBox.y + 5;
            const dinoHitW = dinoBox.width - 10;
            const dinoHitH = dinoBox.height - 10;

            if (
                dinoHitX < obsHitX + obsHitW &&
                dinoHitX + dinoHitW > obsHitX &&
                dinoHitY < obsHitY + obsHitH &&
                dinoHitY + dinoHitH > obsHitY
            ) {
                this.gameOver = true;
                this.audio.playSound('GAMEOVER');
                this.handleGameOver();
            }
        }
    }

    handleGameOver() {
        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('dinoHighScore', this.highScore);
        }
    }

    showGameOverOverlay() {
        const gameoverScreen = document.getElementById('gameover-screen');
        const resultIcon = document.getElementById('resultIcon');
        const resultText = document.getElementById('resultText');
        const resultScores = document.getElementById('resultScores');
        const rematchStatus = document.getElementById('rematchStatus');
        const btnRematch = document.getElementById('btnRematch');
        
        if (!gameoverScreen) return;
        
        const myScore = Math.floor(this.score);
        const oppScore = Math.floor(this.ghostDino ? this.ghostDino.score : 0);
        
        // Determine result
        if (myScore > oppScore) {
            resultIcon.innerText = "🏆";
            resultText.innerText = "YOU WIN!";
        } else if (myScore < oppScore) {
            resultIcon.innerText = "💀";
            resultText.innerText = "YOU LOSE!";
        } else {
            resultIcon.innerText = "🤝";
            resultText.innerText = "DRAW!";
        }
        
        resultScores.innerText = `${myScore} vs ${oppScore}`;
        rematchStatus.innerText = "";
        if (btnRematch) btnRematch.disabled = false;
        
        gameoverScreen.classList.remove('hidden');
    }

    draw() {
        this.ctx.fillStyle = this.isDarkMode ? '#202124' : '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.isDarkMode) {
            this.ctx.fillStyle = '#ffffff';
            this.stars.forEach(star => {
                this.ctx.globalAlpha = star.alpha;
                this.ctx.fillRect(star.x, star.y, star.size, star.size);
            });
            this.ctx.globalAlpha = 1.0;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 30);
        this.ctx.lineTo(this.width, this.height - 30);
        this.ctx.strokeStyle = this.isDarkMode ? '#ffffff' : '#535353';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.lineWidth = 1;

        if (this.dino) this.dino.draw(this.ctx, this.spriteSheet);
        if (this.isMultiplayer && this.ghostDino) this.ghostDino.draw(this.ctx, this.spriteSheet);
        if (this.obstacleManager) this.obstacleManager.draw(this.ctx, this.spriteSheet);

        this.ctx.fillStyle = this.isDarkMode ? '#ffffff' : '#535353';
        this.ctx.font = '20px serif';
        this.ctx.fillText(`HI ${this.highScore}  ${Math.floor(this.score)}`, this.width - 150, 20);

        if (this.gameOver) {
            this.ctx.fillStyle = this.isDarkMode ? '#fff' : '#535353';
            this.ctx.textAlign = 'center';
            this.ctx.font = '30px serif';
            
            if (this.isGlobalGameOver) {
                this.ctx.fillText("ALL PLAYERS DEAD", this.width / 2, this.height / 2 - 20);
                
                let resultText = "DRAW";
                let myScore = Math.floor(this.score);
                let oppScore = Math.floor(this.ghostDino ? this.ghostDino.score : 0);
                
                if (myScore > oppScore) resultText = "YOU WIN! 🏆";
                else if (myScore < oppScore) resultText = "YOU LOSE! 💀";
                
                this.ctx.font = '20px serif';
                this.ctx.fillText(resultText + ` (${myScore} vs ${oppScore})`, this.width / 2, this.height / 2 + 10);
                
                this.ctx.font = '15px serif';
                this.ctx.fillText("Restarting in 3s...", this.width / 2, this.height / 2 + 40);
            } else {
                this.ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
                this.ctx.font = '15px serif';
                if (this.isMultiplayer) {
                    this.ctx.fillText("Spectating Opponent...", this.width / 2, this.height / 2 + 30);
                } else {
                    this.ctx.fillText("Press Space to Restart", this.width / 2, this.height / 2 + 30);
                }
            }
            this.ctx.textAlign = 'start';
        }
    }
}
