import { firebaseConfig } from '../firebaseConfig.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, update, onDisconnect, remove } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

export class NetworkManager {
    constructor() {
        this.db = null;
        this.roomId = null;
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.isHost = false;
        this.initialized = false;
        
        // Listeners callbacks
        this.onOpponentUpdate = null;    // (data) => {}
        this.onGameStart = null;         // () => {}
        this.onPlayerJoined = null;      // () => {}
        this.onReadyStateChange = null;  // ({p1Ready, p2Ready}) => {}
        this.onChatMessage = null;       // (msg) => {}
        this.onRematchRequest = null;    // ({p1Wants, p2Wants}) => {}
    }

    async init() {
        console.log("Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        this.db = getDatabase(app);
        
        const auth = getAuth(app);
        try {
            const userCredential = await signInAnonymously(auth);
            console.log("Signed in anonymously:", userCredential.user.uid);
            this.playerId = 'player_' + userCredential.user.uid; // Use Auth UID for consistency
        } catch (error) {
            console.error("Auth failed:", error);
        }
        
        console.log("Firebase initialized.");
        this.initialized = true;
    }

    createRoom() {
        if (!this.db) return;
        
        // Generate 4-digit room code
        this.roomId = String(Math.floor(1000 + Math.random() * 9000));
        this.isHost = true;

        const roomRef = ref(this.db, `rooms/${this.roomId}`);
        
        // Set initial room state
        set(roomRef, {
            host: this.playerId,
            status: 'WAITING',
            players: {
                [this.playerId]: {
                    y: 0,
                    state: 'STANDING',
                    score: 0,
                    alive: true,
                    ready: false,
                    wantsRematch: false
                }
            },
            messages: []
        });

        this.subscribeToRoom();
        
        // Remove room on disconnect if host
        onDisconnect(roomRef).remove();
        onDisconnect(ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`)).remove();

        console.log("Room created:", this.roomId);
        return this.roomId;
    }

    async joinRoom(roomId) {
        console.log("joinRoom called with:", roomId, "db:", !!this.db, "initialized:", this.initialized);
        
        if (!this.db) {
            console.error("Firebase not initialized! Attempting to init...");
            await this.init();
        }
        
        if (!roomId || roomId.trim() === '') {
            console.error("Invalid room ID");
            return false;
        }
        
        this.roomId = roomId.trim();
        this.isHost = false;

        try {
            const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
            console.log("Setting player data at:", `rooms/${this.roomId}/players/${this.playerId}`);
            
            await set(playerRef, {
                y: 0,
                state: 'STANDING',
                score: 0,
                alive: true,
                ready: false,
                wantsRematch: false
            });

            // Set Clean up
            onDisconnect(playerRef).remove();

            // Update status to PLAYING if we are the second player
            await update(ref(this.db, `rooms/${this.roomId}`), {
                status: 'PLAYING'
            });

            this.subscribeToRoom();
            console.log("Successfully joined room:", this.roomId);
            return true;
        } catch (error) {
            console.error("Error joining room:", error);
            return false;
        }
    }

    subscribeToRoom() {
        if (!this.roomId) return;

        const roomRef = ref(this.db, `rooms/${this.roomId}`);
        onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Handle Player Count & Ready States
            if (data.players) {
                const playerIds = Object.keys(data.players);
                const playerCount = playerIds.length;
                const hostId = data.host;
                
                // Notify about player joined
                if (playerCount === 2 && this.onPlayerJoined) {
                    this.onPlayerJoined();
                }
                
                // Check Ready States (Perspective Based)
                const myData = data.players[this.playerId];
                const myReady = myData ? (myData.ready || false) : false;
                
                let oppReady = false;
                let oppWants = false;
                let myWants = myData ? (myData.wantsRematch || false) : false;
                
                // Find opponent (anyone who is not me)
                playerIds.forEach((key) => {
                    if (key !== this.playerId) {
                        const pData = data.players[key];
                        oppReady = pData.ready || false;
                        oppWants = pData.wantsRematch || false;
                        
                        // Opponent Update callback
                        if (this.onOpponentUpdate) {
                            this.onOpponentUpdate(pData);
                        }
                    }
                });
                
                // Pass perspective-based state
                if (this.onReadyStateChange) {
                    this.onReadyStateChange({ myReady, oppReady, playerCount, isHost: this.isHost });
                }
                
                if (this.onRematchRequest) {
                    this.onRematchRequest({ myWants, oppWants });
                }
            }
            
            // Handle Chat Messages
            if (data.messages && this.onChatMessage) {
                const msgs = Object.values(data.messages);
                // Send only the latest messages
                msgs.slice(-10).forEach(msg => {
                    this.onChatMessage(msg);
                });
            }
        });
    }

    sendUpdate(state) {
        if (!this.roomId || !this.db) return;

        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
        update(playerRef, state);
    }

    setReady(isReady) {
        if (!this.roomId || !this.db) return;
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
        update(playerRef, { ready: isReady });
    }

    sendChatMessage(text) {
        if (!this.roomId || !this.db || !text.trim()) return;
        const messagesRef = ref(this.db, `rooms/${this.roomId}/messages`);
        push(messagesRef, {
            sender: this.isHost ? 'P1' : 'P2',
            text: text.trim(),
            time: Date.now()
        });
    }

    setWantsRematch(wants) {
        if (!this.roomId || !this.db) return;
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
        update(playerRef, { wantsRematch: wants });
    }

    leaveRoom() {
        if (!this.roomId || !this.db) return;
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.playerId}`);
        remove(playerRef);
        this.roomId = null;
    }

    getPlayerCount() {
        // Returns via callback since async
        if (!this.roomId || !this.db) return;
        const playersRef = ref(this.db, `rooms/${this.roomId}/players`);
        return new Promise((resolve) => {
            onValue(playersRef, (snapshot) => {
                const data = snapshot.val();
                resolve(data ? Object.keys(data).length : 0);
            }, { onlyOnce: true });
        });
    }
}
