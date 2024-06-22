import Game from "./Escenes/Game.js";
// Create a new Phaser config object
const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 400,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Game],
};

window.game = new Phaser.Game(config);