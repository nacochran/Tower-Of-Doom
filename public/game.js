
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
    this.maxSpeed = 5; // max speed of the player
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
    var translationMatrix = m4.translation(this.pos.x, this.pos.y, this.pos.z);

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
    if (activateLeft && Math.abs(this.vel.x) < this.maxSpeed) {
        this.acc.x = -0.2;
        this.acc.x -= (this.vel.x > 0) ? this.dragForce/2 : 0;
    } else if (activateRight && Math.abs(this.vel.x) < this.maxSpeed) {
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
    if (activateUp && Math.abs(this.vel.z) < this.maxSpeed) {
      this.acc.z = -0.2;
      this.acc.z -= (this.vel.z > 0) ? this.dragForce/2 : 0;
    } else if (activateDown && Math.abs(this.vel.z) < this.maxSpeed) {
        this.acc.z = 0.2;
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
  }

  createGeometry() {
    var colors = [
          [55, 207, 25], // Front face color
          [55, 207, 25],   // Back face color
          [55, 207, 25],  // Top face color
          [55, 207, 25],  // Bottom face color
          [55, 207, 25],  // Right face color
          [55, 207, 25]  // Left face color
        ];

    var s = this.size.x;
    cube(-s/2, -s/2, -s/2, s, colors, this);
  }

  // rotate counterclockwise / clockwise
  rotate(activateLeft, activateRight) {
    if (activateLeft) {
      this.rot.y++;
    } else if (activateRight) {
      this.rot.y--;
    }
  }

  update() {
    // orientation player
    //this.rotate(keys.pressed('left'), keys.pressed('right'));

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

    // move and collide z
    this.updateZ(keys.pressed('up'), keys.pressed('down'));
    blocks.forEach(block => {
      block.collideZ(this);
    });

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
  }

  createGeometry() {
    var colors = [];
    switch (this.type) {
      case 'stone':
        colors = [
          [200, 200, 200], // Front face color
          [200, 200, 200],   // Back face color
          [200, 200, 200],  // Top face color
          [200, 200, 200],  // Bottom face color
          [200, 200, 200],  // Right face color
          [200, 200, 200]  // Left face color
        ];
    }
    var s = this.size.x;
    cube(-s/2, -s/2, -s/2, s, colors, this);
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
          obj.pos.y = this.pos.y + obj.size.y;
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
    console.log(this.target);
    console.log(this.rotation);
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
    console.log(this.rotation);

    this.updateTarget();
    console.log(this.target);
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
    return this.current[selector];
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
