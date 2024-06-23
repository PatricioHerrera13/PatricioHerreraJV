// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");
    }

    preload() {
        // Cargar spritesheets y otras imágenes necesarias
        this.load.spritesheet('wall', 'assets/wall.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('floor', 'assets/floor.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('specialItem', 'assets/specialItem.png', { frameWidth: 16, frameHeight: 16 });
        this.load.image('door', 'assets/door.png');
    }

    create() {
        const tileSize = 16; // Tamaño de cada celda en píxeles
        const mapWidth = 40; // Ancho total del mapa en celdas
        const mapHeight = 40; // Alto total del mapa en celdas

        // Array para almacenar información sobre cada habitación generada
        const rooms = [];

        // Generar la habitación inicial para el jugador
        const playerRoom = this.generateRoom(mapWidth, mapHeight);
        rooms.push(playerRoom);

        // Generar habitación especial con el objeto para avanzar de nivel
        const exitRoom = this.generateExitRoom(mapWidth, mapHeight);
        rooms.push(exitRoom);

        // Definir la cantidad de habitaciones intermedias
        const numIntermediateRooms = Phaser.Math.Between(5, 10);

        // Generar habitaciones intermedias
        for (let i = 0; i < numIntermediateRooms; i++) {
            const newRoom = this.generateRoom(mapWidth, mapHeight);
            rooms.push(newRoom);
        }

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
        const playerSpawnX = playerRoom.centerX * tileSize;
        const playerSpawnY = playerRoom.centerY * tileSize;
        this.player = this.add.sprite(playerSpawnX, playerSpawnY, 'player').setOrigin(0);

        // Lógica adicional según las necesidades del juego, como colocar puertas, enemigos, cofres, etc.
    }

    generateRoom(mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(5, 10);
        const roomHeight = Phaser.Math.Between(5, 10);
        const startX = Phaser.Math.Between(1, mapWidth - roomWidth - 1);
        const startY = Phaser.Math.Between(1, mapHeight - roomHeight - 1);

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

    generateExitRoom(mapWidth, mapHeight) {
        const roomWidth = Phaser.Math.Between(5, 10);
        const roomHeight = Phaser.Math.Between(5, 10);
        const startX = mapWidth - roomWidth - 1;
        const startY = mapHeight - roomHeight - 1;

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

        // Colocar el objeto especial en una posición aleatoria dentro de la habitación especial
        const specialItemX = Phaser.Math.Between(startX + 1, startX + roomWidth - 2);
        const specialItemY = Phaser.Math.Between(startY + 1, startY + roomHeight - 2);
        tiles[specialItemY - startY][specialItemX - startX] = 'specialItem';

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

        // Definir el tamaño de la puerta (en tiles)
        const doorSize = 2; // Tamaño de la puerta en tiles

        // Elegir un punto aleatorio en las paredes de cada habitación para la puerta
        let pointA, pointB;

        if (horizontal) {
            // Conexión horizontal
            pointA = {
                x: Phaser.Math.Between(roomA.x + 1, roomA.x + roomA.width - doorSize - 1),
                y: Phaser.Math.Between(centerA.y - 1, centerA.y)
            };
            pointB = {
                x: Phaser.Math.Between(roomB.x + doorSize, roomB.x + roomB.width - 2),
                y: Phaser.Math.Between(centerB.y, centerB.y + 1)
            };
        } else {
            // Conexión vertical
            pointA = {
                x: Phaser.Math.Between(centerA.x - 1, centerA.x),
                y: Phaser.Math.Between(roomA.y + 1, roomA.y + roomA.height - doorSize - 1)
            };
            pointB = {
                x: Phaser.Math.Between(centerB.x, centerB.x + 1),
                y: Phaser.Math.Between(roomB.y + doorSize, roomB.y + roomB.height - 2)
            };
        }

        // Colocar la puerta en roomA
        for (let i = 0; i < doorSize; i++) {
            if (horizontal) {
                roomA.tiles[pointA.y - roomA.y][pointA.x - roomA.x + i] = 'door';
            } else {
                roomA.tiles[pointA.y - roomA.y + i][pointA.x - roomA.x] = 'door';
            }
        }

        // Colocar la puerta en roomB
        for (let i = 0; i < doorSize; i++) {
            if (horizontal) {
                roomB.tiles[pointB.y - roomB.y][pointB.x - roomB.x + i] = 'door';
            } else {
                roomB.tiles[pointB.y - roomB.y + i][pointB.x - roomB.x] = 'door';
            }
        }
    }
}