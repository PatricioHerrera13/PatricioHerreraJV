// URL to explain PHASER scene: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scene/

export default class Game extends Phaser.Scene {
    constructor() {
        super("main");

        // Definir el tamaño del mapa y el tamaño de las habitaciones
        this.mapWidth = 40;
        this.mapHeight = 40;
        this.roomMinSize = 4;  // Tamaño mínimo de la habitación en tiles
        this.roomMaxSize = 8;  // Tamaño máximo de la habitación en tiles
        this.maxRooms = Phaser.Math.Between(10, 50);  // Número aleatorio de habitaciones
        this.rooms = [];  // Arreglo para almacenar las habitaciones generadas
        this.usedDoors = new Set();  // Conjunto para puertas ya utilizadas para generar pasillos
        this.roomCount = 0;  // Contador de habitaciones generadas
    }

    preload() {
        // Cargar spritesheets y otras imágenes necesarias
        this.load.spritesheet('wall', 'public/wall.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('floor', 'public/floor.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('door', 'public/door.png', { frameWidth: 25, frameHeight: 25 });
    }

    create() {
        // Generar la primera habitación inicial
        this.generateNextRoom();
    }

    generateNextRoom() {
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
        }
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
                // Crear la puerta
                this.add.sprite(doorPos.x * 25, doorPos.y * 25, 'door');
                this.usedDoors.add(doorKey);
            }
        }
    }

    checkRoomOverlap(newRoom) {
        // Verificar si una nueva habitación se superpone o contiene a otras habitaciones
        for (let room of this.rooms) {
            if (newRoom.x < room.x + room.width &&
                newRoom.x + newRoom.width > room.x &&
                newRoom.y < room.y + room.height &&
                newRoom.y + newRoom.height > room.y) {
                return true; // Se superpone o contiene a otra habitación
            }
        }
        return false; // No se superpone ni contiene a otras habitaciones
    }

    createRoom(room) {
        // Dibujar la habitación en el mapa
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let y = room.y; y < room.y + room.height; y++) {
                // Colocar suelo en todas las posiciones de la habitación
                this.add.sprite(x * 25, y * 25, 'floor');

                // Colocar paredes solo en el borde exterior de la habitación
                if (x === room.x || x === room.x + room.width - 1 || y === room.y || y === room.y + room.height - 1) {
                    this.add.sprite(x * 25, y * 25, 'wall');
                }
            }
        }
    }
}
