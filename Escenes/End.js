export default class End extends Phaser.Scene {
    constructor() {
      super("end");
    }
    create() {
      this.add
        .text(400, 300, "Game Over" , {
          fontSize: "40px",
          color: "#ffffff",
        })
 
  }
}