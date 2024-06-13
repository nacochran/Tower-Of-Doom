
// simple no-operation function
function noop() {
  console.log('Undefined function.');
}

// 3D box collide
// can be used to check for collisions between "bounding boxes" 
// and simple rectangular prisms
function boxCollide(b1, b2) {
  return (
          b1.pos.x + b1.size.x > b2.pos.x 
       && b1.pos.x < b2.pos.x + b2.size.x
       && b1.pos.y + b1.size.y > b2.pos.y
       && b1.pos.y < b2.pos.y + b2.size.y
       && b1.pos.z + b1.size.z > b2.pos.z
       && b1.pos.z < b2.pos.z + b2.size.z
  );
}

/* 
 * Game Class
 */
class Game {
  constructor (config) {
    this.levelData = config.levelData || [];
    this.mapPalette = config.mapPalette || {};
    this.level = 1;
    this.viewCamera = null;
    this.player1 = null;

    this.airFriction = 0.1;
    this.g = 0.2;

    this.entities = [];

    // intro variables
    this.phase = 'intro';
    this.iTime = 0;
    this.s = 0;
    this.o = 1;
    this.fSize = 150;

    // play variables
    this.gTime = 0;
    this.score = 0;
    this.cameraTrackSpeed = 25;

    this.blockSize = 18;
    this.startZ = 400;
    this.numBlocks = 100;
    this.endZ = 0;
    this.win = false;
  }

  intro() {
    this.iTime++;
    
    var iText = document.querySelectorAll('.countdown h1')[0];
    iText.style.transform =  `scale(${this.s})`;
    iText.style.display = 'block';

    let speed = 8,
        interval = 35,
        delay = 85;
    if (this.iTime < delay) {
      this.s = 0;
    } else if (this.iTime < delay + interval) {
      iText.textContent = '3';
      iText.style.opacity = '1';
      this.s += (1 - this.s) / speed;
    } else if (this.iTime < delay + interval*2) {
      this.s += (0 - this.s) / speed;
    } else if (this.iTime < delay + interval*3) {
      iText.textContent = '2';
      this.s += (1 - this.s) / speed;
    } else if (this.iTime < delay + interval*4) {
      this.s += (0 - this.s) / speed;
    } else if (this.iTime < delay + interval*5) {
      iText.textContent = '1';
      this.s += (1 - this.s) / speed;
    } else if (this.iTime < delay + interval*6) {
      this.s += (0 - this.s) / speed;
    } else if (this.iTime < delay + interval*7) {
      iText.textContent = 'Start!';
      this.s += (1 - this.s) / speed;
    } else if (this.iTime < delay + interval*8) {
      this.o -= 0.05;
      this.fSize += 2;
      iText.style.opacity = `${this.o.toString()}`;
      iText.style.fontSize = `${this.fSize.toString()}px`;
    } else {
      this.startTimer();
      this.cameraTrackSpeed = 2;
      this.phase = 'play';
      this.iTime = 0;
    }

  }

  startTimer() {
    var gTimeElement = document.querySelectorAll('.game-time h1')[0];
    gTimeElement.textContent = `Time: ${this.score}`;
    gTimeElement.style.display = 'block';
    setInterval(() => {
      if (this.phase === 'play') {
        this.gTime += 1;
        this.score = this.gTime; // Update score with gTime value

        var gTimeElement = document.querySelectorAll('.game-time h1')[0];
        if (gTimeElement) {
          gTimeElement.textContent = `Time: ${this.score}`;
        }
      }
    }, 1000); // 1000 milliseconds = 1 second
  }

  run() {
    if (this.phase === 'intro') {
      this.intro();
      keys.freeze = true;
    } else if (this.phase === 'play') {
      keys.freeze = false;
    } else if (this.phase === 'win screen') {
      keys.freeze = true;
      camera.setPosition(0, 0, 1600, 25);
      this.iTime++;

      if (this.iTime > 25) {
        camera.setTarget(0, 0, 100);
      }

      var gTimeElement = document.querySelectorAll('.game-time h1')[0];
      gTimeElement.style.display = "none";

      let screen = document.querySelectorAll('.end-screen')[0];
      screen.style.display = 'block';
      var screenText = document.querySelectorAll('.end-screen h1')[0];
      screenText.textContent = `You scored ${this.score}!`;
    } else if (this.phase === 'game over screen') {
      keys.freeze = true;
      camera.setPosition(0, 0, 1600, 25);
      this.iTime++;

      if (this.iTime > 25) {
        camera.setTarget(0, 0, 100);
      }

      var gTimeElement = document.querySelectorAll('.game-time h1')[0];
      gTimeElement.style.display = "none";

      let screen = document.querySelectorAll('.end-screen')[0];
      screen.style.display = 'block';
      var screenText = document.querySelectorAll('.end-screen h1')[0];
      screenText.textContent = "You Lost!";
    }

    // update blocks
    blocks.forEach(block => {
      block.update();
    });

    // update player
    player.update();

    // render geometry using WebGL pipeline
    render();
  }
}

