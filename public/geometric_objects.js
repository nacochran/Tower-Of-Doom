
// objects in this array are rendered without texturing
var gl_objects = [];

// objects in this array are rendered with texturing
var gl_t_objects = [];

var usingTexture = false,
    currentTexture = null;
function wipeTextures () { 
  usingTexture = false; 
  currentTexture = null;
};
function setTexture (txt) { 
    usingTexture = true;
    currentTexture = txt;
  };


function quad(x, y, z, width, height, color, surfaceDirection, targetObject) {
  // Create a new object to be rendered by WebGL
  let gl_object = {
    positions: [],
    colors: [],
    normals: [],
    textures: [],
    textureMap: null,
    targetObject: targetObject,
    primitiveType: 'TRIANGLES',
    type: (targetObject) ? targetObject.renderType : 'regular'
  };

  var vertices;
  var normal;
  var textureArr;

  switch (surfaceDirection) {
    case 'front':
      vertices = [
        x, y, z,
        x + width, y, z,
        x + width,  y + height,  z,
        x, y + height,  z,
      ];
      normal = [0, 0, 1];
      textureArr = [
        0, 1,
        1, 1,
        1, 0,
        0, 1,
        1, 0,
        0, 0,
      ];
      break;
    case 'back':
      vertices = [
        x, y, z,
        x, y + height, z,
        x + width, y + height, z,
        x + width, y, z
      ];
      normal = [0, 0, -1];
      textureArr = [
        // Back face
        1, 1,
        1, 0,
        0, 0,
        1, 1,
        0, 0,
        0, 1
      ];
      break;
    case 'top':
      vertices = [
        x, y, z,
        x, y, z + height,
        x + width, y, z + height,
        x + width, y, z
      ];
      normal = [0, 1, 0]; // Top face normal
      textureArr = [
        // Top face
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0
      ];
      break;
    case 'bottom':
      vertices = [
        // -hs, -hs, -hs,
        //      hs, -hs, -hs,
        //      hs, -hs,  hs,
        //     -hs, -hs,  hs,
        x, y, z,
        x + width, y, z,
        x + width, y, z + height,
        x, y, z + height
      ];
      normal = [0, -1, 0]; // Bottom face normal
      textureArr = [
        // Bottom face
        1, 0,
        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1
      ];
      break;
    case 'right':
      vertices = [
        x, y, z,
        x, y + height, z,
        x,  y + height, z + width,
        x, y, z + width
      ];
      normal = [1, 0, 0]; // Right face normal
      textureArr = [
        1, 0,
        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 1
      ];
      break;
    case 'left':
      vertices = [
        x, y, z,
        x, y, z + width,
        x, y + height, z + width,
        x, y + height, z
      ];
      normal = [-1, 0, 0]; // Left face normal
      textureArr = [
        0, 0,
        0, 1,
        1, 1,
        0, 0,
        1, 1,
        1, 0
      ];
      break;
    default:
      console.error('Invalid surface direction for quad.');
      return;
  }

  var indices = [0, 1, 2,  0, 2, 3];

  // Add vertices to positions.triangles array
  for (var i = 0; i < indices.length; i++) {
    gl_object.positions.push(vertices[indices[i] * 3], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]);
  }


  for (var j = 0; j < 6; j++) {
    gl_object.colors.push(color[0], color[1], color[2]);
  }

  for (var j = 0; j < 6; j++) {
    gl_object.normals.push(normal[0], normal[1], normal[2]);
  }

  

  if (usingTexture) {
    gl_object.textures = textureArr;
    
    gl_object.textureMap = currentTexture;

    gl_t_objects.push(gl_object);
  } else {
    // add new object to render array to be iterated through
    gl_objects.push(gl_object);
  }
}

// function rectangularPrism(x, y, z, width, height, depth, colorsArrayForEachFace, targetObject) {
//   // create new object to be rendered by WebGL
//   let gl_object = { 
//     positions: [], 
//     colors: [], 
//     normals: [],
//     textures: [],
//     textureMap: null,
//     targetObject: targetObject,
//     primitiveType: 'TRIANGLES',
//     type: (targetObject) ? targetObject.renderType : 'regular'
//   };
  

//   var halfWidth = width / 2;
//   var halfHeight = height / 2;
//   var halfDepth = depth / 2;

//   var vertices = [
//     // Front face
//     -halfWidth, -halfHeight,  halfDepth,
//       halfWidth, -halfHeight,  halfDepth,
//       halfWidth,  halfHeight,  halfDepth,
//     -halfWidth,  halfHeight,  halfDepth,
//     // Back face
//     -halfWidth, -halfHeight, -halfDepth,
//     -halfWidth,  halfHeight, -halfDepth,
//       halfWidth,  halfHeight, -halfDepth,
//       halfWidth, -halfHeight, -halfDepth,
//     // Top face
//     -halfWidth,  halfHeight, -halfDepth,
//     -halfWidth,  halfHeight,  halfDepth,
//       halfWidth,  halfHeight,  halfDepth,
//       halfWidth,  halfHeight, -halfDepth,
//     // Bottom face
//     -halfWidth, -halfHeight, -halfDepth,
//       halfWidth, -halfHeight, -halfDepth,
//       halfWidth, -halfHeight,  halfDepth,
//     -halfWidth, -halfHeight,  halfDepth,
//     // Right face
//       halfWidth, -halfHeight, -halfDepth,
//       halfWidth,  halfHeight, -halfDepth,
//       halfWidth,  halfHeight,  halfDepth,
//       halfWidth, -halfHeight,  halfDepth,
//     // Left face
//     -halfWidth, -halfHeight, -halfDepth,
//     -halfWidth, -halfHeight,  halfDepth,
//     -halfWidth,  halfHeight,  halfDepth,
//     -halfWidth,  halfHeight, -halfDepth,
//   ];

