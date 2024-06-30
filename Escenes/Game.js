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
        this.player = null; // Jugador
        this.doors = []; // Lista de puertas
        this.playerSpawned = false; // Bandera para asegurar que el jugador se coloque solo una vez
    }    

    preload() {
        // Cargar spritesheets y otras imágenes necesarias
        this.load.spritesheet('wall', 'public/wall.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('floor', 'public/floor.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('door', 'public/door.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('player', 'public/player.png', { frameWidth: 25, frameHeight: 25 });
    }

    create() {
        // Crear grupos para manejar las capas
        this.wallLayer = this.add.group();
        this.floorLayer = this.add.group();
    
        // Generar la primera habitación inicial
        this.generateNextRoom();
    
        // Verificar si el jugador ya ha sido colocado en una habitación
        if (!this.playerSpawned && this.rooms.length > 0) {
            let firstRoom = this.rooms[0];
            // Colocar al jugador en el centro de la primera habitación generada
            this.player = this.add.sprite((firstRoom.x + firstRoom.width / 2) * 25, (firstRoom.y + firstRoom.height / 2) * 25, 'player');
            this.player.setDepth(10); // Asegurar que el jugador esté sobre los demás elementos
            this.playerSpawned = true;
        }
    
        // Habilitar el control de teclado
        this.cursors = this.input.keyboard.createCursorKeys();
    
        // Hacer que la cámara siga al jugador
        this.cameras.main.startFollow(this.player);
        // Configurar límites de la cámara
        this.cameras.main.setBounds(0, 0, this.mapWidth * 25, this.mapHeight * 25);
    }    

    update() {
        // Mover el jugador con las teclas de flecha
        if (this.cursors.left.isDown) {
            this.player.x -= 2.5;
        } else if (this.cursors.right.isDown) {
            this.player.x += 2.5;
        }

        if (this.cursors.up.isDown) {
            this.player.y -= 2.5;
        } else if (this.cursors.down.isDown) {
            this.player.y += 2.5;
        }

        // Verificar si el jugador está sobre una puerta
        for (let door of this.doors) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 12.5) {
                if (!door.getData('used')) {
                    this.createPassage(door);
                    door.setData('used', true);
                }
            }
        }
    }

    generateNextRoom(connectedDoor = null) {
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
    
            if (connectedDoor) {
                // Mover la puerta a la nueva posición al final del pasillo
                connectedDoor.x = (roomX + roomWidth / 2) * 25;
                connectedDoor.y = (roomY + roomHeight / 2) * 25;
            }
    
            // Mensaje de consola para depuración
            console.log(`Habitación generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
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
        // Crear un pasillo de 3 tiles de ancho y 3 tiles de largo
        let passageLength = 3;
        let doorPos = door.getData('position');

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
                for (let x = doorPos.x - passageLength; x < doorPos.x; x++) {
                    if (x < 0 || isPositionOccupiedByRoom(x, doorPos.y)) {
                        break; // Fuera de los límites del mapa o posición ocupada por una habitación
                    }

                    // Dibujar el pasillo
                    this.floorLayer.add(this.add.sprite(x * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite(x * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite(x * 25, (doorPos.y + 1) * 25, 'wall'));
                }
                break;
            case 1: // Hacia la derecha
                for (let x = doorPos.x + 1; x <= doorPos.x + passageLength; x++) {
                    if (x >= this.mapWidth || isPositionOccupiedByRoom(x, doorPos.y)) {
                        break; // Fuera de los límites del mapa o posición ocupada por una habitación
                    }

                    // Dibujar el pasillo
                    this.floorLayer.add(this.add.sprite(x * 25, doorPos.y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite(x * 25, (doorPos.y - 1) * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite(x * 25, (doorPos.y + 1) * 25, 'wall'));
                }
                break;
            case 2: // Hacia arriba
                for (let y = doorPos.y - passageLength; y < doorPos.y; y++) {
                    if (y < 0 || isPositionOccupiedByRoom(doorPos.x, y)) {
                        break; // Fuera de los límites del mapa o posición ocupada por una habitación
                    }

                    // Dibujar el pasillo
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, y * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, y * 25, 'wall'));
                }
                break;
            case 3: // Hacia abajo
                for (let y = doorPos.y + 1; y <= doorPos.y + passageLength; y++) {
                    if (y >= this.mapHeight || isPositionOccupiedByRoom(doorPos.x, y)) {
                        break; // Fuera de los límites del mapa o posición ocupada por una habitación
                    }

                    // Dibujar el pasillo
                    this.floorLayer.add(this.add.sprite(doorPos.x * 25, y * 25, 'floor'));
                    this.wallLayer.add(this.add.sprite((doorPos.x - 1) * 25, y * 25, 'wall'));
                    this.wallLayer.add(this.add.sprite((doorPos.x + 1) * 25, y * 25, 'wall'));
                }
                break;
            default:
                console.error("Dirección de pasillo no válida.");
                return;
        }

        // Generar una nueva habitación conectada a la nueva puerta
        let endDoorPos = { x: doorPos.x, y: doorPos.y };
        this.generateNextRoom(endDoorPos);

        // Mensaje de consola para depuración
        console.log(`Nueva habitación generada conectada a (${endDoorPos.x}, ${endDoorPos.y})`);
    }

    createRoom(room) {
        // Dibujar los bordes de la habitación
        for (let x = room.x; x < room.x + room.width; x++) {
            for (let y = room.y; y < room.y + room.height; y++) {
                let isBorder = (x === room.x || x === room.x + room.width - 1 || y === room.y || y === room.y + room.height - 1);
                if (isBorder) {
                    this.wallLayer.add(this.add.sprite(x * 25, y * 25, 'wall'));
                } else {
                    this.floorLayer.add(this.add.sprite(x * 25, y * 25, 'floor'));
                }
            }
        }
    }

    checkRoomOverlap(newRoom) {
        // Verificar si la nueva habitación se superpone con alguna habitación existente
        for (let room of this.rooms) {
            if (newRoom.x < room.x + room.width && newRoom.x + newRoom.width > room.x &&
                newRoom.y < room.y + room.height && newRoom.y + newRoom.height > room.y) {
                return true; // Se superpone con otra habitación
            }
        }
        return false; // No se superpone con otras habitaciones
    }
}
