import { GRAVITY, JUMP_VELOCITY, GROUND_Y } from '../constants.js';
import { SpriteDefs } from '../SpriteDefs.js';

export class Dino {
    constructor() {
        this.width = 44;
        this.height = 47;
        this.x = 50; 
        this.y = GROUND_Y - this.height;
        this.dy = 0; 
        this.state = 'STANDING'; 
        this.originalHeight = 47;
        this.duckHeight = 30;
        
        // Animation
        this.runFrame = 0;
        this.frameTimer = 0;
    }

    jump() {
        if (this.y === GROUND_Y - this.height) {
            this.dy = JUMP_VELOCITY;
            this.state = 'JUMPING';
            return true;
        }
        return false;
    }

    duck(isKeyDown) {
        if (this.state === 'JUMPING') return;

        if (isKeyDown) {
            this.state = 'DUCKING';
            this.height = this.duckHeight;
        } else {
            this.state = 'STANDING';
            this.height = this.originalHeight;
        }
    }

    update() {
        this.y += this.dy;

        if (this.y < GROUND_Y - this.height) {
            this.dy += GRAVITY;
        } else {
            this.dy = 0;
            this.y = GROUND_Y - this.height;
            if (this.state === 'JUMPING') {
                this.state = 'STANDING'; // Landed
            }
        }
        
        // Tick animation
        this.frameTimer++;
        if (this.frameTimer > 5) { // Switch frame every 5 ticks
            this.runFrame = (this.runFrame + 1) % 2;
            this.frameTimer = 0;
        }
    }

    draw(ctx, spriteSheet) {
        let sprite = SpriteDefs.DINO.STANDING;

        if (this.state === 'JUMPING') {
            sprite = SpriteDefs.DINO.JUMPING;
        } else if (this.state === 'DUCKING') {
            sprite = this.runFrame === 0 ? SpriteDefs.DINO.DUCK_1 : SpriteDefs.DINO.DUCK_2;
        } else {
            // Standing/Running
            if (this.runFrame === 0) sprite = SpriteDefs.DINO.RUN_1;
            else sprite = SpriteDefs.DINO.RUN_2;
        }
        
        // Draw Image
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        if (spriteSheet) {
            ctx.drawImage(
                spriteSheet,
                sprite.x, sprite.y, sprite.w, sprite.h,
                this.x, this.y, this.width, this.height
            );
        } else {
            // Fallback
            ctx.fillStyle = '#535353';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
