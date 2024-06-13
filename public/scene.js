
let scene = 'menu';

function play() {
  let screen = document.querySelectorAll('.end-screen')[0];
  screen.style.display = 'none';

  scene = 'game';
  game = new Game({});
  gl_objects = [];
  gl_t_objects = [];
  blocks = [];

  level = 2;
  levels[level - 1].create();
  
  refillBuffers(gl_t_objects, buffer_texture, true);
  refillBuffers(gl_objects, buffer_regular);

  var menu = document.getElementById("menu");
  menu.style.display = "none";
}