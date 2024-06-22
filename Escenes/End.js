export default class End extends Phaser.Scene {
    constructor() {
      super("end");
    }
    init(data) {
      this.score = data.score || 0;
      this.gameOver = data.gameOver || true;
    }
    
    create() {
      this.add
        .text(400, 300, this.gameOver ? "Game Over" : "You Win", {
          fontSize: "40px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.add.text(400, 350, `Score: ${this.score}`);
      this.r = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }
  
    update() {
      if (this.r.isDown) {
        this.scene.start("main");
      }
    }
  }