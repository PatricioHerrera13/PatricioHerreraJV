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
        this.cursors = null; // Inicializar cursors en null
        this.projectiles = []; // Arreglo para almacenar los proyectiles
        this.enemies = []; // Arreglo para almacenar los enemigos
    }        

    preload() {
        // Cargar spritesheets y otras imágenes necesarias
        this.load.spritesheet('wall', 'public/wall.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('floor', 'public/floor.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('door', 'public/door.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('player', 'public/player.png', { frameWidth: 25, frameHeight: 25 });
        this.load.spritesheet('projectile', 'public/projectiles.png', { frameWidth: 10, frameHeight: 10 });
        this.load.spritesheet('enemy', 'public/enemy.png', { frameWidth: 25, frameHeight: 25 }); // Cargar el sprite del enemigo
    }

    create() {
        // Crear grupos para manejar las capas
        this.wallLayer = this.physics.add.staticGroup();
        this.floorLayer = this.add.group();
        this.projectileLayer = this.physics.add.group(); // Grupo para los proyectiles
        this.enemies = this.physics.add.group();

        // Generar la primera habitación inicial
        this.generateFirstRoom();
    
        // Verificar si el jugador ya ha sido colocado en una habitación
        if (!this.playerSpawned && this.rooms.length > 0) {
            let firstRoom = this.rooms[0];
            // Colocar al jugador en el centro de la primera habitación generada
            this.player = this.physics.add.sprite((firstRoom.x + firstRoom.width / 2) * 25, (firstRoom.y + firstRoom.height / 2) * 25, 'player');
            this.player.setDepth(10); // Asegurar que el jugador esté sobre los demás elementos
            this.playerSpawned = true;

            // Configurar el cuerpo físico del jugador
            this.player.body.setSize(20, 20);
            this.player.body.setCollideWorldBounds(true); // Colisionar con los límites del mundo
            
            // Colisionar con las paredes estáticas
            this.physics.add.collider(this.player, this.wallLayer);
        }
    
        // Configurar el clic izquierdo del ratón para disparar proyectiles
        this.input.on('pointerdown', (pointer) => {
        if (pointer.leftButtonDown()) {
            this.shootProjectile(pointer.worldX, pointer.worldY);
        }
        });
        
        this.cursors = this.input.keyboard.createCursorKeys();

        // Colisiones de proyectiles con paredes
        this.physics.add.collider(this.projectileLayer, this.wallLayer, (projectile, wall) => {
        projectile.destroy();
        });

        // Hacer que la cámara siga al jugador
        this.cameras.main.startFollow(this.player);
        // Configurar límites de la cámara
        this.cameras.main.setBounds(0, 0, this.mapWidth * 25, this.mapHeight * 25);
    }    

    update() {
        // Mover el jugador con las teclas W, A, S, D
        const playerSpeed = 150; // Velocidad del jugador

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-playerSpeed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(playerSpeed);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-playerSpeed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(playerSpeed);
        } else {
            this.player.setVelocityY(0);
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

    shootProjectile(targetX, targetY) {
        const projectileSpeed = 300; // Velocidad del proyectil
    
        // Calcular la dirección hacia la que apunta el proyectil
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
    
        // Crear el proyectil en la posición del jugador
        const projectile = this.physics.add.sprite(this.player.x, this.player.y, 'projectile');
    
        // Habilitar física y ajustar el tamaño del cuerpo de colisión
        projectile.setOrigin(0.5, 0.5);
        this.physics.add.existing(projectile);
        projectile.body.setSize(8, 8, true);
    
        // Ajustar la rotación del proyectil para que apunte en la dirección correcta
        projectile.rotation = angle;
    
        // Establecer la velocidad del proyectil en función del ángulo calculado
        this.physics.velocityFromRotation(angle, projectileSpeed, projectile.body.velocity);
    
        // Agregar el proyectil al grupo y al arreglo de proyectiles
        this.projectileLayer.add(projectile);
        this.projectiles.push(projectile);
    
        // Destruir el proyectil después de un tiempo
        this.time.delayedCall(2000, () => {
            projectile.destroy();
            this.projectiles = this.projectiles.filter(p => p !== projectile);
        });
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
    
        for (let distance = 0; distance <= 30; distance++) {
            if (!isPositionOccupiedByRoom(roomX, roomY) && !this.checkRoomOverlap(newRoom)) {
                this.createRoom(newRoom);
                this.rooms.push(newRoom);
                this.roomCount++;
                console.log(`Habitación emergente generada en (${roomX}, ${roomY}) de tamaño ${roomWidth}x${roomHeight}`);
    
                // Generar una puerta en el lado de la habitación adyacente al pasillo
                this.generateDoorForEmergentRoom(newRoom, door, preferredDirection);
    
                // Generar enemigos en la habitación generada
                this.generateEnemies(newRoom);
    
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
    
    generateEnemies(room) {
        const numEnemies = 5;
    
        // Asegurarse de que this.enemies es un grupo válido
        if (!this.enemies) {
            this.enemies = this.physics.add.group();
        }
    
        for (let i = 0; i < numEnemies; i++) {
            // Obtener una posición aleatoria dentro de la habitación
            const x = Phaser.Math.Between(room.x, room.x + room.width - 1);
            const y = Phaser.Math.Between(room.y, room.y + room.height - 1);
    
            // Crear un enemigo en la posición aleatoria
            const enemy = this.physics.add.sprite(x, y, 'enemy');
            this.enemies.add(enemy); // Agregar el enemigo al grupo de enemigos
    
            // Configurar física del enemigo
            this.physics.add.existing(enemy);
            enemy.body.setSize(25, 25); // Ajustar tamaño del cuerpo de colisión del enemigo
    
            // Seguir al jugador
            this.physics.moveToObject(enemy, this.player, 100);
    
            // Colisión con proyectiles
            this.physics.add.overlap(this.projectiles, enemy, (projectile, enemy) => {
                projectile.destroy(); // Destruir el proyectil
                enemy.destroy(); // Destruir el enemigo
                this.enemies.remove(enemy); // Remover el enemigo del grupo de enemigos
            });
    
            // Colisión con el jugador
            this.physics.add.overlap(this.player, enemy, () => {
                this.scene.start('END'); // Activar la escena END si el jugador colisiona con un enemigo
            });
        }
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

    enemiesSpawned() {
        const numEnemies = 5;
    
        // Generar enemigos
        for (let i = 0; i < numEnemies; i++) {
            // Obtener una posición aleatoria dentro de la habitación generada
            const { x, y } = this.generateNextRoom(); // Suponiendo que generateNextRoom devuelve las coordenadas x e y válidas
    
            // Crear un enemigo en la posición generada
            const enemy = this.physics.add.sprite(x, y, 'enemy');
            enemy.setOrigin(0.5, 0.5);
            this.enemies.add(enemy); // Agregar el enemigo al grupo de enemigos
    
            // Configurar la física del enemigo
            this.physics.add.existing(enemy);
            enemy.body.setSize(25, 25); // Ajustar el tamaño del cuerpo de colisión del enemigo
    
            // Seguir al jugador
            this.physics.moveToObject(enemy, this.player, 100);
    
            // Colisiones con proyectiles
            this.physics.add.overlap(this.projectiles, enemy, (projectile, enemy) => {
                projectile.destroy(); // Destruir el proyectil
                enemy.destroy(); // Destruir el enemigo
                this.enemies.remove(enemy); // Remover el enemigo del grupo de enemigos
            });
    
            // Colisión con el jugador
            this.physics.add.overlap(this.player, enemy, () => {
                this.scene.start('END'); // Activar la escena END si el jugador colisiona con un enemigo
            });
        }
    }    
}
