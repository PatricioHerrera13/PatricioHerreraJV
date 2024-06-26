// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");

        // Definir mapWidth y mapHeight como propiedades de la clase
        this.mapWidth = 40;
        this.mapHeight = 40;
        
        // Array para almacenar información sobre todas las habitaciones del mapa
        this.rooms = [];
        
        // Variable para almacenar la habitación actual del jugador
        this.currentRoom = null;
    }

    preload() {
        // Cargar spritesheets y otras imágenes necesarias
        this.load.spritesheet('wall', 'public/wall.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('floor', 'public/floor.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('player', 'public/player.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('specialItem', 'assets/specialItem.png', { frameWidth: 25, frameHeight: 25 });
        this.load.image('door', 'public/door.png');
    }

    create() {
        const tileSize = 25; // Tamaño de cada celda en píxeles

        this.doorsGroup = this.physics.add.group();

        // Generar la habitación inicial para el jugador
        this.currentRoom = this.generateRoom(this.mapWidth, this.mapHeight);
        this.rooms.push(this.currentRoom);

        // Crear sprites para la habitación inicial
        this.createRoomSprites(this.currentRoom);

        // Colocar al jugador en la habitación inicial con físicas
        const playerSpawnX = this.currentRoom.centerX * tileSize;
        const playerSpawnY = this.currentRoom.centerY * tileSize;
        this.player = this.physics.add.sprite(playerSpawnX, playerSpawnY, 'player').setOrigin(0);

        // Hacer que la cámara siga al jugador
        this.cameras.main.startFollow(this.player);

        // Generar puertas en la habitación del jugador
        this.generateDoors(this.currentRoom);

        // Escuchar eventos de teclado para movimiento del jugador
        this.input.keyboard.on('keydown', (event) => {
            const speed = 1; // Velocidad de movimiento del jugador

            switch (event.key) {
                case 'ArrowUp':
                    this.tryMovePlayer(0, -1, speed); // Arriba
                    break;
                case 'ArrowDown':
                    this.tryMovePlayer(0, 1, speed); // Abajo
                    break;
                case 'ArrowLeft':
                    this.tryMovePlayer(-1, 0, speed); // Izquierda
                    break;
                case 'ArrowRight':
                    this.tryMovePlayer(1, 0, speed); // Derecha
                    break;
            }
        });

        // Detectar colisión con las puertas
        this.physics.add.overlap(this.player, this.doorsGroup, this.enterDoor, null, this);
    }

    generateRoom(mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(8, 15);  // Ajustar tamaño de habitación
        const roomHeight = Phaser.Math.Between(8, 15); // Ajustar tamaño de habitación
        const startX = Phaser.Math.Between(1, mapWidth - roomWidth - 1);
        const startY = Phaser.Math.Between(1, mapHeight - roomHeight - 1);

        return this.createRoom(startX, startY, roomWidth, roomHeight);
    }

    createRoom(startX, startY, roomWidth, roomHeight) {
        // Generar un array 2D para representar las celdas de la habitación
        const tiles = [];
        for (let y = 0; y < roomHeight; y++) {
            tiles[y] = [];
            for (let x = 0; x < roomWidth; x++) {
                if (x === 0 || x === roomWidth - 1 || y === 0 || y === roomHeight - 1) {
                    tiles[y][x] = 'wall'; // Borde de la habitación como pared
                } else {
                    tiles[y][x] = 'floor'; // Interior de la habitación como piso
                }
            }
        }

        return {
            x: startX,
            y: startY,
            width: roomWidth,
            height: roomHeight,
            centerX: startX + Math.floor(roomWidth / 2),
            centerY: startY + Math.floor(roomHeight / 2),
            tiles: tiles,
            doors: [] // Almacenar las posiciones de las puertas de la habitación
        };
    }

    createRoomSprites(room) {
        const tileSize = 25;

        room.tiles.forEach((row, y) => {
            row.forEach((tileType, x) => {
                const posX = (room.x + x) * tileSize;
                const posY = (room.y + y) * tileSize;

                switch (tileType) {
                    case 'wall':
                        this.add.sprite(posX, posY, 'wall').setOrigin(0);
                        break;
                    case 'floor':
                        this.add.sprite(posX, posY, 'floor').setOrigin(0);
                        break;
                }
            });
        });
    }

    generateDoors(room) {
        const tileSize = 25;
        const numDoors = Phaser.Math.Between(1, 4); // Generar entre 1 y 4 puertas

        for (let i = 0; i < numDoors; i++) {
            // Elegir aleatoriamente un borde de la habitación para colocar la puerta
            let doorX, doorY;

            // Lado izquierdo o derecho de la habitación
            if (Phaser.Math.Between(0, 1) === 0) {
                doorX = (Phaser.Math.Between(0, 1) === 0) ? room.x : room.x + room.width - 1;
                doorY = Phaser.Math.Between(room.y + 1, room.y + room.height - 2);
            } else { // Lado superior o inferior de la habitación
                doorX = Phaser.Math.Between(room.x + 1, room.x + room.width - 2);
                doorY = (Phaser.Math.Between(0, 1) === 0) ? room.y : room.y + room.height - 1;
            }

            // Colocar la puerta en la matriz de tiles
            room.tiles[doorY - room.y][doorX - room.x] = 'door';

            // Renderizar la puerta en el juego con físicas
            const doorSprite = this.physics.add.sprite(doorX * tileSize, doorY * tileSize, 'door').setOrigin(0);
            doorSprite.setDisplaySize(tileSize, tileSize);

            // Agregar la puerta al grupo de física para detección de colisiones
            this.doorsGroup.add(doorSprite);
            doorSprite.body.setImmovable(true);
            doorSprite.body.moves = false;

            // Agregar la puerta al grupo de puertas para administración
            room.doors.push({ x: doorX, y: doorY });
        }
    }

    tryMovePlayer(dx, dy, speed) {
        const tileSize = 25;
        const playerNextX = this.player.x + dx * tileSize * speed;
        const playerNextY = this.player.y + dy * tileSize * speed;

        // Verificar si el movimiento está dentro de los límites de la habitación actual
        if (this.isPlayerMoveValid(playerNextX, playerNextY)) {
            this.player.x = playerNextX;
            this.player.y = playerNextY;
        }
    }

    isPlayerMoveValid(nextX, nextY) {
        const tileSize = 25;
        const playerTileX = Math.floor(nextX / tileSize);
        const playerTileY = Math.floor(nextY / tileSize);
    
        // Verificar si el siguiente movimiento está dentro de los límites de la habitación actual
        if (this.currentRoom &&
            playerTileX >= this.currentRoom.x && playerTileX < this.currentRoom.x + this.currentRoom.width &&
            playerTileY >= this.currentRoom.y && playerTileY < this.currentRoom.y + this.currentRoom.height) {
            
            // Verificar que el siguiente tile sea 'floor'
            const nextTile = this.currentRoom.tiles[playerTileY - this.currentRoom.y][playerTileX - this.currentRoom.x];
            return nextTile === 'floor' || nextTile === 'door';
        }
    
        return false;
    }

    enterDoor(player, door) {
        // Encontrar la habitación actual basada en la posición del jugador
        const playerTileX = Math.floor(player.x / 25);
        const playerTileY = Math.floor(player.y / 25);

        this.currentRoom = this.rooms.find(room =>
            playerTileX >= room.x && playerTileX < room.x + room.width &&
            playerTileY >= room.y && playerTileY < room.y + room.height
        );

        // Generar una nueva habitación adyacente basada en la posición de la puerta
        const doorX = Math.floor(door.x / 25);
        const doorY = Math.floor(door.y / 25);
        const newRoom = this.generateAdjacentRoom(doorX, doorY);

        if (newRoom) {
            this.rooms.push(newRoom);
            this.createRoomSprites(newRoom);
            this.generateDoors(newRoom);

            // Limpiar el grupo de puertas actual
            this.doorsGroup.clear(true, true);

            // Generar nuevas habitaciones emergentes si es posible
            if (newRoom.doors.length > 0) {
                newRoom.doors.forEach(door => {
                    const doorSprite = this.physics.add.sprite(door.x * 25, door.y * 25, 'door').setOrigin(0);
                    doorSprite.setDisplaySize(25, 25);
                    this.doorsGroup.add(doorSprite);
                    doorSprite.body.setImmovable(true);
                    doorSprite.body.moves = false;
                });
            }

            // Posicionar al jugador en la nueva habitación
            const playerNewX = newRoom.centerX * 25;
            const playerNewY = newRoom.centerY * 25;
            this.player.setPosition(playerNewX, playerNewY);

            // Actualizar la habitación actual del jugador
            this.currentRoom = newRoom;
        }
    }

    generateAdjacentRoom(doorX, doorY) {
        let newRoom = null;

        // Verificar si la puerta se encuentra en un borde de la habitación actual
        if (this.currentRoom) {
            const offsetX = doorX - this.currentRoom.x;
            const offsetY = doorY - this.currentRoom.y;

            // Determinar la posición de la nueva habitación adyacente
            let newRoomX = this.currentRoom.x;
            let newRoomY = this.currentRoom.y;
            let newRoomWidth = this.currentRoom.width;
            let newRoomHeight = this.currentRoom.height;

            if (offsetX === 0 && doorX === this.currentRoom.x) { // Puerta en el borde izquierdo
                newRoomX -= newRoomWidth;
            } else if (offsetX === this.currentRoom.width - 1 && doorX === this.currentRoom.x + this.currentRoom.width - 1) { // Puerta en el borde derecho
                newRoomX += newRoomWidth;
            } else if (offsetY === 0 && doorY === this.currentRoom.y) { // Puerta en el borde superior
                newRoomY -= newRoomHeight;
            } else if (offsetY === this.currentRoom.height - 1 && doorY === this.currentRoom.y + this.currentRoom.height - 1) { // Puerta en el borde inferior
                newRoomY += newRoomHeight;
            }

            // Generar una nueva habitación adyacente
            newRoom = this.createRoom(newRoomX, newRoomY, newRoomWidth, newRoomHeight);
        }

        return newRoom;
    }
}