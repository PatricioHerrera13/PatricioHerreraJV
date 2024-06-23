// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
      super("main");
    }


  
    preload() {
        // Cargar el spritesheet correcto con frames de 16x16
        this.load.spritesheet('tilemap', '../public/ohmydungeon_v1.1.png', {
          frameWidth: 16,
          frameHeight: 16,
        });
  
        // Cargar spritesheets para paredes, pisos, objetos, enemigos, etc.
        this.load.spritesheet('wall', 'assets/wall.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('floor', 'assets/floor.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 16, frameHeight: 16 });
        // Otros assets necesarios...
  
        // Cargar otras imágenes y recursos necesarios
        this.load.image('door', 'assets/door.png');
        this.load.image('chest', 'assets/chest.png');
        // Otros assets...
    }
    

      
        //this.cameras.main.startFollow(player);
    


    create() {
        const tileSize = 16; // Tamaño de cada celda en píxeles
        const mapWidth = 40; // Ancho total del mapa en celdas
        const mapHeight = 40; // Alto total del mapa en celdas
    
        // Ejemplo de generación de habitaciones y conexiones
        const rooms = []; // Array para almacenar información sobre cada habitación generada
    
        // Generar una habitación inicial para el jugador
        const playerRoom = this.generateRoom(mapWidth, mapHeight);
        rooms.push(playerRoom);
    
        // Generar habitaciones adicionales conectadas por puertas
        const numRooms = Phaser.Math.Between(10, 15); // Número aleatorio de habitaciones
        for (let i = 0; i < numRooms; i++) {
            const newRoom = this.generateRoom(mapWidth, mapHeight);
            // Conectar esta nueva habitación con una habitación existente
            const randomRoomIndex = Phaser.Math.Between(0, rooms.length - 1);
            this.connectRooms(rooms[randomRoomIndex], newRoom);
            rooms.push(newRoom);
        }
    
        // Lógica para posicionar sprites y crear el mapa basado en las habitaciones generadas
        rooms.forEach(room => {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    // Colocar sprites de pared, piso, puertas, etc., según la configuración de la habitación
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
        const roomWidth = Phaser.Math.Between(5, 10); // Ancho aleatorio de la habitación en celdas
        const roomHeight = Phaser.Math.Between(5, 10); // Alto aleatorio de la habitación en celdas
        const startX = Phaser.Math.Between(1, mapWidth - roomWidth - 1); // Posición aleatoria en el mapa
        const startY = Phaser.Math.Between(1, mapHeight - roomHeight - 1); // Posición aleatoria en el mapa
    
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
    
    connectRooms(roomA, roomB) {
        // Calcular la posición del centro de cada habitación
        const centerA = { x: roomA.centerX, y: roomA.centerY };
        const centerB = { x: roomB.centerX, y: roomB.centerY };
    
        // Determinar la dirección entre las dos habitaciones (horizontal o vertical)
        const horizontal = Phaser.Math.Between(0, 1) === 1; // True para horizontal, False para vertical
    
        // Definir el tamaño de la puerta (en tiles)
        const doorSize = 2; // Tamaño de la puerta en tiles
    
        // Elegir un punto aleatorio en las paredes de cada habitación para la puerta
        let pointA, pointB;
    
        if (horizontal) {
            // Conexión horizontal
            pointA = {
                x: Phaser.Math.Between(roomA.x + 1, roomA.x + roomA.width - doorSize - 1),
                y: Phaser.Math.Between(roomA.y + 1, roomA.y + roomA.height - 2)
            };
            pointB = {
                x: Phaser.Math.Between(roomB.x + doorSize, roomB.x + roomB.width - 2),
                y: Phaser.Math.Between(roomB.y + 1, roomB.y + roomB.height - 2)
            };
        } else {
            // Conexión vertical
            pointA = {
                x: Phaser.Math.Between(roomA.x + 1, roomA.x + roomA.width - 2),
                y: Phaser.Math.Between(roomA.y + 1, roomA.y + roomA.height - doorSize - 1)
            };
            pointB = {
                x: Phaser.Math.Between(roomB.x + 1, roomB.x + roomB.width - 2),
                y: Phaser.Math.Between(roomB.y + doorSize, roomB.y + roomB.height - 2)
            };
        }
    
        // Colocar la puerta en roomA
        for (let i = 0; i < doorSize; i++) {
            roomA.tiles[pointA.y - roomA.y][pointA.x - roomA.x + i] = 'door';
        }
    
        // Colocar la puerta en roomB
        for (let i = 0; i < doorSize; i++) {
            roomB.tiles[pointB.y - roomB.y][pointB.x - roomB.x + i] = 'door';
        }
    }


    update() {
        // Lógica de actualización del juego, por ejemplo, movimientos de jugador, colisiones, etc.
      
    }
    
    
}