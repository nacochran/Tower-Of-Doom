"use strict";

// global variables
var gl;
var keys, camera;
var render, refillBuffers, buffer_regular, buffer_texture;

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

let textures = {};
function createTextureFromSrc(src) {
  // Create a texture.
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));
  // Asynchronously load an image
  var image = new Image();
  image.crossOrigin = "anonymous"; // enable CORS
  image.src = src;
  image.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  });
  return texture;
}
function createCheckboardTexture(texSize) {
  // Initialize image1 as a 2D array of Float32Array
  var image1 = Array.from({ length: texSize }, () => 
      Array.from({ length: texSize }, () => new Float32Array(4))
  );

  // Populate image1 with checkerboard pattern
  for (var i = 0; i < texSize; i++) {
      for (var j = 0; j < texSize; j++) {
          var c = (((i & 0x8) == 0) ^ ((j & 0x8) == 0)) ? 1 : 0;
          image1[i][j] = [c, c, c, 1];
      }
  }

  // Convert floats to unsigned bytes for texture
  var image2 = new Uint8Array(4 * texSize * texSize);
  for (var i = 0; i < texSize; i++) {
      for (var j = 0; j < texSize; j++) {
          for (var k = 0; k < 4; k++) {
              image2[4 * texSize * i + 4 * j + k] = Math.floor(255 * image1[i][j][k]);
          }
      }
  }

  return image2;
}


function setupTextures() {
  textures["F_texture"] = createTextureFromSrc("https://webglfundamentals.org/webgl/resources/f-texture.png");
}

