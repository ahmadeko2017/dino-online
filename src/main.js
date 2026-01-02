import { Game } from './Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game('game');
    game.init();
    // game.start(); // Moved to onload
    console.log("Game initialized");
});
