"use strict";

// global variables
var keys, camera;
var render, refillBuffers;

// lighting
var ambientLight = [1.0, 1.0, 1.0, 0.5];
var directionalLight = m4.normalize([0.5, 0.7, 1]);
var pointLight = [100, 330, 400];

function setupWebGL() {
  camera = new Camera();

  // Get A WebGL context
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var colorLocation = gl.getAttribLocation(program, "a_color");
  var normalLocation = gl.getAttribLocation(program, "a_normal");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
  var matrixInverseTransposeLocation = gl.getUniformLocation(program, "u_worldMatrixInverseTranspose");
  var lightWorldPositionLocation =
      gl.getUniformLocation(program, "u_lightWorldPosition");
  var worldLocation =
      gl.getUniformLocation(program, "u_world");
  var ambientLightLocation =
      gl.getUniformLocation(program, "u_ambientLight");
  var reverseLightDirectionLocation = 
      gl.getUniformLocation(program, "u_reverseLightDirection");

  // Create buffers
  var positionBuffer = gl.createBuffer();
  var colorBuffer = gl.createBuffer();
  var normalBuffer = gl.createBuffer();

  refillBuffers = function() {
    let combinedPositions = [];
    let combinedColors = [];
    let combinedNormals = [];

    gl_objects.forEach(obj => {
      combinedPositions.push(...obj.positions);
      combinedColors.push(...obj.colors);
      combinedNormals.push(...obj.normals);
    });

    // Refill buffers for triangles
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedPositions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(combinedColors), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedNormals), gl.STATIC_DRAW);
  };

  /** Create Renderer **/
  render = function() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Turn on culling. By default backfacing triangles
    // will be culled.
    gl.enable(gl.CULL_FACE);

    // Enable the depth buffer
    gl.enable(gl.DEPTH_TEST);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Turn on the color attribute
    gl.enableVertexAttribArray(colorLocation);

    // Bind the color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 3;                 // 3 components per iteration
    var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;               // start at the beginning of the buffer
    gl.vertexAttribPointer(
        colorLocation, size, type, normalize, stride, offset);

    // Turn on the normal attribute
    gl.enableVertexAttribArray(normalLocation);

    // Bind the normal buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    // Tell the attribute how to get data out of normalBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floating point values
    var normalize = false; // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        normalLocation, size, type, normalize, stride, offset);
    
    // calculate camera matrix
    var viewMatrix = camera.view(gl);
    gl.uniformMatrix4fv(matrixLocation, false, viewMatrix);

    // add ambient light
    gl.uniform4fv(ambientLightLocation,  ambientLight);

    // add directional light
    gl.uniform3fv(reverseLightDirectionLocation, directionalLight);

    // add point light
    gl.uniform3fv(lightWorldPositionLocation, pointLight);

    let startIndex = 0;
    gl_objects.forEach(object => {
      // calculate world matrix
      var worldMatrix = (object.targetObject === undefined) ? (m4.identity()) : (object.targetObject.tMatrix);
      //console.log(object.tMatrix);
      gl.uniformMatrix4fv(worldLocation, false, worldMatrix);

      // get the inverse of the world matrix
      var matrixInverse = m4.inverse(worldMatrix);
      var matrixInverseTranspose = m4.transpose(matrixInverse);
      gl.uniformMatrix4fv(matrixInverseTransposeLocation, false, matrixInverseTranspose);

      // Draw the geometry.
      var primitiveType = gl[object.primitiveType];
      var offset = startIndex;
      var count = object.positions.length / 3;
      gl.drawArrays(primitiveType, offset, count);

      // increase startIndex for next object
      startIndex += count;
    });
  }

  // initalize empty buffers
  refillBuffers();
}

/** Setup Key Manager **/
function setupKeyManager() {
  keys = new KeyManager();
  keys.register('up', 'Move Forward', 'ArrowUp');
  keys.register('down', 'Move Back', 'ArrowDown');
  keys.register('right', 'Move right', 'ArrowRight');
  keys.register('left', 'Move left', 'ArrowLeft');
  keys.register('space', 'Jump', " ");

  document.addEventListener('keydown', (event) => {
    keys.keyPressed(event.key);
  });
  document.addEventListener('keyup', (event) => {
    keys.keyReleased(event.key);
  });
}

/** Setup Levels **/
function setupLevels() {
  // Setup levels
  levels.push(new Level({
    name: "Test Level",
    design: function() {
      // add the players
      player = new Player({
        x: 0,
        y: 0,
        z: 0,
        width: 50,
        height: 50,
        depth: 50
      });

      // add some blocks
      for (var i = 0; i < 10; i ++) {
        for (var j = 0; j < 10; j++) {
          blocks.push(new Block({
            x: -100 + i * 50,
            y: -100, 
            z: 0 + j * 50,
            size: 50
          }));
        }
      }
    },
    createGeometry: function() {
      // loop through each block and add its geometry
      blocks.forEach((b) => {
        b.createGeometry();
      });

      // add the player's geometry
      player.createGeometry();

      // add some extra cool graphics
      // Define the light brown color
      var lightBrown = [210, 180, 140];
      var colorsArrayForEachFace = [lightBrown, lightBrown, lightBrown];
      cylinder(0, 100, 100, 100, 100, colorsArrayForEachFace);
    }
  }));
}

function main() {
  setupWebGL();

  setupKeyManager();

  setupLevels();
}
/** Game */
function runGame() {
  
  if (scene === 'menu') {
    // .. do stuff
  } else if (scene === 'game') {
    // Move Camera
    const moveSpeed = 2;  
    const rotationSpeed = 0.01;
    if (keys.pressed('w')) {
      camera.updatePosition(moveSpeed);
    } else if (keys.pressed('s')) {
      camera.updatePosition(-moveSpeed);
    }
    if (keys.pressed('a')) {
      camera.updateRotation(-rotationSpeed, 0);
    } else if (keys.pressed('d')) {
      camera.updateRotation(rotationSpeed, 0); 
    }

    // update blocks
    blocks.forEach(block => {
      block.update();
    });

    // update player
    player.update();
  }

  // render geometry using WebGL pipeline
  render();
  
}

// initalize program
main();

// animation loop
function animate() {
  
  runGame();
  requestAnimationFrame(animate); 
}

// Start the animation loop
animate();