//   // Translate vertices to assigned position
//   for (var i = 0; i < vertices.length; i += 3) {
//     vertices[i] += x;
//     vertices[i + 1] += y;
//     vertices[i + 2] += z;
//   }

//   // Indices for drawing the cube with TRIANGLES
//   var indices = [
//     0, 1, 2,  0, 2, 3,    // front
//     4, 5, 6,  4, 6, 7,    // back
//     8, 9, 10, 8, 10, 11,  // top
//     12, 13, 14, 12, 14, 15,  // bottom
//     16, 17, 18, 16, 18, 19,  // right
//     20, 21, 22, 20, 22, 23   // left
//   ];

//   // Add vertices to positions.triangles array
//   for (var i = 0; i < indices.length; i++) {
//     gl_object.positions.push(vertices[indices[i] * 3] + halfWidth, vertices[indices[i] * 3 + 1] + halfHeight, vertices[indices[i] * 3 + 2] + halfDepth);
//   }

//   // Add colors to colors.triangles array
//   for (var i = 0; i < 6; i++) {
//     var color = colorsArrayForEachFace[i];
//     for (var j = 0; j < 6; j++) { // 6 vertices per face
//       gl_object.colors.push(color[0], color[1], color[2]);
//     }
//   }

//   // Add normals to normals.triangles array
//   var faceNormals = [
//     // Front face
//     [0, 0, 1],
//     // Back face
//     [0, 0, -1],
//     // Top face
//     [0, 1, 0],
//     // Bottom face
//     [0, -1, 0],
//     // Right face
//     [1, 0, 0], 
//     // Left face
//     [-1, 0, 0]
//   ];

//   for (var i = 0; i < 6; i++) {
//     var normal = faceNormals[i];
//     for (var j = 0; j < 6; j++) { // 6 vertices per face
//       gl_object.normals.push(normal[0], normal[1], normal[2]);
//     }
//   }

//   if (usingTexture) {
//     let txtAr = new Float32Array([
//       // Front face
//       0, 1,
//       1, 1,
//       1, 0,
//       0, 1,
//       1, 0,
//       0, 0,
    
//       // Back face
//       1, 1,
//       1, 0,
//       0, 0,
//       1, 1,
//       0, 0,
//       0, 1,
    
//       // Top face
//       0, 0,
//       0, 1,
//       1, 1,
//       0, 0,
//       1, 1,
//       1, 0,
    
//       // Bottom face
//       1, 0,
//       0, 0,
//       0, 1,
//       1, 0,
//       0, 1,
//       1, 1,
    
//       // Right face
//       1, 0,
//       0, 0,
//       0, 1,
//       1, 0,
//       0, 1,
//       1, 1,
    
//       // Left face 
//       0, 0,
//       0, 1,
//       1, 1,
//       0, 0,
//       1, 1,
//       1, 0,
//     ]);
    
    
//     gl_object.textures = txtAr;

//     gl_object.textureMap = currentTexture;

//     gl_t_objects.push(gl_object);
//   } else {
//     // add new object to render array to be iterated through
//     gl_objects.push(gl_object);
//   }
// }

function cube(x, y, z, size, colorsArrayForEachFace, targetObject) {
  let oTextures = [];
  oTextures[0] = Array.isArray(currentTexture) ? currentTexture[0] : currentTexture;
  oTextures[1] = Array.isArray(currentTexture) ? currentTexture[1] : currentTexture;
  oTextures[2] = Array.isArray(currentTexture) ? currentTexture[2] : currentTexture;
  oTextures[3] = Array.isArray(currentTexture) ? currentTexture[3] : currentTexture;
  oTextures[4] = Array.isArray(currentTexture) ? currentTexture[4] : currentTexture;
  oTextures[5] = Array.isArray(currentTexture) ? currentTexture[5] : currentTexture;

  // Front face
  if (oTextures[0] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[0]);
  }
  quad(x, y, z + size, size, size, colorsArrayForEachFace[0], 'front', targetObject);
  
  // Back face
  if (oTextures[1] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[1]);
  }
  quad(x, y, z, size, size, colorsArrayForEachFace[1], 'back', targetObject);
  
  // Top face
  if (oTextures[2] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[2]);
  }
  quad(x, y + size, z, size, size, colorsArrayForEachFace[2], 'top', targetObject);
  
  // Bottom face
  if (oTextures[3] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[3]);
  }
  quad(x, y, z, size, size, colorsArrayForEachFace[3], 'bottom', targetObject);
  
  // Right face
  if (oTextures[4] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[4]);
  }
  quad(x + size, y, z, size, size, colorsArrayForEachFace[4], 'right', targetObject);
  
  // Left face
  if (oTextures[5] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[5]);
  }
  quad(x, y, z, size, size, colorsArrayForEachFace[5], 'left', targetObject);
}