let game = new Game({});

/* 
 * Actor Class
*/
class Actor {
  constructor(config) {
    // position and orientation
    this.pos = VL.new(config.x, config.y, config.z);
    this.size = VL.new(config.width || config.size, config.height || config.size, config.depth || config.size);
    this.rot = VL.new(0, 0, 0);
    // transformation matrix for transforming the vertices of geometry in world space
    this.tMatrix = config.tMatrix || m4.identity();

    // movement
    this.vel = VL.new(0, 0, 0);
    this.acc = VL.new(0, 0, 0);
    this.rotVel = VL.new(0, 0, 0);
    this.rotAcc = VL.new(0, 0, 0);
    this.tVel = 8; // terminal (free falling) velocity
    this.maxSpeedZ = 3; // max speed of the player
    this.maxSpeedX = 5; // max speed of the player
    this.dragForce = game.airFriction;

    // tracking collisions with objects
    this.onObject = false;
    this.onTime = 0;
  }

  setTransformationMatrix() {
    // Convert rotation angles from degrees to radians
    var angleX = degToRad(this.rot.x);
    var angleY = degToRad(this.rot.y);
    var angleZ = degToRad(this.rot.z);

    // Create rotation matrices for each axis
    var rotationX = m4.xRotation(angleX);
    var rotationY = m4.yRotation(angleY);
    var rotationZ = m4.zRotation(angleZ);

    // Multiply rotation matrices together to get the combined rotation matrix
    var rotationMatrix = m4.multiply(rotationZ, m4.multiply(rotationY, rotationX));

    // Create a translation matrix based on position
    var translationMatrix = m4.translation(this.pos.x + this.size.x/2, this.pos.y + this.size.y/2, this.pos.z + this.size.z/2);

    // Multiply rotation matrix by translation matrix to get the final transformation matrix
    var finalMatrix = m4.multiply(rotationMatrix, translationMatrix);
    this.tMatrix = finalMatrix;
  }

  applyGravity() {
    this.acc.y = (this.vel.y < this.tVel) ? -game.g : 0;
  }

  applyDrag() {
    this.onObject = (this.onTime++ > 5) ? false : this.onObject;
    this.dragForce = (this.onObject) ? this.dragForce : game.airFriction;
  }

  updateX(activateLeft, activateRight) {  
    if (activateLeft && Math.abs(this.vel.x) < this.maxSpeedX) {
        this.acc.x = -0.2;
        this.acc.x -= (this.vel.x > 0) ? this.dragForce/2 : 0;
    } else if (activateRight && Math.abs(this.vel.x) < this.maxSpeedX) {
        this.acc.x = 0.2;
        this.acc.x += (this.vel.x < 0) ? this.dragForce/2 : 0;
    } else if (Math.abs(this.vel.x) > this.dragForce) {
        this.acc.x = (this.vel.x < 0) ? this.dragForce : -this.dragForce;
    } else {
        this.vel.x = 0;
    }

    this.pos.x += this.vel.x;
    this.vel.x += this.acc.x;
  }

  updateY(activateJump) {
    if (activateJump && Math.abs(this.vel.y) < 0.1 && Math.abs(this.acc.y) < 0.1) {
        this.vel.y = 5;
    }

    this.applyGravity();

    this.pos.y += this.vel.y;
    this.vel.y += this.acc.y;
  }

  updateZ(activateUp, activateDown) {
    if (activateUp && Math.abs(this.vel.z) < this.maxSpeedZ) {
      this.acc.z = -0.1;
      this.acc.z -= (this.vel.z > 0) ? this.dragForce/2 : 0;
    } else if (activateDown && Math.abs(this.vel.z) < this.maxSpeedZ) {
        this.acc.z = 0.1;
        this.acc.z += (this.vel.z < 0) ? this.dragForce/2 : 0;
    } else if (Math.abs(this.vel.z) > this.dragForce) {
        this.acc.z = (this.vel.z < 0) ? this.dragForce : -this.dragForce;
    } else {
        this.vel.z = 0;
    }

    this.pos.z += this.vel.z;
    this.vel.z += this.acc.z;
  }
}

/*
 * Player Class
*/
class Player extends Actor {
  constructor(config) {
    super(config);

    this.renderType = config.renderType || 'normal';
  }

  createGeometry() {
    wipeTextures();
    // setTexture(textures["F_texture"]);

    var colors = [
          [55, 207, 25], // Front face color
          [55, 207, 25],   // Back face color
          [55, 207, 25],  // Top face color
          [55, 207, 25],  // Bottom face color
          [55, 207, 25],  // Right face color
          [55, 207, 25]  // Left face color
        ];
        
        rectangularPrism(
          -this.size.x/2, 
          -this.size.y/2, 
          -this.size.z/2, 
          this.size.x, 
          this.size.y, 
          this.size.z, 
          colors, 
          this
        );
  }

