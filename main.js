import End from "./Escenes/End.js";
import Game from "./Escenes/Game.js";
// Create a new Phaser config object
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [Game, End],
};

window.game = new Phaser.Game(config);