function rectangularPrism(x, y, z, width, height, depth, colorsArrayForEachFace, targetObject) {
  let oTextures = [];
  oTextures[0] = Array.isArray(currentTexture) ? currentTexture[0] : currentTexture;
  oTextures[1] = Array.isArray(currentTexture) ? currentTexture[1] : currentTexture;
  oTextures[2] = Array.isArray(currentTexture) ? currentTexture[2] : currentTexture;
  oTextures[3] = Array.isArray(currentTexture) ? currentTexture[3] : currentTexture;
  oTextures[4] = Array.isArray(currentTexture) ? currentTexture[4] : currentTexture;
  oTextures[5] = Array.isArray(currentTexture) ? currentTexture[5] : currentTexture;

  // Front face
  if (oTextures[0] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[0]);
  }
  quad(x, y, z + depth, width, height, colorsArrayForEachFace[0], 'front', targetObject);
  
  // // Back face
  if (oTextures[1] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[1]);
  }
  quad(x, y, z, width, height, colorsArrayForEachFace[1], 'back', targetObject);
  
  // Top face
  if (oTextures[2] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[2]);
  }
  quad(x, y + height, z, width, depth, colorsArrayForEachFace[2], 'top', targetObject);
  
  // Bottom face
  if (oTextures[3] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[3]);
  }
  quad(x, y, z, width, depth, colorsArrayForEachFace[3], 'bottom', targetObject);
  
  // Right face
  if (oTextures[4] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[4]);
  }
  quad(x + width, y, z, depth, height, colorsArrayForEachFace[4], 'right', targetObject);
  
  // // Left face
  if (oTextures[5] === null) {
    wipeTextures();
  } else {
    setTexture(oTextures[5]);
  }
  quad(x, y, z, depth, height, colorsArrayForEachFace[5], 'left', targetObject);
}



// circle in xz plane (no texture yet)
function xz_circle(x, y, z, radius, normalDirection, color, targetObject, segments) {
  // create new object to be rendered by WebGL
  let gl_object = { 
      positions: [], 
      colors: [], 
      normals: [],
      textures: [],
      textureMap: null,
      targetObject: targetObject,
      primitiveType: 'TRIANGLE_FAN'
  };

  var angleStep = (2 * Math.PI) / segments;

  // Top circle vertices
  gl_object.positions.push(x, y, z);
  for (var i = 0; i <= segments; i++) {
    var angle = i * angleStep * -normalDirection[1];
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    gl_object.positions.push(x + radius * cos, y, z + radius * sin);
  }

  // Add colors for top and bottom
  for (var i = 0; i <= segments + 1; i++) {
    gl_object.colors.push(...color); // Top face color
  }

  // Normals
  for (var i = 0; i <= segments + 1; i++) {
    gl_object.normals.push(...normalDirection);
  }

  // add new object to render array to be iterated through
  gl_objects.push(gl_object);
}

// cylinder (no texture yet)
function cylinder(x, y, z, radius, height, colorsArrayForEachFace, targetObject, segments = 36) {
  var hs = height / 2;
  var topColor = colorsArrayForEachFace[0],
      bodyColor = colorsArrayForEachFace[1],
      bottomColor = colorsArrayForEachFace[2];

  // Draw top circle
  xz_circle(x, y + hs, z, radius, [0, 1, 0], topColor, targetObject, segments);
  
  // Draw bottom circle
  xz_circle(x, y - hs, z, radius, [0, -1, 0], bottomColor, targetObject, segments);

  // Draw body
  let gl_object = { 
    positions: [], 
    colors: [], 
    normals: [],
    textures: [],
    textureMap: null,
    targetObject: targetObject,
    primitiveType: 'TRIANGLE_STRIP'
  };
  var angleStep = (2 * Math.PI) / segments;

  // Create vertices for the sides of the cylinder
  for (var i = 0; i <= segments; i++) {
    var angle = i * -angleStep;

    var x1 = x + radius *  Math.cos(angle);
    var z1 = z + radius * Math.sin(angle);
    var y1 = y + hs;
    var y2 = y - hs;

    // Push vertices
    gl_object.positions.push(x1, y1, z1);
    gl_object.positions.push(x1, y2, z1);

    // Push colors
    gl_object.colors.push(...bodyColor);
    gl_object.colors.push(...bodyColor);

    // Calculate normals
    var normal = [Math.cos(angle), 0, Math.sin(angle)];

    // Push normals
    gl_object.normals.push(...normal);
    gl_object.normals.push(...normal);
  }

  // Add new object to render array to be iterated through
  gl_objects.push(gl_object);
}



