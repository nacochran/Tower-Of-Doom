
// objects in these array are rendered by GL.TRIANGLES
var gl_objects = [];

function cube(x, y, z, size, colorsArrayForEachFace, targetObject) {
  // create new object to be rendered by WebGL
  // for now we just include a single positions/colors/normals array, although we can 
  let gl_object = { 
    positions: [], 
    colors: [], 
    normals: [],
    targetObject: targetObject,
    primitiveType: 'TRIANGLES',
    renderType: targetObject.renderType
  };

  var hs = size / 2; // half-size
  var vertices = [
    // Front face
    -hs, -hs,  hs,
     hs, -hs,  hs,
     hs,  hs,  hs,
    -hs,  hs,  hs,
    // Back face
    -hs, -hs, -hs,
    -hs,  hs, -hs,
     hs,  hs, -hs,
     hs, -hs, -hs,
    // Top face
    -hs,  hs, -hs,
    -hs,  hs,  hs,
     hs,  hs,  hs,
     hs,  hs, -hs,
    // Bottom face
    -hs, -hs, -hs,
     hs, -hs, -hs,
     hs, -hs,  hs,
    -hs, -hs,  hs,
    // Right face
     hs, -hs, -hs,
     hs,  hs, -hs,
     hs,  hs,  hs,
     hs, -hs,  hs,
    // Left face
    -hs, -hs, -hs,
    -hs, -hs,  hs,
    -hs,  hs,  hs,
    -hs,  hs, -hs,
  ];

  // Normals for each vertex of each face
  var faceNormals = [
    // Front face
    [ 0,  0,  1],
    // Back face
    [ 0,  0, -1],
    // Top face
    [ 0,  1,  0],
    // Bottom face
    [ 0, -1,  0],
    // Right face
    [ 1,  0,  0], 
    // Left face
    [-1,  0,  0], 
  ];

  // Translate vertices to assigned position
  for (var i = 0; i < vertices.length; i += 3) {
    vertices[i] += x;
    vertices[i + 1] += y;
    vertices[i + 2] += z;
  }

  // Indices for drawing the cube with TRIANGLES
  var indices = [
    0, 1, 2,  0, 2, 3,    // front
    4, 5, 6,  4, 6, 7,    // back
    8, 9, 10, 8, 10,11,   // top
    12,13,14, 12,14,15,   // bottom
    16,17,18, 16,18,19,   // right
    20,21,22, 20,22,23    // left
  ];

  // Add vertices to positions.triangles array
  for (var i = 0; i < indices.length; i++) {
    gl_object.positions.push(vertices[indices[i] * 3] + hs, vertices[indices[i] * 3 + 1] + hs, vertices[indices[i] * 3 + 2] + hs);
  }

  // Add colors to colors.triangles array
  for (var i = 0; i < 6; i++) {
    var color = colorsArrayForEachFace[i];
    for (var j = 0; j < 6; j++) { // 6 vertices per face
      gl_object.colors.push(color[0], color[1], color[2]);
    }
  }

  // Add normals to normals.triangles arrayfor (var i = 0; i < 6; i++) {
  for (var i = 0; i < 6; i++) {
    var normal = faceNormals[i];
    for (var j = 0; j < 6; j++) { // 6 vertices per face
      gl_object.normals.push(normal[0], normal[1], normal[2]);
    }
  }

  // add new object to render array to be iterated through
  gl_objects.push(gl_object);
}

// circle in xz plane
function xz_circle(x, y, z, radius, normalDirection, color, targetObject, segments) {
  // create new object to be rendered by WebGL
  let gl_object = { 
      positions: [], 
      colors: [], 
      normals: [],
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



