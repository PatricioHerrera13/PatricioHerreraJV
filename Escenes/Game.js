// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");
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
        const mapWidth = 40; // Ancho total del mapa en celdas
        const mapHeight = 40; // Alto total del mapa en celdas

        // Array para almacenar información sobre cada habitación generada
        const rooms = [];

        // Generar la habitación inicial para el jugador
        let previousRoom = this.generateRoom(mapWidth, mapHeight);
        rooms.push(previousRoom);

        // Generar habitaciones intermedias adyacentes
        const numIntermediateRooms = Phaser.Math.Between(5, 10);
        for (let i = 0; i < numIntermediateRooms; i++) {
            const newRoom = this.generateAdjacentRoom(previousRoom, mapWidth, mapHeight);
            rooms.push(newRoom);
            previousRoom = newRoom;
        }

        // Generar habitación especial con el objeto para avanzar de nivel
        const exitRoom = this.generateExitRoom(mapWidth, mapHeight);
        rooms.push(exitRoom);

        // Conectar las habitaciones generadas
        this.connectRooms(rooms);

        // Lógica para posicionar sprites y crear el mapa basado en las habitaciones generadas
        rooms.forEach(room => {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    const posX = x * tileSize;
                    const posY = y * tileSize;
                    const tileType = room.tiles[y - room.y][x - room.x];

                    switch (tileType) {
                        case 'wall':
                            this.add.sprite(posX, posY, 'wall').setOrigin(0);
                            break;
                        case 'floor':
                            this.add.sprite(posX, posY, 'floor').setOrigin(0);
                            break;
                        case 'door':
                            this.add.sprite(posX, posY, 'door').setOrigin(0);
                            break;
                        case 'specialItem':
                            this.add.sprite(posX, posY, 'specialItem').setOrigin(0);
                            break;
                        // Puedes añadir más casos según tus necesidades (por ejemplo, para objetos, enemigos, etc.)
                    }
                }
            }
        });

        // Colocar al jugador en la habitación inicial
        const playerSpawnX = rooms[0].centerX * tileSize;
        const playerSpawnY = rooms[0].centerY * tileSize;
        this.player = this.add.sprite(playerSpawnX, playerSpawnY, 'player').setOrigin(0);

        // Hacer que la cámara siga al jugador
        this.cameras.main.startFollow(this.player);

        // Escuchar eventos de teclado para movimiento del jugador
        this.input.keyboard.on('keydown', (event) => {
            const speed = 1; // Velocidad de movimiento del jugador

            switch (event.key) {
                case 'ArrowUp':
                    this.player.y -= tileSize * speed;
                    break;
                case 'ArrowDown':
                    this.player.y += tileSize * speed;
                    break;
                case 'ArrowLeft':
                    this.player.x -= tileSize * speed;
                    break;
                case 'ArrowRight':
                    this.player.x += tileSize * speed;
                    break;
            }
        });

        // Lógica adicional según las necesidades del juego, como colocar puertas, enemigos, cofres, etc.
    }

    generateRoom(mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(5, 10);
        const roomHeight = Phaser.Math.Between(5, 10);
        const startX = Phaser.Math.Between(1, mapWidth - roomWidth - 1);
        const startY = Phaser.Math.Between(1, mapHeight - roomHeight - 1);

        return this.createRoom(startX, startY, roomWidth, roomHeight);
    }

    generateAdjacentRoom(previousRoom, mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(5, 10);
        const roomHeight = Phaser.Math.Between(5, 10);

        // Determinar las coordenadas iniciales adyacentes a la habitación anterior
        let startX, startY;
        const direction = Phaser.Math.Between(0, 3); // 0: arriba, 1: derecha, 2: abajo, 3: izquierda

        switch (direction) {
            case 0: // Arriba
                startX = Phaser.Math.Between(previousRoom.x, previousRoom.x + previousRoom.width - roomWidth);
                startY = previousRoom.y - roomHeight - 1;
                break;
            case 1: // Derecha
                startX = previousRoom.x + previousRoom.width + 1;
                startY = Phaser.Math.Between(previousRoom.y, previousRoom.y + previousRoom.height - roomHeight);
                break;
            case 2: // Abajo
                startX = Phaser.Math.Between(previousRoom.x, previousRoom.x + previousRoom.width - roomWidth);
                startY = previousRoom.y + previousRoom.height + 1;
                break;
            case 3: // Izquierda
                startX = previousRoom.x - roomWidth - 1;
                startY = Phaser.Math.Between(previousRoom.y, previousRoom.y + previousRoom.height - roomHeight);
                break;
        }

        return this.createRoom(startX, startY, roomWidth, roomHeight);
    }

    generateExitRoom(mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(5, 10);
        const roomHeight = Phaser.Math.Between(5, 10);
        const startX = mapWidth - roomWidth - 1;
        const startY = mapHeight - roomHeight - 1;

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
            tiles: tiles
        };
    }

    connectRooms(rooms) {
        // Conectar las habitaciones en el orden en que fueron generadas
        for (let i = 0; i < rooms.length - 1; i++) {
            const roomA = rooms[i];
            const roomB = rooms[i + 1];
            this.connectTwoRooms(roomA, roomB);
        }
    }

    connectTwoRooms(roomA, roomB) {
        // Calcular la posición del centro de cada habitación
        const centerA = { x: roomA.centerX, y: roomA.centerY };
        const centerB = { x: roomB.centerX, y: roomB.centerY };
    
        // Determinar la dirección entre las dos habitaciones (horizontal o vertical)
        const horizontal = centerA.x !== centerB.x;
    
        // Definir la cantidad aleatoria de puertas (entre 1 y 3)
        const numDoors = Phaser.Math.Between(1, 3);
    
        for (let d = 0; d < numDoors; d++) {
            // Definir el tamaño de la puerta (en tiles)
            const doorSize = 1; // Tamaño de la puerta en tiles
    
            // Elegir un punto aleatorio en las paredes de cada habitación para la puerta
            let pointA, pointB;
    
            if (horizontal) {
                // Conexión horizontal
                const yA = Phaser.Math.Between(Math.max(roomA.y + 1, centerA.y - doorSize + 1), Math.min(roomA.y + roomA.height - doorSize - 1, centerA.y));
                const yB = Phaser.Math.Between(Math.max(roomB.y + 1, centerB.y - doorSize + 1), Math.min(roomB.y + roomB.height - doorSize - 1, centerB.y));
    
                pointA = {
                    x: centerA.x,
                    y: yA
                };
                pointB = {
                    x: centerB.x,
                    y: yB
                };
            } else {
                // Conexión vertical
                const xA = Phaser.Math.Between(Math.max(roomA.x + 1, centerA.x - doorSize + 1), Math.min(roomA.x + roomA.width - doorSize - 1, centerA.x));
                const xB = Phaser.Math.Between(Math.max(roomB.x + 1, centerB.x - doorSize + 1), Math.min(roomB.x + roomB.width - doorSize - 1, centerB.x));
    
                pointA = {
                    x: xA,
                    y: centerA.y
                };
                pointB = {
                    x: xB,
                    y: centerB.y
                };
            }
    
            // Colocar la puerta en roomA
            if (horizontal) {
                for (let i = 0; i < doorSize; i++) {
                    roomA.tiles[pointA.y - roomA.y][pointA.x - roomA.x + i] = 'door';
                }
            } else {
                for (let i = 0; i < doorSize; i++) {
                    roomA.tiles[pointA.y - roomA.y + i][pointA.x - roomA.x] = 'door';
                }
            }
    
            // Colocar la puerta en roomB
            if (horizontal) {
                for (let i = 0; i < doorSize; i++) {
                    roomB.tiles[pointB.y - roomB.y][pointB.x - roomB.x + i] = 'door';
                }
            } else {
                for (let i = 0; i < doorSize; i++) {
                    roomB.tiles[pointB.y - roomB.y + i][pointB.x - roomB.x] = 'door';
                }
            }
        }
    }    
}