  update() {
    if (game.phase === 'intro' || game.phase === 'play') {
      // camera target
      let x1 = this.pos.x,
          y1 = this.pos.y,
          z1 = this.pos.z;
        // camera position
      let x2 = this.pos.x + 100,
          y2 = this.pos.y + 100,
          z2 = this.pos.z + 25;
      
      let r1 = x1, r2 = x2;
      let theta1 = degToRad(z1),
          theta2 = degToRad(z2);

      // set camera target
      let camTX = Math.cos(theta1) * r1;
      let camTZ = Math.sin(theta1) * r1;
      let camTY = y1 - theta1 * 100.0;
      camera.setTarget(camTX, camTY, camTZ);

      // set camera position
      let camX = Math.cos(theta2) * r2;
      let camZ = Math.sin(theta2) * r2;
      let camY = y2 - theta2 * 100.0;
      camera.setPosition(camX, camY, camZ, game.cameraTrackSpeed);
    }
    
    // move and collide y
    this.updateY(keys.pressed('space'));
    blocks.forEach(block => {
      block.collideY(this);
    });

    // apply drag for x-z movement
    this.applyDrag();

    // move and collide x
    this.updateX(keys.pressed('left'), keys.pressed('right'));
    blocks.forEach(block => {
      block.collideX(this);
    });
    this.pos.x = Math.max(this.pos.x, 425);

    // move and collide z
    this.updateZ(keys.pressed('up'), keys.pressed('down'));
    blocks.forEach(block => {
      block.collideZ(this);
    });

    if (this.pos.y < -175 && game.phase === 'play') {
      game.phase = 'game over screen';
    } else if (this.pos.z < game.endZ + game.blockSize && game.phase === 'play') {
      game.phase = 'win screen';
    }

    this.setTransformationMatrix();
  }
}

var player;

/* 
 * Block Class
*/
class Block extends Actor {
  constructor (config) {
    super(config);

    this.type = config.type || 'stone';
    this.renderType = config.renderType || 'regular';
  }

  createGeometry() {
    var colors = [ [], [], [], [], [], [] ];
    switch (this.type) {
      case 'stone':
        wipeTextures();
        colors = [
          [200, 200, 200], // Front face color
          [200, 200, 200],   // Back face color
          [200, 200, 200],  // Top face color
          [200, 200, 200],  // Bottom face color
          [200, 200, 200],  // Right face color
          [200, 200, 200]  // Left face color
        ];
      break;
      case 'banner':
        colors = [
          [255, 255, 255], // Front face color
          [255, 255, 255],   // Back face color
          [255, 255, 255],  // Top face color
          [255, 255, 255],  // Bottom face color
          [255, 255, 255],  // Right face color
          [255, 255, 255],  // Left face color
        ];
        setTexture([
          null,
          null,
          textures["checkboard"],
          null,
          null,
          null
        ]);
    }

    
    rectangularPrism(
      -this.size.x/2, 
      -this.size.y/2, 
      -this.size.z/2, 
      this.size.x, 
      this.size.y, 
      this.size.z, 
      colors, 
      this
    );
  }

  collideX(obj) {
    if (boxCollide(this, obj)) {
      if (obj.pos.x > this.pos.x && obj.vel.x < 0) {
        obj.pos.x = this.pos.x + this.size.x;
        obj.vel.x = 0;
      } else if (obj.pos.x < this.pos.x && obj.vel.x > 0) {
        obj.pos.x = this.pos.x - obj.size.x;
        obj.vel.x = 0;
      }
    }
  }

  collideY(obj) {
    if (boxCollide(this, obj)) {
      if (obj.pos.y < this.pos.y && obj.vel.y > 0) {
          obj.pos.y = this.pos.y - this.size.y;
          obj.vel.y *= -1;
      } else if (obj.pos.y > this.pos.y) {
          obj.pos.y = this.pos.y + this.size.y;
          obj.vel.y = 0;
          obj.acc.y = 0;
          obj.dragForce = 0.5;
          obj.onObject = true;
          obj.onTime = 0;
      }
    }
  }

  collideZ(obj) {
    if (boxCollide(this, obj)) {
      if (obj.pos.z > this.pos.z && obj.vel.z < 0) {
        obj.pos.z = this.pos.z + this.size.z;
        obj.vel.z = 0;
      } else if (obj.pos.z < this.pos.z && obj.vel.z > 0) {
        obj.pos.z = this.pos.z - obj.size.z;
        obj.vel.z = 0;
      }
    }
  }

  update() {
    this.setTransformationMatrix();
  }
}
let blocks = [];