function setupWebGL() {

  // Get A WebGL context
  var canvas = document.querySelector("#canvas");
  gl = canvas.getContext("webgl");
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
        texture: gl.getAttribLocation(program, "a_texcoord")
      },
      uniformLocations: {
        viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
        worldMatrix: gl.getUniformLocation(program, "u_world"),
        worldMatrixInverseTranspose: gl.getUniformLocation(program, "u_worldMatrixInverseTranspose"),
        lightWorldPosition: gl.getUniformLocation(program, "u_lightWorldPosition"),
        ambientLight: gl.getUniformLocation(program, "u_ambientLight"),
        reverseLightDirection: gl.getUniformLocation(program, "u_reverseLightDirection"),
        textureMap: gl.getUniformLocation(program, "u_texture"),
        useTexture: gl.getUniformLocation(program, "u_useTexture")
      }
    },
    spiral: {
      program: spiralProgram,
      attribLocations: {
        position: gl.getAttribLocation(spiralProgram, "a_position"),
        color: gl.getAttribLocation(spiralProgram, "a_color"),
        normal: gl.getAttribLocation(spiralProgram, "a_normal"),
        texture: gl.getAttribLocation(program, "a_texcoord")
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
        textureMap: gl.getUniformLocation(program, "u_texture"),
        useTexture: gl.getUniformLocation(program, "u_useTexture")
      }
    }
  };
  
  // for gl_objects (non-textured)
  buffer_regular = {
    "positionBuffer" : gl.createBuffer(),
    "colorBuffer" : gl.createBuffer(),
    "normalBuffer" : gl.createBuffer(),
    "textureBuffer" : gl.createBuffer()
  };
  buffer_texture = {
    "positionBuffer" : gl.createBuffer(),
    "colorBuffer" : gl.createBuffer(),
    "normalBuffer" : gl.createBuffer(),
    "textureBuffer" : gl.createBuffer()
  };

  refillBuffers = function(arr, b, txt = false) {
    let combinedPositions = [];
    let combinedColors = [];
    let combinedNormals = [];
    let combinedTextures = [];

    arr.forEach(obj => {
      combinedPositions.push(...obj.positions);
      combinedColors.push(...obj.colors);
      combinedNormals.push(...obj.normals);
      combinedTextures.push(...obj.textures);
    });

    // Refill buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, b.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedPositions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(combinedColors), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, b.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedNormals), gl.STATIC_DRAW);

    if (txt) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.textureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedTextures), gl.STATIC_DRAW);
    }
  };

  let renderObjects = function(arr, b, txt = false) {
    let startIndex = 0;

    arr.forEach(object => {
      var shader = (object.type === 'spiral') ? shaders.spiral : shaders.normal;
      gl.useProgram(shader.program);

      gl.enableVertexAttribArray(shader.attribLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.positionBuffer);
      gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(shader.attribLocations.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBuffer);
      gl.vertexAttribPointer(shader.attribLocations.color, 3, gl.UNSIGNED_BYTE, true, 0, 0);

      gl.enableVertexAttribArray(shader.attribLocations.normal);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.normalBuffer);
      gl.vertexAttribPointer(shader.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(shader.attribLocations.texture);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.textureBuffer);
      gl.vertexAttribPointer(shader.attribLocations.texture, 2, gl.FLOAT, false, 0, 0);

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

      if (txt) {
        // rebind the texture
        gl.bindTexture(gl.TEXTURE_2D, object.textureMap);
        gl.uniform1i(shader.uniformLocations.textureMap, 0);
        gl.uniform1i(shader.uniformLocations.useTexture, true);
      } else {
        gl.uniform1i(shader.uniformLocations.useTexture, false);
      }

      var primitiveType = gl[object.primitiveType];
      var offset = startIndex;
      var count = object.positions.length / 3;
      gl.drawArrays(primitiveType, offset, count);

      startIndex += count;
    });
  }

  /** Create Renderer **/
  render = function() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    
    renderObjects(gl_t_objects, buffer_texture, true);
    renderObjects(gl_objects, buffer_regular);
  }

  // initalize empty buffers
  refillBuffers(gl_t_objects, buffer_texture, true);
  refillBuffers(gl_objects, buffer_regular);
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

      // // add the players
      player = new Player({
        x: 625,
        y: 0,
        z: 410,
        width: 50,
        height: 50,
        depth: 5,
        renderType: "spiral"
      });

      // // add some blocks
      // for (var j = 0; j < 100; j++) {
      //   blocks.push(new Block({
      //     x: 500,
      //     y: -100, 
      //     z: 400 - j * 18,
      //     width: 300,
      //     height: 25,
      //     depth: 18,
      //     renderType: "spiral"
      //   }));
      // }
    },
    createGeometry: function() {
      // loop through each block and add its geometry
      blocks.forEach((b) => {
        b.createGeometry();
      });

      // add the player's geometry
      //player.createGeometry();

      
      var colors = [
        [200, 200, 200], // Front face color
        [200, 200, 200],   // Back face color
        [200, 200, 200],  // Top face color
        [200, 200, 200],  // Bottom face color
        [200, 200, 200],  // Right face color
        [200, 200, 200]  // Left face color
      ],
      colors2 = [
        [200, 200, 20], // Front face color
        [200, 200, 20],   // Back face color
        [200, 200, 20],  // Top face color
        [200, 200, 20],  // Bottom face color
        [200, 200, 20],  // Right face color
        [200, 200, 20]  // Left face color
      ];

      wipeTextures();
      rectangularPrism(0, 0, 0, 100, 300, 300, colors);
      setTexture(textures["F_texture"]);
      rectangularPrism(850, 0, 0, 150, 150, 150, colors2);

      wipeTextures();
      rectangularPrism(-300, 0, 0, 100, 300, 300, colors);
      cube(600, 300, 0, 50, colors2);

      // add some extra cool graphics
      // Define the light brown color
      // var lightBrown = [210, 180, 140];
      // var colorsArrayForEachFace = [lightBrown, lightBrown, lightBrown];
      // cylinder(0, -1400, 0, 500, 1000, colorsArrayForEachFace);
      // cylinder(0, -900, 0, 450, 300, colorsArrayForEachFace);
      // cylinder(0, -600, 0, 400, 300, colorsArrayForEachFace);
      // cylinder(0, -300, 0, 350, 300, colorsArrayForEachFace);
      // cylinder(0, 0, 0, 300, 300, colorsArrayForEachFace);
      // cylinder(0, 300, 0, 250, 300, colorsArrayForEachFace);
      // cylinder(0, 600, 0, 200, 300, colorsArrayForEachFace);
      // cylinder(0, 900, 0, 150, 300, colorsArrayForEachFace);
    }
  }));
}

function main() {
  setupWebGL();

  setupTextures();

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
    //player.update();

    // render geometry using WebGL pipeline
    render();
  }
}

// initalize program
main();

// animation loop
function animate() {
  if (loop) {
    runGame();
    requestAnimationFrame(animate); 
  }
}

// Start the animation loop
animate();
