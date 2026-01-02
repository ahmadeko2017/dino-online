import { SpriteDefs } from '../SpriteDefs.js';

export class GhostDino {
    constructor() {
        this.x = 50; // Fixed X position for now, or match opponent? Usually ghosts are side-by-side or behind?
        // Let's keep it at default X (50) to "overlay" or maybe slightly offset?
        // Let's put it at X=100 so you can see them if they are close.
        this.x = 100; 
        this.y = 0;
        this.width = 44;
        this.height = 47;
        this.state = 'STANDING'; 
        this.alive = true;
        this.score = 0;
    }

    updateState(data) {
        if (!data) return;
        // console.log("GhostDino: State updated", data);
        this.y = data.y;
        this.state = data.state;
        this.alive = data.alive; // Default true if undefined?
        this.score = data.score || 0; // Sync Score
    }

    draw(ctx, spriteSheet) {
        ctx.globalAlpha = 0.5; // Ghost effect

        let sprite = SpriteDefs.DINO.STANDING;
        if (this.state === 'JUMPING') sprite = SpriteDefs.DINO.STANDING; // Reuse standing for jump for now or add jump sprite
        if (this.state === 'DUCKING') sprite = SpriteDefs.DINO.DUCK_1;
        if (this.state === 'RUNNING') sprite = SpriteDefs.DINO.RUN_1; // No animation sync yet, just static frame

        ctx.drawImage(
            spriteSheet,
            sprite.x, sprite.y, sprite.w, sprite.h,
            this.x, this.y, this.width, this.height
        );

        ctx.globalAlpha = 1.0; // Reset
    }
}
