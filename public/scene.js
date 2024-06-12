
let scene = 'menu';

function play() {
  scene = 'game';
  levels[level - 1].create();
  
  refillBuffers(gl_t_objects, buffer_texture, true);
  refillBuffers(gl_objects, buffer_regular);

  var menu = document.getElementById("menu");
  menu.style.display = "none";
}