/* 
 * Levels
*/
let levels = [];
let level = 1;

class Level {
  constructor (config) {
    this.design = config.design || noop;
    this.createGeometry = config.createGeometry || noop;
    this.name = config.name;
  }

  create() {
    this.design();
    this.createGeometry();
  }
}

/*
* Camera Class
*/
class Camera {
  constructor(config) {
    this.position = config.position;
    this.target = [0, 0, 0];
    this.rotation = [0, 0];
    this.setTarget(...config.target);
    // in radians
    this.fieldOfView = degToRad(60);
    this.zNear = 1;
    this.zFar = 2000;
  }

  view(gl) {
    // 1. Model --> View --> Projection
    // 2. Matrix multiplication goes right from left
    // gl_Position = projection * view * model * aPosition

    // Define the aspect ratio
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Compute the projection matrix
    var projectionMatrix = m4.perspective(this.fieldOfView, aspect, this.zNear, this.zFar);

    // Compute the view matrix
    var up = [0, 1, 0];
    var viewMatrix = m4.inverse(m4.lookAt(this.position, this.target, up));

    // Compute the final matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    return viewProjectionMatrix;
  }

  // updates target based on camera's position & angle
  updateTarget() {
    var yaw = Math.PI - this.rotation[0];
    var pitch = this.rotation[1];

    var direction = [
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(yaw)
    ];

    // Normalize the direction vector
    direction = normalize(direction);

    // Update the target position
    this.target = [
      this.position[0] + direction[0],
      this.position[1] + direction[1],
      this.position[2] + direction[2]
    ];
  }

  // sets target manually
  setTarget(x, y, z) {
    this.target = [x, y, z];

    // Calculate the direction vector from the position to the target
    var direction = subtractVectors(this.target, this.position);

    // Calculate the yaw and pitch angles
    var yaw = Math.atan2(direction[0], -direction[2]);
    var pitch = Math.atan2(direction[1], Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]));

    // Update the camera rotation
    this.rotation = [yaw, pitch];
  }

  setPosition(x, y, z, t = 0) {
    if (t === 0) {
      this.position[0] = x;
      this.position[1] = y;
      this.position[2] = z;
    } else  {
      this.position[0] += (x - this.position[0]) / t;
      this.position[1] += (y - this.position[1]) / t;
      this.position[2] += (z - this.position[2]) / t;
    }
  }

  updatePosition(speed) {
    // Calculate the direction vector from the position to the target
    var direction = subtractVectors(this.target, this.position);

    // Normalize the direction vector
    direction = normalize(direction);

    // Update the camera position by moving towards the target
    this.position[0] += speed * direction[0];
    this.position[1] += speed * direction[1];
    this.position[2] += speed * direction[2];

    // Update the target based on the new position
    this.updateTarget();
  }

  updateRotation(deltaX, deltaY) {
    this.rotation[0] += deltaX;
    this.rotation[1] += deltaY;

    this.updateTarget();
  }
}

/*
 * Keymanager Class
*/
class KeyManager {
  constructor() {
    this.keys = {};
    this.keyCodeMap = {};
    this.current = {};
    this.recording = false;
    this.inputData = [];
    this.records = [];
    this.freeze = false;
    
    // playing back a record
    this.playRecord = [];
    this.pressedKeys = [];
    this.playing = false;
    this.paused = false;
    this.time = 0;
    this.startTime = 0;
    this.completeRecord = false;
  }

  register(key, name, keyCode) {
    this.keys[key] = { keyCode: keyCode, name: name };
    this.keyCodeMap[keyCode] = key;
  }

  pressed(selector) {
    if(typeof selector === 'string') {
      if (this.keys[selector]) {
        selector = (
            this.keys[selector] &&
            this.keys[selector].keyCode
        );
      }
    }
    if (!selector) {
        return false;
    }
    return !this.freeze && this.current[selector];
  }

  keyPressed(keyCode) {
    if (!this.playing && !this.current[keyCode]) {
      this.current[keyCode] = true;
      if (this.recording) {
          var startTime = Date.now() - this.startTime;
          this.inputData.push({ keyCode: keyCode, startTime: startTime });
      }
    }
  }

  keyReleased(keyCode) {
    //println('key released: ' + this.keyCodeMap[keyCode] + ", date: " + (Date.now() - this.startTime));
            
    if (!this.playing && this.current[keyCode]) {
      delete this.current[keyCode];
      if (this.recording) {
          // Iterate over all recorded inputs
          for (var i = this.inputData.length - 1; i >= 0; i--) {
              var input = this.inputData[i];
              if (input.keyCode === keyCode && !input.endTime) {
                  // Set the end time for the corresponding key press
                  input.endTime = Date.now() - this.startTime;
                  break; // Stop iterating after setting the end time
              }
          }
      }
    }
  }
}
