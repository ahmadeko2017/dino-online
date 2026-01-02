import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '../constants.js';
import { SpriteDefs } from '../SpriteDefs.js';

export class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1500;
        this.birdFrameTimer = 0;
        this.birdFrame = 0; // 0 or 1
    }

    update(deltaTime, gameSpeed, score) {
        // Update spawn timer
        this.spawnTimer += deltaTime * gameSpeed;
        
        // Spawn logic
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnObstacle(score);
            this.spawnTimer = 0;
            // User requested: "pertambahan jarak nya linear dengan pertambahan kecepatan"
            // Translation: Distance increase should be linear with Speed increase.
            // Formula: Distance = Speed * Time.
            // To achieve Linear Distance Scaling, Time (Interval) must be roughly CONSTANT.
            // Previously we were dividing Time by Speed, which kept Distance constant.
            // Now we remove that divisor.
            
            const minTime = 1000;
            const maxTime = 2000; // Slightly tighter range to keep action going
            
            this.spawnInterval = minTime + Math.random() * (maxTime - minTime);
        }

        // Move obstacles
        for (let i = 0; i < this.obstacles.length; i++) {
            let obs = this.obstacles[i];
            obs.x -= gameSpeed * 5 * 0.5 * 2; // gameSpeed * 5 was old. 
            // Wait, previous fix was scale 0.5. 
            // Movement: gameSpeed * pixels_per_frame factor.
            // Let's stick to what we had: obs.x -= gameSpeed * 5
            obs.x -= gameSpeed * 5;
        }

        // Animate birds
        this.birdFrameTimer++;
        if (this.birdFrameTimer > 15) {
            this.birdFrame = (this.birdFrame + 1) % 2;
            this.birdFrameTimer = 0;
        }

        // Cleanup
        this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > 0);
    }

    spawnObstacle(score) {
        const rand = Math.random();
        const scale = 0.5;
        
        // Bird Spawn Logic: Only if score > 250
        if (score > 250 && Math.random() < 0.25) { // 25% chance for bird
             this.spawnBird(scale);
             return;
        }

        // Cactus Logic
        let type, spriteDef;
        if (rand < 0.33) {
            type = 'SMALL';
            spriteDef = SpriteDefs.CACTUS.SMALL_1; 
        } else if (rand < 0.66) {
            type = 'BIG';
            spriteDef = SpriteDefs.CACTUS.BIG_1;
        } else {
             type = 'BIG_GROUP';
             spriteDef = SpriteDefs.CACTUS.BIG_2;
        }

        this.obstacles.push({
            type: 'CACTUS',
            x: CANVAS_WIDTH,
            y: GROUND_Y - (spriteDef.h * scale) + 5, 
            width: spriteDef.w * scale,
            height: spriteDef.h * scale,
            sprite: spriteDef,
            collisionBox: { x: 5, y: 5, w: (spriteDef.w * scale) - 10, h: (spriteDef.h * scale) - 10 }
        });
    }

    spawnBird(scale) {
        // Heights: 
        // 1. High (Duck only) -> Y ~ GROUND - 50
        // 2. Mid (Duck/Jump) -> Y ~ GROUND - 30
        // 3. Low (Jump only) -> Y ~ GROUND - 10  (Near cactus height)
        
        const heights = [
            GROUND_Y - 45, // High (Duck)
            GROUND_Y - 30, // Mid
            GROUND_Y - 10  // Low
        ];
        
        // Random height
        const yPos = heights[Math.floor(Math.random() * heights.length)];
        
        this.obstacles.push({
            type: 'BIRD',
            x: CANVAS_WIDTH,
            y: yPos - (SpriteDefs.BIRD.WING_UP.h * scale) + 10, // Adjust origin
            width: SpriteDefs.BIRD.WING_UP.w * scale,
            height: SpriteDefs.BIRD.WING_UP.h * scale,
            sprite: SpriteDefs.BIRD.WING_UP, // Initial sprite
            collisionBox: { x: 5, y: 10, w: (SpriteDefs.BIRD.WING_UP.w * scale) - 10, h: (SpriteDefs.BIRD.WING_UP.h * scale) - 20 }
        });
    }

    draw(ctx, spriteSheet) {
        for (const obs of this.obstacles) {
            let spriteToDraw = obs.sprite;
            
            if (obs.type === 'BIRD') {
                spriteToDraw = this.birdFrame === 0 ? SpriteDefs.BIRD.WING_UP : SpriteDefs.BIRD.WING_DOWN;
            }

            if (spriteSheet) {
                ctx.drawImage(
                    spriteSheet,
                    spriteToDraw.x, spriteToDraw.y, spriteToDraw.w, spriteToDraw.h,
                    obs.x, obs.y, obs.width, obs.height
                );
            } else {
                ctx.fillStyle = obs.type === 'BIRD' ? 'blue' : '#535353';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }
            
            // Debug Collision Box
            // ctx.strokeStyle = 'red';
            // ctx.strokeRect(obs.x + obs.collisionBox.x, obs.y + obs.collisionBox.y, obs.collisionBox.w, obs.collisionBox.h);
        }
    }
}
