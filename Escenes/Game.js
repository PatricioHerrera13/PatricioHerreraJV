// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");
        // Define the map size and room size
        this.mapWidth = 500;
        this.mapHeight = 500;
        this.roomMinSize = 4;  // Minimum room size in tiles
        this.roomMaxSize = 8;  // Maximum room size in tiles
        this.maxRooms = Phaser.Math.Between(10, 50);  // Random number of rooms
        this.rooms = [];  // Fix for storing generated rooms
        this.usedDoors = new Set();  // Set for doors already used to create corridors
        this.roomCount = 0;  // Generated Rooms Counter
        this.player = null;
        this.doors = []; // List of doors
        this.walls = []; // List of walls 
        this.floors =  [] // List of floors
        this.playerSpawned = false; // Flag to ensure that the player is placed only once
        this.playerHealth = 100; // Maximum life 
    }

    init() {
        this.gameOver = false;
        this.timer = 300;
        this.score = 0;
        this.shapes = {
          bone: { points: 10, count: 0 },
          goldCoin: { points: 20, count: 0 },
          diamond: { points: 30, count: 0 },
        };
    }           

    preload() {
        this.load.image('wall', 'public/wall.png', { frameWidth: 25, frameHeight: 25 });
        this.load.image('floor', 'public/floor.png', { frameWidth: 25, frameHeight: 25 });
        this.load.image('door', 'public/door.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('player', 'public/player.png', { frameWidth: 25, frameHeight: 25 });
        this.load.image('healthBar', 'public/healthBar.png',);
        this.load.image('healthBarBackground', 'public/healthBarBackground.png',);
        this.load.image('bone', 'public/bone.png',);
        this.load.image('goldCoin', 'public/goldCoin.png',);
        this.load.image('diamond', 'public/diamond.png',);
        this.load.image('enemy', 'public/enemy.png',);
        this.load.image('healingItem', 'public/healingItem.png');
    }

    create() {
        // Create groups 
        this.wallLayer = this.physics.add.staticGroup();
        this.wallLayer.setDepth(10);
        this.floorLayer = this.add.group();
        this.floorLayer.setDepth(1);
        this.collectibles = this.physics.add.staticGroup();
        this.collectibles.setDepth(2)
        this.enemy = this.physics.add.group();
        this.enemy.setDepth(10)
        this.meleeWeapon = this.physics.add.group();
        this.healingItems = this.physics.add.group();
        
        // Generate the first starting room
        this.generateFirstRoom();
    
        // Check if the player has already been placed in a roomn
        if (!this.playerSpawned && this.rooms.length > 0) {
            let firstRoom = this.rooms[0];
            // Place the player in the center of the first generated room
            this.player = this.physics.add.sprite((firstRoom.x + firstRoom.width / 2) * 25, (firstRoom.y + firstRoom.height / 2) * 25, 'player');
            this.player.setDepth(10); 
            this.player.setSize(20, 20); // Define the size of the collision box
            this.playerSpawned = true;
            this.player.Wounded = false;
            this.player.immuneTime = 0;
        }
    
        // player movement
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.meleeAttack();
        });

        // Make the camera follow the player
        this.cameras.main.startFollow(this.player);

        // Setting camera limits
        this.cameras.main.setBounds(0, 0, this.mapWidth * 25, this.mapHeight * 25);

        // Additional camera customization
        this.cameras.main.setZoom(2.5); // Camera zoom
        this.cameras.main.setLerp(0.1, 0.1); // Tracking smoothing
        this.cameras.main.setBackgroundColor('#000000'); // Camera background color

        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        
        this.time.addEvent({
            delay: 1000,
            callback: this.handleTimer,
            callbackScope: this,
            loop: true,
        });
        
        // Add text to camera
        this.timerText = this.add.text(250, 275, `Time left: ${this.timer}`, {fontSize: "20px", fill: "#fff",});
        this.timerText.setScale(1 / this.cameras.main.zoom);// Scale text based on camera zoom
        this.timerText.setDepth(11);
        this.timerText.setScrollFactor(0); // Make text fixed to the camera (does not scroll with it)

        this.scoreText = this.add.text(250, 285,
            `Score: ${this.score}
              B: ${this.shapes["bone"].count}
              G: ${this.shapes["goldCoin"].count}
              D: ${this.shapes["diamond"].count}`
        );
        this.scoreText.setScale(1 / this.cameras.main.zoom);
        this.scoreText.setDepth(11);
        this.scoreText.setScrollFactor(0);

        // Create the life bar
        this.createHealthBar();
        // Setting up collisions between player and healing items
        this.physics.add.overlap(this.player, this.healingItems, this.handleHealingItem, null, this);
        // Setting up collisions between player and walls
        this.physics.add.collider(this.player, this.wallLayer);
        // Setting collisions between enemies and walls
        this.physics.add.collider(this.enemy, this.wallLayer);
        // Setting up collisions between enemies 
        this.physics.add.collider(this.enemy, this.enemy);
        // Setting up collisions between player and collectibles
        this.physics.add.collider(this.player, this.collectibles, this.counterCollectible, null, this);
        // Setting up collisions between player and enemies
        this.physics.add.overlap(this.player, this.enemy, this.handleEnemyCollision, null, this);
    }   

    update() {
        if (this.a.isDown) {
            this.player.setVelocityX(-100); // Movement to the left
        } else if (this.d.isDown) {
            this.player.setVelocityX(100); // Movement to the right
        } else {
            this.player.setVelocityX(0); // Stop horizontal movement
        }
        if (this.w.isDown) {
            this.player.setVelocityY(-100); // Upward movement
        } else if (this.s.isDown) {
            this.player.setVelocityY(100); // Downward movement
        } else {
            this.player.setVelocityY(0); // Stop vertical movement
        }
        // Check if the player is on a door
        for (let door of this.doors) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 25) {
                if (!door.getData('used')) {
                    this.createPassage(door);
                    door.setData('used', true);
                }
            }
        }
        //  Player Life Update 
        this.updateHealthBar();
        console.log(this.time.now);
        if (this.time.now >= this.player.immuneTime) {
            this.player.Wounded = false;
            this.player.clearTint();
        }
        if (this.gameOver && this.rKey.isDown) {
            this.scene.restart();
        } else if (this.gameOver) {
            this.physics.pause();
            this.timerText.setText("Game Over");
            return;
        }
        // Enemy pursuit logic
        this.enemy.children.iterate((enemy) => {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (distance < enemy.getData('range')) {
                enemy.setData('chasing', true);
                this.physics.moveToObject(enemy, this.player, enemy.getData('speed'));
            } else {
                enemy.setData('chasing', false);
                enemy.setVelocity(0);
            }
        });
    } 

    // Life management and creation functions
    createHealthBar() {
        // Create the background bar (grayish and transparent)
        this.healthBarBackground = this.add.image(250, 20, 'healthBarBackground');
        this.healthBarBackground.setOrigin(0, 0);  // Set origin to top left corner
        this.healthBarBackground.setScrollFactor(0);  // Make the bar not move with the camera
        this.healthBarBackground.setDepth(11);
        // Create the red life bar
        this.healthBar = this.add.image(250, 20, 'healthBar');
        this.healthBar.setOrigin(0, 0);
        this.healthBar.setScrollFactor(0);
        this.healthBar.setDepth(12);
        // Adjust health bar position relative to text
        this.healthBarBackground.x = 250; 
        this.healthBarBackground.y = 250;
        this.healthBar.x = 250; 
        this.healthBar.y = 250;
    }

    updateHealthBar() {
        this.healthBar.scaleX = this.playerHealth / 100;
    }

    takeDamage(amount) {
        if (this.player.Wounded == false){
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.player.Wounded = true;
        this.player.setTint(0xff0000);
        this.player.immuneTime = this.time.now + 2000;
        }
        if (this.playerHealth === 0) {
            console.log('El jugador ha muerto');
            this.gameOver = true;
            this.scene.start("end", {
                score: this.score,
                gameOver: this.gameOver,
            });
        }
    }

    heal(amount) {
        this.playerHealth = Math.min(100, this.playerHealth + amount);
        // Update the health bar in the interface
        this.updateHealthBar();
    }

    generateHealingItems() {
        // Spawn healing items in random rooms
        if (this.playerHealth < 100 ) {
            // Choose a random position from the floor positions
            const floorPosition = Phaser.Math.RND.pick(this.floors);
            const x = floorPosition.x * 25; 
            const y = floorPosition.y * 25; 
            let healingItem = this.healingItems.create(x, y, 'healingItem');
            healingItem.setDepth(5); 
        }
    }

    handleHealingItem(player, healingItem) {
        healingItem.destroy();
        // Heal the player 10 health points
        this.heal(10);
    }

    // Enemy Spawning Features
    spawnerEnemy(room) {
        if (this.gameOver) return;
        const floorPosition = Phaser.Math.RND.pick(this.floors);
        const x = floorPosition.x * 25; 
        const y = floorPosition.y * 25; 
        let enemy = this.enemy.create(x, y, "enemy")
        enemy.setData('speed', 40); // Enemy movement speed
        enemy.setData('range', 50); // Chase Range
        enemy.setData('chasing', false); // State of persecution
    }

    handleEnemyCollision(player, enemy) {
        // Reduce player's life by 10 points
        this.takeDamage(10);
    }

    // Combat system functions
    // Method for melee attack
    meleeAttack() {
        const playerX = this.player.x;
        const playerY = this.player.y;
        const meleeAttackRadius = 50; // Adjust to desired attack radius size
        // Search for nearby enemies within a radius (circle) to the player
        this.enemy.getChildren().forEach((enemy) => {
            const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            if (distance <= meleeAttackRadius) {
                enemy.destroy();
            }
        });
    }

    // Collectibles Generation Functions
    generateCollectible() {
        if (this.gameOver) return;
        const types = ["bone", "goldCoin", "diamond", ];
        const type = Phaser.Math.RND.pick(types);
        const floorPosition = Phaser.Math.RND.pick(this.floors);
        const x = floorPosition.x * 25; 
        const y = floorPosition.y * 25; 
        let collectible = this.collectibles.create(x, y, type);
        collectible.setData("points", this.shapes[type].points);
        collectible.setData("type", type);
    }

    counterCollectible( player, collectible) {
        const typeName = collectible.getData("type");
        const points = collectible.getData("points");
        this.score += points;
        this.shapes[typeName].count += 1;
        console.table(this.shapes);
        console.log("Collected ", collectible.texture.key, points);
        console.log("Score ", this.score);
        collectible.destroy();
        this.scoreText.setText(
          `Score: ${this.score}
            B: ${this.shapes["bone"].count}
            G: ${this.shapes["goldCoin"].count}
            D: ${this.shapes["diamond"].count}`
        );
        this.checkWin();
    }

    checkWin(){
        const meetsPoints = this.score >= 60;
        const meetsShapes =
            this.shapes["bone"].count >= 1 ||
            this.shapes["goldCoin"].count >= 1 ||
            this.shapes["diamond"].count >= 1;
        if (meetsPoints && meetsShapes) {
            console.log("You won");
            this.scene.start("end", {
                score: this.score,
                gameOver: this.gameOver,
            });
        }
    }

    handleTimer() {
        this.timer -= 1;
        this.timerText.setText(`Time left: ${this.timer}`);
        if (this.timer === 0 ) {
          this.gameOver = true;
          this.scene.start("end", {
            score: this.score,
            gameOver: this.gameOver,
          });
        }
    }

    // Map generation functions
    generateFirstRoom(connectedDoor = null) {
        if (this.roomCount >= this.maxRooms) {
            // Room limit reached, stop generating
            console.log("Se alcanzó el límite de habitaciones generadas.");
            return;
        }
        // Generate a new random room
        let roomWidth = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomHeight = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomX = Phaser.Math.Between(2, this.mapWidth - roomWidth - 2);
        let roomY = Phaser.Math.Between(2, this.mapHeight - roomHeight - 2);
        // Create the room if it does not overlap with other rooms
        let newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        let overlaps = this.checkRoomOverlap(newRoom);
        if (!overlaps) {
            this.createRoom(newRoom);
            this.rooms.push(newRoom);
            this.roomCount++;
            // Generate doors at the edges of the room
            this.generateDoors(newRoom);
            // Console message for debugging
            console.log(`Habitación generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
        }
    }

    generateNextRoom(door, preferredDirection) {
        console.log("Generando habitación emergente...");
        let doorPos = door.getData('position');
        console.log("Posición de la puerta:", doorPos);
        // Get the room the door belongs to
        let parentRoom = this.rooms.find(room =>
            doorPos.x >= room.x && doorPos.x < room.x + room.width &&
            doorPos.y >= room.y && doorPos.y < room.y + room.height
        );
        if (!parentRoom) {
            console.error("No se encontró la habitación para la puerta.");
            return;
        }
        // Set the preferred address if not provided
        if (preferredDirection === undefined) {
            if (doorPos.x === parentRoom.x) {
                preferredDirection = 0; // Toward the left
            } else if (doorPos.x === parentRoom.x + parentRoom.width - 1) {
                preferredDirection = 1; // To the right
            } else if (doorPos.y === parentRoom.y) {
                preferredDirection = 2; // Upwards
            } else if (doorPos.y === parentRoom.y + parentRoom.height - 1) {
                preferredDirection = 3; // Down
            } else {
                console.error("La puerta no está en un borde de la habitación.");
                return;
            }
        }
        // Auxiliary function to check if a position is occupied by a room
        const isPositionOccupiedByRoom = (x, y) => {
            for (let room of this.rooms) {
                if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
                    return true; // The position is occupied by a room
                }
            }
            return false; // The position is not occupied by a room
        };
        let roomX, roomY;
        let roomWidth = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomHeight = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        switch (preferredDirection) {
            case 0: // Toward the left
                roomX = doorPos.x - (roomWidth + 1); // Position the room to the left of the hallway
                roomY = doorPos.y - Math.floor(roomHeight / 2); // Vertically centered with respect to the door
                break;
            case 1: // To the right
                roomX = doorPos.x + 1; // Position the room to the right of the hallway
                roomY = doorPos.y - Math.floor(roomHeight / 2); // Vertically centered with respect to the door
                break;
            case 2: // Upwards
                roomX = doorPos.x - Math.floor(roomWidth / 2); // Horizontally centered with respect to the door
                roomY = doorPos.y - (roomHeight + 1); // Position the room above the hallway
                break;
            case 3: // Down
                roomX = doorPos.x - Math.floor(roomWidth / 2); // Horizontally centered with respect to the door
                roomY = doorPos.y + 1; // Position the room down the hall
                break;
            default:
                console.error("Dirección de generación de habitación emergente no válida.");
                return;
        }
        // Try to generate the room
        let newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        for (let distance = 0; distance <= 1; distance++) {
            if (!isPositionOccupiedByRoom(roomX, roomY) && !this.checkRoomOverlap(newRoom)) {
                this.createRoom(newRoom);
                this.rooms.push(newRoom);
                this.roomCount++;
                console.log(`Habitación emergente generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
                // Generate a door on the side of the room adjacent to the hallway
                this.generateDoorForEmergentRoom(newRoom, door, preferredDirection);
                // Call generateExtraDoors to generate additional doors in the pop-up room
                this.generateExtraDoors(newRoom);
                // Call generateCollectible to generate collectible objects 
                this.generateCollectible(newRoom);
                // Call spawnerEnemy to spawn enemies
                this.spawnerEnemy(newRoom);
                // Spawn healing items in the game
                this.generateHealingItems(newRoom);
                return; // Room generated successfully
            }
            // Move one more tile in the direction of the hallway and try again.
            switch (preferredDirection) {
                case 0: roomX--; break; // Left
                case 1: roomX++; break; // Right
                case 2: roomY--; break; // Above
                case 3: roomY++; break; // Below
            }
            // Update the room position and check variable
            newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        }
        console.log("No se pudo generar la habitación emergente después de varios intentos.");
    }
    
    generateDoorForEmergentRoom(room, door, direction) {
        let doorPos;
        switch (direction) {
            case 0: // Toward the left
                doorPos = { x: room.x + room.width - 1, y: door.getData('position').y };
                break;
            case 1: // To the right
                doorPos = { x: room.x, y: door.getData('position').y };
                break;
            case 2: // Upwards
                doorPos = { x: door.getData('position').x, y: room.y + room.height - 1 };
                break;
            case 3: // Down
                doorPos = { x: door.getData('position').x, y: room.y };
                break;
            default:
                console.error("Dirección de generación de puerta no válida.");
                return;
        }
        // Create the door instead of the wall
        this.wallLayer.children.each(function (wall) {
            if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                wall.destroy();
            }
        });
        let doorSprite = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
        doorSprite.setDepth(5); // Ensure the door is above the ground elements but below the player
        doorSprite.setData('position', { x: doorPos.x, y: doorPos.y });
        doorSprite.setData('used', true); // Mark the door as used
        this.doors.push(doorSprite);
        this.usedDoors.add(`${doorPos.x},${doorPos.y}`); // Add the door to the list of used doors
        console.log(`Puerta creada y marcada como usada en (${doorSprite.x}, ${doorSprite.y})`);
    }      
    
    generateExtraDoors(room) {
        let possibleDoorPositions = [];
        // Determine valid positions for new doors in room walls
        for (let x = room.x; x < room.x + room.width; x++) {
            if (x === room.x || x === room.x + room.width - 1) {
                // Left and right walls
                for (let y = room.y + 2; y < room.y + room.height - 2; y++) {
                    possibleDoorPositions.push({ x: x, y: y });
                }
            }
        }
        // Choose from 0 to 3 random positions for the doors
        let doorsToCreate = Phaser.Math.Between(0, Math.min(3, possibleDoorPositions.length));
        for (let i = 0; i < doorsToCreate; i++) {
            let doorIndex = Phaser.Math.Between(0, possibleDoorPositions.length - 1);
            let doorPos = possibleDoorPositions[doorIndex];
            let doorKey = `${doorPos.x},${doorPos.y}`;
            // Check the minimum distance of 2 tiles with other doors
            let validPosition = true;
            for (let j = 0; j < this.doors.length; j++) {
                let existingDoor = this.doors[j];
                let distX = Math.abs(existingDoor.getData('position').x - doorPos.x);
                let distY = Math.abs(existingDoor.getData('position').y - doorPos.y);
                if (distX < 2 || distY < 2) {
                    validPosition = false;
                    break;
                }
            }
            if (validPosition && !this.usedDoors.has(doorKey)) {
                // Replace the wall tile with the door
                this.wallLayer.children.each(function (wall) {
                    if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                        wall.destroy();
                    }
                });
                // Create the door instead of the wall
                let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
                door.setDepth(5); // Ensure the door is above the ground elements but below the player
                door.setData('position', { x: doorPos.x, y: doorPos.y });
                door.setData('used', false);
                this.doors.push(door); // Add the door to doors
                this.usedDoors.add(doorKey); // Add the door to the list of used doors
                // Console message for debugging
                console.log(`Puerta creada en (${door.x}, ${door.y}) en la habitación emergente.`);
            }
            // Remove the position from the list to avoid close overlaps
            possibleDoorPositions.splice(doorIndex, 1);
        }
    }

    createDoor(doorPos) {
        // Delete the existing wall at the door position
        this.wallLayer.children.each(function (wall) {
            if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                wall.destroy();
                // Remove the wall position from the array
                this.wallPositions = this.wallPositions.filter(pos => !(pos.x === doorPos.x && pos.y === doorPos.y));
            }
        }, this);
        // Create the door instead of the wall
        let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
        door.setDepth(5); // Ensure the door is above the ground elements but below the player
        door.setData('position', { x: doorPos.x, y: doorPos.y });
        door.setData('used', false);
        this.doors.push(door); // Add the door to doors
        this.usedDoors.add(`${doorPos.x},${doorPos.y}`); // Add the door to the list of used doors
        console.log(`Puerta creada en (${door.x}, ${door.y})`);
    }                                                     

    generateDoors(room) {
        // Place doors on the edges of the room (up to 4 doors)
        let possibleDoorPositions = [];
        if (room.x > 2) possibleDoorPositions.push({ x: room.x, y: Phaser.Math.Between(room.y + 1, room.y + room.height - 2) });
        if (room.x + room.width < this.mapWidth - 2) possibleDoorPositions.push({ x: room.x + room.width - 1, y: Phaser.Math.Between(room.y + 1, room.y + room.height - 2) });
        if (room.y > 2) possibleDoorPositions.push({ x: Phaser.Math.Between(room.x + 1, room.x + room.width - 2), y: room.y });
        if (room.y + room.height < this.mapHeight - 2) possibleDoorPositions.push({ x: Phaser.Math.Between(room.x + 1, room.x + room.width - 2), y: room.y + room.height - 1 });
        let doorsToCreate = Phaser.Math.Between(1, Math.min(4, possibleDoorPositions.length));
        for (let i = 0; i < doorsToCreate; i++) {
            let doorPos = possibleDoorPositions.splice(Phaser.Math.Between(0, possibleDoorPositions.length - 1), 1)[0];
            let doorKey = `${doorPos.x},${doorPos.y}`;
            if (!this.usedDoors.has(doorKey)) {
                // Delete the existing wall at the door position
                this.wallLayer.children.each(function (wall) {
                    if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                        wall.destroy();
                    }
                });
                // Create the door instead of the wall
                let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
                door.setDepth(5); // Ensure the door is above the ground elements but below the player
                door.setData('position', { x: doorPos.x, y: doorPos.y });
                door.setData('used', false);
                this.doors.push(door); // Add the door to doors
                this.usedDoors.add(doorKey);
                console.log(`Puerta creada en (${door.x}, ${door.y})`);
            }
        }
    }    

    createPassage(door) {
        console.log("Generando pasillo...");
        // Create a hallway 1 tile wide and long
        let passageLength = 1;
        let doorPos = door.getData('position');
        console.log("Posición de la puerta:", doorPos);
        // Get the room the door belongs to
        let parentRoom = this.rooms.find(room =>
            doorPos.x >= room.x && doorPos.x < room.x + room.width &&
            doorPos.y >= room.y && doorPos.y < room.y + room.height
        );
        if (!parentRoom) {
            console.error("No se encontró la habitación para la puerta.");
            return;
        }
        // Determine the direction to generate the hallway based on the door position
        let preferredDirection;
        if (doorPos.x === parentRoom.x) {
            preferredDirection = 0; // Toward the left
        } else if (doorPos.x === parentRoom.x + parentRoom.width - 1) {
            preferredDirection = 1; // To the right
        } else if (doorPos.y === parentRoom.y) {
            preferredDirection = 2; // Upwards
        } else if (doorPos.y === parentRoom.y + parentRoom.height - 1) {
            preferredDirection = 3; // Down
        } else {
            console.error("La puerta no está en un borde de la habitación.");
            return;
        }
        // Helper function to check if a position is occupied by a room
        const isPositionOccupiedByRoom = (x, y) => {
            for (let room of this.rooms) {
                if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
                    return true; // The position is occupied by a room
                }
            }
            return false; // The position is not occupied by a room
        };
        // Generate the hallway in the preferred direction
        switch (preferredDirection) {
            case 0: // Toward the left
                if (doorPos.x - passageLength >= 0 && !isPositionOccupiedByRoom(doorPos.x - passageLength, doorPos.y)) {
                    this.floorLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, (doorPos.y + 1) * 25, 'wall'));
                }
                break;
            case 1: // To the right
                if (doorPos.x + 1 < this.mapWidth && !isPositionOccupiedByRoom(doorPos.x + 1, doorPos.y)) {
                    this.floorLayer.add(this.add.sprite((doorPos.x + 1) * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y + 1) * 25, 'wall'));
                }
                break;
            case 2: // Upwards
                if (doorPos.y - passageLength >= 0 && !isPositionOccupiedByRoom(doorPos.x, doorPos.y - passageLength)) {
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, (doorPos.y - passageLength) * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, (doorPos.y - passageLength) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y - passageLength) * 25, 'wall'));
                }
                break;
            case 3: // Down
                if (doorPos.y + 1 < this.mapHeight && !isPositionOccupiedByRoom(doorPos.x, doorPos.y + 1)) {
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, (doorPos.y + 1) * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, (doorPos.y + 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y + 1) * 25, 'wall'));
                }
                break;
        }
        // Call generateNextRoom to create the pop-up room at the end of the hallway
        this.generateNextRoom(door);
        console.log("Pasillo generado en dirección", preferredDirection);
    }           

    createRoom(room) {
        // Draw the edges of the room
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let y = room.y; y < room.y + room.height; y++) {
                let isBorder = (x === room.x || x === room.x + room.width - 1 || y === room.y || y === room.y + room.height - 1);
                if (isBorder) {
                    this.wallLayer.add(this.add.sprite(x * 25, y * 25, 'wall'));
                    // Store the position of the wall
                    this.walls.push({ x: x, y: y });
                } else {
                    this.floorLayer.add(this.add.sprite(x * 25, y * 25, 'floor'));
                    // Store the position of the floor
                    this.floors.push({ x: x, y: y });
                }
            }
        }
    }

    checkRoomOverlap(newRoom) {
        // Check if the new room overlaps with any existing rooms
        for (let room of this.rooms) {
            if (this.doRoomsOverlap(room, newRoom)) {
                return true; // Overlaps with another room
            }
        }
        // Check if the new room overlaps any generated hallway
        for (let door of this.doors) {
            let doorPos = door.getData('position');
            // Create an object representing the generated hallway
            let passage = {
                x: doorPos.x - 1,
                y: doorPos.y - 1,
                width: 3,
                height: 3
            };
            if (this.doRoomsOverlap(passage, newRoom)) {
                return true; // Overlaps with a hallway
            }
        }
        return false; // Does not overlap with other rooms or hallways
    }
    
    // Helper function to check if two rooms overlap
    doRoomsOverlap(room1, room2) {
        return (
            room1.x < room2.x + room2.width &&
            room1.x + room1.width > room2.x &&
            room1.y < room2.y + room2.height &&
            room1.y + room1.height > room2.y
        );
    }    
}