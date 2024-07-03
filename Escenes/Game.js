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
        this.generateFirstRoom();
    
        // Verificar si el jugador ya ha sido colocado en una habitación
        if (!this.playerSpawned && this.rooms.length > 0) {
            let firstRoom = this.rooms[0];
            // Colocar al jugador en el centro de la primera habitación generada
            this.player = this.physics.add.sprite((firstRoom.x + firstRoom.width / 2) * 25, (firstRoom.y + firstRoom.height / 2) * 25, 'player');
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
            }
        });
    
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
                } else {
                    this.floorLayer.add(this.add.sprite(x * 25, y * 25, 'floor'));
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