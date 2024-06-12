"use strict";

// global variables
var keys, camera;
var render, refillBuffers;

// lighting
var ambientLight = [1.0, 1.0, 1.0, 0.5];
var directionalLight = m4.normalize([0.5, 0.7, 1]);
var pointLight = [100, 330, 400];

// Adjust radius, height increment, and number of turns
const spiralStaircase = {
  curvatureConstant: 1
 };

 function mapVertexToCurve(vertex) {
  const x = vertex[0];
  const y = vertex[1];
  const z = vertex[2];

  // Calculate the radius
  const radius = x;

  // Calculate theta based on z
  const theta = z * spiralStaircase.curvatureConstant;

  // Calculate the new x and z coordinates
  const newX = Math.cos(theta) * radius;
  const newZ = Math.sin(theta) * radius;

  // Calculate the new y coordinate
  const newY = y; // You can adjust this based on your requirements

  return [newX, newY, newZ];
}


// Test with a simple vertex
const vertex = [25, 0, Math.PI/2, 1];
const transformedVertex = mapVertexToCurve(vertex);
console.log(transformedVertex);


function setupWebGL() {

  // Get A WebGL context
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);
  var spiralProgram = webglUtils.createProgramFromScripts(gl, ["spiral-vertex-shader", "fragment-shader-3d"]);


   // Store the shader programs
   var shaders = {
    normal: {
      program: program,
      attribLocations: {
        position: gl.getAttribLocation(program, "a_position"),
        color: gl.getAttribLocation(program, "a_color"),
        normal: gl.getAttribLocation(program, "a_normal"),
      },
      uniformLocations: {
        viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
        worldMatrix: gl.getUniformLocation(program, "u_world"),
        worldMatrixInverseTranspose: gl.getUniformLocation(program, "u_worldMatrixInverseTranspose"),
        lightWorldPosition: gl.getUniformLocation(program, "u_lightWorldPosition"),
        ambientLight: gl.getUniformLocation(program, "u_ambientLight"),
        reverseLightDirection: gl.getUniformLocation(program, "u_reverseLightDirection"),
      }
    },
    spiral: {
      program: spiralProgram,
      attribLocations: {
        position: gl.getAttribLocation(spiralProgram, "a_position"),
        color: gl.getAttribLocation(spiralProgram, "a_color"),
        normal: gl.getAttribLocation(spiralProgram, "a_normal"),
      },
      uniformLocations: {
        viewMatrix: gl.getUniformLocation(spiralProgram, "u_viewMatrix"),
        worldMatrix: gl.getUniformLocation(spiralProgram, "u_world"),
        worldMatrixInverseTranspose: gl.getUniformLocation(spiralProgram, "u_worldMatrixInverseTranspose"),
        lightWorldPosition: gl.getUniformLocation(spiralProgram, "u_lightWorldPosition"),
        ambientLight: gl.getUniformLocation(spiralProgram, "u_ambientLight"),
        reverseLightDirection: gl.getUniformLocation(spiralProgram, "u_reverseLightDirection"),
        spiralRadius: gl.getUniformLocation(spiralProgram, "u_spiralRadius"),
        spiralHeight: gl.getUniformLocation(spiralProgram, "u_spiralHeight"),
      }
    }
  };
  
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
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    let startIndex = 0;
    gl_objects.forEach(object => {
      var shader = (object.type === 'spiral') ? shaders.spiral : shaders.normal;
      gl.useProgram(shader.program);

      gl.enableVertexAttribArray(shader.attribLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(shader.attribLocations.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.vertexAttribPointer(shader.attribLocations.color, 3, gl.UNSIGNED_BYTE, true, 0, 0);

      gl.enableVertexAttribArray(shader.attribLocations.normal);
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.vertexAttribPointer(shader.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);

      var viewMatrix = camera.view(gl);
      gl.uniformMatrix4fv(shader.uniformLocations.viewMatrix, false, viewMatrix);
      gl.uniform4fv(shader.uniformLocations.ambientLight, ambientLight);
      gl.uniform3fv(shader.uniformLocations.reverseLightDirection, directionalLight);
      gl.uniform3fv(shader.uniformLocations.lightWorldPosition, pointLight);

      var worldMatrix = (object.targetObject === undefined) ? (m4.identity()) : (object.targetObject.tMatrix);
      gl.uniformMatrix4fv(shader.uniformLocations.worldMatrix, false, worldMatrix);

      var matrixInverse = m4.inverse(worldMatrix);
      var matrixInverseTranspose = m4.transpose(matrixInverse);
      gl.uniformMatrix4fv(shader.uniformLocations.worldMatrixInverseTranspose, false, matrixInverseTranspose);

      var primitiveType = gl[object.primitiveType];
      var offset = startIndex;
      var count = object.positions.length / 3;
      gl.drawArrays(primitiveType, offset, count);

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
      // add camera
      camera = new Camera({
        position: [600, 150, 1250],
        target: [400, 0, 100]
      });

      // add the players
      player = new Player({
        x: 600,
        y: 0,
        z: 0,
        width: 50,
        height: 50,
        depth: 5,
        renderType: "spiral"
      });

      // add some blocks
      for (var j = 0; j < 100; j++) {
        blocks.push(new Block({
          x: 500,
          y: -100, 
          z: 400 - j * 18,
          width: 300,
          height: 25,
          depth: 18,
          renderType: "spiral"
        }));
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
      cylinder(0, -900, 0, 450, 300, colorsArrayForEachFace);
      cylinder(0, -600, 0, 400, 300, colorsArrayForEachFace);
      cylinder(0, -300, 0, 350, 300, colorsArrayForEachFace);
      cylinder(0, 0, 0, 300, 300, colorsArrayForEachFace);
      cylinder(0, 300, 0, 250, 300, colorsArrayForEachFace);
      cylinder(0, 600, 0, 200, 300, colorsArrayForEachFace);
      cylinder(0, 900, 0, 150, 300, colorsArrayForEachFace);
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

    // render geometry using WebGL pipeline
    render();
  }
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
