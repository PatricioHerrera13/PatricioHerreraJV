// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");

        // Definir el tamaño del mapa y el tamaño de las habitaciones
        this.mapWidth = 500;
        this.mapHeight = 500;
        this.roomMinSize = 4;  // Tamaño mínimo de la habitación en tiles
        this.roomMaxSize = 8;  // Tamaño máximo de la habitación en tiles
        this.maxRooms = Phaser.Math.Between(10, 50);  // Número aleatorio de habitaciones
        this.rooms = [];  // Arreglo para almacenar las habitaciones generadas
        this.usedDoors = new Set();  // Conjunto para puertas ya utilizadas para generar pasillos
        this.roomCount = 0;  // Contador de habitaciones generadas
        this.player = null; // Jugador
        this.doors = []; // Lista de puertas
        this.walls = []; // Lista de paredes 
        this.floors =  [] // Lista de pisos
        this.playerSpawned = false; // Bandera para asegurar que el jugador se coloque solo una vez
        this.playerHealth = 100; // Vida máxima 
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
        // Cargar spritesheets y otras imágenes necesarias
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
        // Crear grupos 
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
        
        // Generar la primera habitación inicial
        this.generateFirstRoom();
    
        // Verificar si el jugador ya ha sido colocado en una habitación
        if (!this.playerSpawned && this.rooms.length > 0) {
            let firstRoom = this.rooms[0];
            // Colocar al jugador en el centro de la primera habitación generada
            this.player = this.physics.add.sprite((firstRoom.x + firstRoom.width / 2) * 25, (firstRoom.y + firstRoom.height / 2) * 25, 'player');
            this.player.setDepth(10); // Asegurar que el jugador esté sobre los demás elementos
            this.player.setSize(20, 20); // Definir el tamaño de la caja de colisión
            this.playerSpawned = true;
            this.player.Wounded = false;
            this.player.immuneTime = 0;
        }
    
        //movimiento del player
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.meleeAttack();
        });

        // Hacer que la cámara siga al jugador
        this.cameras.main.startFollow(this.player);

        // Configurar límites de la cámara
        this.cameras.main.setBounds(0, 0, this.mapWidth * 25, this.mapHeight * 25);

        // Personalización adicional de la cámara
        this.cameras.main.setZoom(2.5); // Zoom de la cámara
        this.cameras.main.setLerp(0.1, 0.1); // Suavizado de seguimiento
        this.cameras.main.setBackgroundColor('#000000'); // Color de fondo de la cámara

        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        
        this.time.addEvent({
            delay: 1000,
            callback: this.handleTimer,
            callbackScope: this,
            loop: true,
        });
        
        // Agregar texto a la cámara
        this.timerText = this.add.text(250, 275, `Time left: ${this.timer}`, {fontSize: "20px", fill: "#fff",});
        this.timerText.setScale(1 / this.cameras.main.zoom);// Escalar el texto en función del zoom de la cámara
        this.timerText.setDepth(11);
        this.timerText.setScrollFactor(0); // Hacer que el texto sea fijo en la cámara (no se desplace con ella)

        this.scoreText = this.add.text(250, 285,
            `Score: ${this.score}
              B: ${this.shapes["bone"].count}
              G: ${this.shapes["goldCoin"].count}
              D: ${this.shapes["diamond"].count}`
        );
        this.scoreText.setScale(1 / this.cameras.main.zoom);
        this.scoreText.setDepth(11);
        this.scoreText.setScrollFactor(0); // Hacer que el texto sea fijo en la cámara (no se desplace con ella)

        // Crear la barra de vida
        this.createHealthBar();

        // Configurar colisiones entre el jugador y los objetos curativos
        this.physics.add.overlap(this.player, this.healingItems, this.handleHealingItem, null, this);

        // Configurar colisiones entre el jugador y las paredes
        this.physics.add.collider(this.player, this.wallLayer);

        // Configurar colisiones entre los enemigos y las paredes
        this.physics.add.collider(this.enemy, this.wallLayer);

        // Configurar colisiones entre los enemigos 
        this.physics.add.collider(this.enemy, this.enemy);

        //Configurar colisiones entre el jugador y los recolectables
        this.physics.add.collider(this.player, this.collectibles, this.counterCollectible, null, this);

        // Configurar colisiones entre el jugador y los enemigos
        this.physics.add.overlap(this.player, this.enemy, this.handleEnemyCollision, null, this);
    }   

    update() {
        // Mover el jugador con las teclas de flecha
        if (this.a.isDown) {
            this.player.setVelocityX(-100); // Movimiento a la izquierda
        } else if (this.d.isDown) {
            this.player.setVelocityX(100); // Movimiento a la derecha
        } else {
            this.player.setVelocityX(0); // Detener el movimiento horizontal
        }
    
        if (this.w.isDown) {
            this.player.setVelocityY(-100); // Movimiento hacia arriba
        } else if (this.s.isDown) {
            this.player.setVelocityY(100); // Movimiento hacia abajo
        } else {
            this.player.setVelocityY(0); // Detener el movimiento vertical
        }

        // Verificar si el jugador está sobre una puerta
        for (let door of this.doors) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 25) {
                if (!door.getData('used')) {
                    this.createPassage(door);
                    door.setData('used', true);
                }
            }
        }

        //  Actualización de la vida del player 
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

        // Lógica de persecución de enemigos
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

    ////////////////// Funciones de gestion y creacion de vida //////////////////

    createHealthBar() {
        // Crear la barra de fondo (grisácea y transparente)
        this.healthBarBackground = this.add.image(250, 20, 'healthBarBackground');
        this.healthBarBackground.setOrigin(0, 0);  // Establecer el origen en la esquina superior izquierda
        this.healthBarBackground.setScrollFactor(0);  // Hacer que la barra no se mueva con la cámara
        this.healthBarBackground.setDepth(11);
        // Crear la barra de vida roja
        this.healthBar = this.add.image(250, 20, 'healthBar');
        this.healthBar.setOrigin(0, 0);
        this.healthBar.setScrollFactor(0);
        this.healthBar.setDepth(12);
        // Ajustar posición de la barra de vida en relación al texto
        this.healthBarBackground.x = 250; // Cambiar según la posición que necesitas
        this.healthBarBackground.y = 250;
        this.healthBar.x = 250; // Cambiar según la posición que necesitas
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
        
        // Actualizar la barra de salud en la interfaz
        this.updateHealthBar();
    }

    generateHealingItems() {
        // Generar objetos curativos en habitaciones aleatorias
        if (this.playerHealth < 100 ) {
            // Elegir una posición aleatoria de entre las posiciones de los pisos
            const floorPosition = Phaser.Math.RND.pick(this.floors);
            const x = floorPosition.x * 25; // Ajustar según el tamaño del tile de piso
            const y = floorPosition.y * 25; // Ajustar según el tamaño del tile de piso
            let healingItem = this.healingItems.create(x, y, 'healingItem');
            healingItem.setDepth(5); // Ajustar profundidad según necesidad
        }
    }

    handleHealingItem(player, healingItem) {
        // Eliminar el objeto curativo del juego
        healingItem.destroy();
    
        // Curar al jugador 10 puntos de vida
        this.heal(10);
    }

    ////////////////// Funciones de generacion de enemigos //////////////////

    spawnerEnemy(room) {
        if (this.gameOver) return;

        // Elegir una posición aleatoria de entre las posiciones de los pisos
        const floorPosition = Phaser.Math.RND.pick(this.floors);
        const x = floorPosition.x * 25; // Ajustar según el tamaño del tile de piso
        const y = floorPosition.y * 25; // Ajustar según el tamaño del tile de piso
        let enemy = this.enemy.create(x, y, "enemy")
        enemy.setData('speed', 40); // Velocidad de movimiento del enemigo
        enemy.setData('range', 50); // Rango de persecución
        enemy.setData('chasing', false); // Estado de persecución
    }

    handleEnemyCollision(player, enemy) {
        // Reducir la vida del jugador en 10 puntos
        this.takeDamage(10);
    }

    ////////////////// Funciones de sistema de combate /////////////////

    // Método para el ataque cuerpo a cuerpo
    meleeAttack() {
        const playerX = this.player.x;
        const playerY = this.player.y;
        const meleeAttackRadius = 50; // Ajustar según el tamaño deseado del radio de ataque

        // Buscar enemigos cercanos dentro de un radio (circunferencia) al jugador
        this.enemy.getChildren().forEach((enemy) => {
            const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            if (distance <= meleeAttackRadius) {
                enemy.destroy(); // Eliminar enemigo al ser golpeado
            }
        });
    }

    ////////////////// Funciones de generacion de recolectables //////////////////

    generateCollectible() {
        if (this.gameOver) return;
      
        const types = ["bone", "goldCoin", "diamond", ];
        const type = Phaser.Math.RND.pick(types);
      
        // Elegir una posición aleatoria de entre las posiciones de los pisos
        const floorPosition = Phaser.Math.RND.pick(this.floors);
        const x = floorPosition.x * 25; // Ajustar según el tamaño del tile de piso
        const y = floorPosition.y * 25; // Ajustar según el tamaño del tile de piso
        
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
            this.shapes["bone"].count >= 1 &&
            this.shapes["goldCoin"].count >= 1 &&
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

    ////////////////// Funciones de generacion de mapa //////////////////

    generateFirstRoom(connectedDoor = null) {
        if (this.roomCount >= this.maxRooms) {
            // Se alcanzó el límite de habitaciones, detener la generación
            console.log("Se alcanzó el límite de habitaciones generadas.");
            return;
        }
    
        // Generar una nueva habitación aleatoria
        let roomWidth = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomHeight = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomX = Phaser.Math.Between(2, this.mapWidth - roomWidth - 2);
        let roomY = Phaser.Math.Between(2, this.mapHeight - roomHeight - 2);
    
        // Crear la habitación si no se superpone con otras habitaciones
        let newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        let overlaps = this.checkRoomOverlap(newRoom);
    
        if (!overlaps) {
            this.createRoom(newRoom);
            this.rooms.push(newRoom);
            this.roomCount++;
    
            // Generar puertas en los bordes de la habitación
            this.generateDoors(newRoom);
    
            // Mensaje de consola para depuración
            console.log(`Habitación generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
        }
    }

    generateNextRoom(door, preferredDirection) {
        console.log("Generando habitación emergente...");
    
        let doorPos = door.getData('position');
        console.log("Posición de la puerta:", doorPos);
    
        // Obtener la habitación a la que pertenece la puerta
        let parentRoom = this.rooms.find(room =>
            doorPos.x >= room.x && doorPos.x < room.x + room.width &&
            doorPos.y >= room.y && doorPos.y < room.y + room.height
        );
    
        if (!parentRoom) {
            console.error("No se encontró la habitación para la puerta.");
            return;
        }
    
        // Definir la dirección preferida si no se proporciona
        if (preferredDirection === undefined) {
            if (doorPos.x === parentRoom.x) {
                preferredDirection = 0; // Hacia la izquierda
            } else if (doorPos.x === parentRoom.x + parentRoom.width - 1) {
                preferredDirection = 1; // Hacia la derecha
            } else if (doorPos.y === parentRoom.y) {
                preferredDirection = 2; // Hacia arriba
            } else if (doorPos.y === parentRoom.y + parentRoom.height - 1) {
                preferredDirection = 3; // Hacia abajo
            } else {
                console.error("La puerta no está en un borde de la habitación.");
                return;
            }
        }
    
        // Función auxiliar para verificar si una posición está ocupada por una habitación
        const isPositionOccupiedByRoom = (x, y) => {
            for (let room of this.rooms) {
                if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
                    return true; // La posición está ocupada por una habitación
                }
            }
            return false; // La posición no está ocupada por una habitación
        };
    
        let roomX, roomY;
        let roomWidth = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
        let roomHeight = Phaser.Math.Between(this.roomMinSize, this.roomMaxSize);
    
        switch (preferredDirection) {
            case 0: // Hacia la izquierda
                roomX = doorPos.x - (roomWidth + 1); // Posiciona la habitación a la izquierda del pasillo
                roomY = doorPos.y - Math.floor(roomHeight / 2); // Centrado verticalmente con respecto a la puerta
                break;
            case 1: // Hacia la derecha
                roomX = doorPos.x + 1; // Posiciona la habitación a la derecha del pasillo
                roomY = doorPos.y - Math.floor(roomHeight / 2); // Centrado verticalmente con respecto a la puerta
                break;
            case 2: // Hacia arriba
                roomX = doorPos.x - Math.floor(roomWidth / 2); // Centrado horizontalmente con respecto a la puerta
                roomY = doorPos.y - (roomHeight + 1); // Posiciona la habitación arriba del pasillo
                break;
            case 3: // Hacia abajo
                roomX = doorPos.x - Math.floor(roomWidth / 2); // Centrado horizontalmente con respecto a la puerta
                roomY = doorPos.y + 1; // Posiciona la habitación abajo del pasillo
                break;
            default:
                console.error("Dirección de generación de habitación emergente no válida.");
                return;
        }
    
        // Intentar generar la habitación
        let newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
    
        for (let distance = 0; distance <= 1; distance++) {
            if (!isPositionOccupiedByRoom(roomX, roomY) && !this.checkRoomOverlap(newRoom)) {
                this.createRoom(newRoom);
                this.rooms.push(newRoom);
                this.roomCount++;
                console.log(`Habitación emergente generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
                
                // Generar una puerta en el lado de la habitación adyacente al pasillo
                this.generateDoorForEmergentRoom(newRoom, door, preferredDirection);

                // Llamar a generateExtraDoors para generar puertas adicionales en la habitación emergente
                this.generateExtraDoors(newRoom);

                //Llama a generateCollectible para que se generen objetos recolectables 
                this.generateCollectible(newRoom);
    
                //Llama a spawnerEnemy para que se generen enemigos 
                this.spawnerEnemy(newRoom);
                
                // Generar objetos curativos en el juego
                this.generateHealingItems(newRoom);
                
                return; // Habitación generada exitosamente
            }
    
            // Avanzar un tile más en la dirección del pasillo y volver a intentar
            switch (preferredDirection) {
                case 0: roomX--; break; // Izquierda
                case 1: roomX++; break; // Derecha
                case 2: roomY--; break; // Arriba
                case 3: roomY++; break; // Abajo
            }
            
            // Actualizar la posición de la habitación y la variable de comprobación
            newRoom = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        }
    
        console.log("No se pudo generar la habitación emergente después de varios intentos.");
    }
    
    generateDoorForEmergentRoom(room, door, direction) {
        let doorPos;
        switch (direction) {
            case 0: // Hacia la izquierda
                doorPos = { x: room.x + room.width - 1, y: door.getData('position').y };
                break;
            case 1: // Hacia la derecha
                doorPos = { x: room.x, y: door.getData('position').y };
                break;
            case 2: // Hacia arriba
                doorPos = { x: door.getData('position').x, y: room.y + room.height - 1 };
                break;
            case 3: // Hacia abajo
                doorPos = { x: door.getData('position').x, y: room.y };
                break;
            default:
                console.error("Dirección de generación de puerta no válida.");
                return;
        }
        
        // Crear la puerta en lugar de la pared
        this.wallLayer.children.each(function (wall) {
            if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                wall.destroy();
            }
        });
        
        let doorSprite = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
        doorSprite.setDepth(5); // Asegurar que la puerta esté sobre los elementos de suelo pero debajo del jugador
        doorSprite.setData('position', { x: doorPos.x, y: doorPos.y });
        doorSprite.setData('used', true); // Marcar la puerta como usada
        this.doors.push(doorSprite);
        this.usedDoors.add(`${doorPos.x},${doorPos.y}`); // Agregar la puerta a la lista de puertas usadas
        
        console.log(`Puerta creada y marcada como usada en (${doorSprite.x}, ${doorSprite.y})`);
    }      
    
    generateExtraDoors(room) {
        let possibleDoorPositions = [];
    
        // Determinar las posiciones válidas para nuevas puertas en las paredes de la habitación
        for (let x = room.x; x < room.x + room.width; x++) {
            if (x === room.x || x === room.x + room.width - 1) {
                // Paredes izquierda y derecha
                for (let y = room.y + 2; y < room.y + room.height - 2; y++) {
                    possibleDoorPositions.push({ x: x, y: y });
                }
            }
        }
    
        // Escoger de 0 a 3 posiciones aleatorias para las puertas
        let doorsToCreate = Phaser.Math.Between(0, Math.min(3, possibleDoorPositions.length));
        for (let i = 0; i < doorsToCreate; i++) {
            let doorIndex = Phaser.Math.Between(0, possibleDoorPositions.length - 1);
            let doorPos = possibleDoorPositions[doorIndex];
            let doorKey = `${doorPos.x},${doorPos.y}`;
    
            // Verificar la distancia mínima de 2 tiles con otras puertas
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
                // Reemplazar el tile de la pared con la puerta
                this.wallLayer.children.each(function (wall) {
                    if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                        wall.destroy();
                    }
                });
    
                // Crear la puerta en lugar de la pared
                let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
                door.setDepth(5); // Asegurar que la puerta esté sobre los elementos de suelo pero debajo del jugador
                door.setData('position', { x: doorPos.x, y: doorPos.y });
                door.setData('used', false);
                this.doors.push(door); // Añadir la puerta a this.doors
                this.usedDoors.add(doorKey); // Agregar la puerta a la lista de puertas usadas
    
                // Mensaje de consola para depuración
                console.log(`Puerta creada en (${door.x}, ${door.y}) en la habitación emergente.`);
            }
    
            // Remover la posición de la lista para evitar superposiciones cercanas
            possibleDoorPositions.splice(doorIndex, 1);
        }
    }

    createDoor(doorPos) {
        // Eliminar la pared existente en la posición de la puerta
        this.wallLayer.children.each(function (wall) {
            if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                wall.destroy();
                // Eliminar la posición de la pared del arreglo
                this.wallPositions = this.wallPositions.filter(pos => !(pos.x === doorPos.x && pos.y === doorPos.y));
            }
        }, this);
    
        // Crear la puerta en lugar de la pared
        let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
        door.setDepth(5); // Asegurar que la puerta esté sobre los elementos de suelo pero debajo del jugador
        door.setData('position', { x: doorPos.x, y: doorPos.y });
        door.setData('used', false);
        this.doors.push(door); // Añadir la puerta a this.doors
        this.usedDoors.add(`${doorPos.x},${doorPos.y}`); // Agregar la puerta a la lista de puertas usadas
    
        console.log(`Puerta creada en (${door.x}, ${door.y})`);
    }                                                     

    generateDoors(room) {
        // Colocar puertas en los bordes de la habitación (hasta 4 puertas)
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
                // Eliminar la pared existente en la posición de la puerta
                this.wallLayer.children.each(function (wall) {
                    if (wall.x === doorPos.x * 25 && wall.y === doorPos.y * 25) {
                        wall.destroy();
                    }
                });
    
                // Crear la puerta en lugar de la pared
                let door = this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
                door.setDepth(5); // Asegurar que la puerta esté sobre los elementos de suelo pero debajo del jugador
                door.setData('position', { x: doorPos.x, y: doorPos.y });
                door.setData('used', false);
                this.doors.push(door); // Añadir la puerta a this.doors
                this.usedDoors.add(doorKey);
    
                // Mensaje de consola para depuración
                console.log(`Puerta creada en (${door.x}, ${door.y})`);
            }
        }
    }    

    createPassage(door) {
        console.log("Generando pasillo...");
        
        // Crear un pasillo de 1 tile de ancho y largo
        let passageLength = 1;
        let doorPos = door.getData('position');
        console.log("Posición de la puerta:", doorPos);
    
        // Obtener la habitación a la que pertenece la puerta
        let parentRoom = this.rooms.find(room =>
            doorPos.x >= room.x && doorPos.x < room.x + room.width &&
            doorPos.y >= room.y && doorPos.y < room.y + room.height
        );
    
        if (!parentRoom) {
            console.error("No se encontró la habitación para la puerta.");
            return;
        }
    
        // Determinar la dirección para generar el pasillo basado en la posición de la puerta
        let preferredDirection;
        if (doorPos.x === parentRoom.x) {
            preferredDirection = 0; // Hacia la izquierda
        } else if (doorPos.x === parentRoom.x + parentRoom.width - 1) {
            preferredDirection = 1; // Hacia la derecha
        } else if (doorPos.y === parentRoom.y) {
            preferredDirection = 2; // Hacia arriba
        } else if (doorPos.y === parentRoom.y + parentRoom.height - 1) {
            preferredDirection = 3; // Hacia abajo
        } else {
            console.error("La puerta no está en un borde de la habitación.");
            return;
        }
    
        // Función auxiliar para verificar si una posición está ocupada por una habitación
        const isPositionOccupiedByRoom = (x, y) => {
            for (let room of this.rooms) {
                if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
                    return true; // La posición está ocupada por una habitación
                }
            }
            return false; // La posición no está ocupada por una habitación
        };
    
        // Generar el pasillo en la dirección preferida
        switch (preferredDirection) {
            case 0: // Hacia la izquierda
                if (doorPos.x - passageLength >= 0 && !isPositionOccupiedByRoom(doorPos.x - passageLength, doorPos.y)) {
                    this.floorLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - passageLength) * 25, (doorPos.y + 1) * 25, 'wall'));
    
                }
                break;
            case 1: // Hacia la derecha
                if (doorPos.x + 1 < this.mapWidth && !isPositionOccupiedByRoom(doorPos.x + 1, doorPos.y)) {
                    this.floorLayer.add(this.add.sprite((doorPos.x + 1) * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y + 1) * 25, 'wall'));
    
                }
                break;
            case 2: // Hacia arriba
                if (doorPos.y - passageLength >= 0 && !isPositionOccupiedByRoom(doorPos.x, doorPos.y - passageLength)) {
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, (doorPos.y - passageLength) * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, (doorPos.y - passageLength) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y - passageLength) * 25, 'wall'));
    
                }
                break;
            case 3: // Hacia abajo
                if (doorPos.y + 1 < this.mapHeight && !isPositionOccupiedByRoom(doorPos.x, doorPos.y + 1)) {
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, (doorPos.y + 1) * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, (doorPos.y + 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, (doorPos.y + 1) * 25, 'wall'));
    
                }
                break;
        }
    
        // Llamar a generateNextRoom para crear la habitación emergente al final del pasillo
        this.generateNextRoom(door);
    
        console.log("Pasillo generado en dirección", preferredDirection);
    }           

    createRoom(room) {
        // Dibujar los bordes de la habitación
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let y = room.y; y < room.y + room.height; y++) {
                let isBorder = (x === room.x || x === room.x + room.width - 1 || y === room.y || y === room.y + room.height - 1);
                if (isBorder) {
                    this.wallLayer.add(this.add.sprite(x * 25, y * 25, 'wall'));
                    // Almacenar la posición de la pared
                    this.walls.push({ x: x, y: y });
                } else {
                    this.floorLayer.add(this.add.sprite(x * 25, y * 25, 'floor'));
                    // Almacenar la posición del piso
                    this.floors.push({ x: x, y: y });
                }
            }
        }
    }

    checkRoomOverlap(newRoom) {
        // Verificar si la nueva habitación se superpone con alguna habitación existente
        for (let room of this.rooms) {
            if (this.doRoomsOverlap(room, newRoom)) {
                return true; // Se superpone con otra habitación
            }
        }
    
        // Verificar si la nueva habitación se superpone con algún pasillo generado
        for (let door of this.doors) {
            let doorPos = door.getData('position');
            // Crear un objeto que represente el pasillo generado
            let passage = {
                x: doorPos.x - 1,
                y: doorPos.y - 1,
                width: 3,
                height: 3
            };
            if (this.doRoomsOverlap(passage, newRoom)) {
                return true; // Se superpone con un pasillo
            }
        }
    
        return false; // No se superpone con otras habitaciones ni pasillos
    }
    
    // Función auxiliar para verificar si dos habitaciones se superponen
    doRoomsOverlap(room1, room2) {
        return (
            room1.x < room2.x + room2.width &&
            room1.x + room1.width > room2.x &&
            room1.y < room2.y + room2.height &&
            room1.y + room1.height > room2.y
        );
 
    }    
}