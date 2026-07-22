const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

console.log("Preparing www build directory...");

// Ensure clean www
if (fs.existsSync('www')) {
  fs.rmSync('www', { recursive: true, force: true });
}
fs.mkdirSync('www', { recursive: true });

// Copy core app files
fs.copyFileSync('index.html', 'www/index.html');
fs.copyFileSync('style.css', 'www/style.css');

if (fs.existsSync('dialogue_script.txt')) {
  fs.copyFileSync('dialogue_script.txt', 'www/dialogue_script.txt');
}

copyFolderSync('src', 'www/src');
copyFolderSync('assets', 'www/assets');

// Setup local offline vendor/three in both root & www
const vendorDirs = [
  'vendor/three',
  'www/vendor/three',
  'vendor/three/addons/loaders',
  'www/vendor/three/addons/loaders',
  'vendor/three/addons/utils',
  'www/vendor/three/addons/utils',
  'vendor/three/addons/libs',
  'www/vendor/three/addons/libs'
];
vendorDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy core files
fs.copyFileSync('node_modules/three/build/three.module.js', 'vendor/three/three.module.js');
fs.copyFileSync('node_modules/three/build/three.module.js', 'www/vendor/three/three.module.js');
fs.copyFileSync('node_modules/three/build/three.core.js', 'vendor/three/three.core.js');
fs.copyFileSync('node_modules/three/build/three.core.js', 'www/vendor/three/three.core.js');

// Copy loaders
fs.copyFileSync('node_modules/three/examples/jsm/loaders/GLTFLoader.js', 'vendor/three/addons/loaders/GLTFLoader.js');
fs.copyFileSync('node_modules/three/examples/jsm/loaders/GLTFLoader.js', 'www/vendor/three/addons/loaders/GLTFLoader.js');
fs.copyFileSync('node_modules/three/examples/jsm/loaders/DRACOLoader.js', 'vendor/three/addons/loaders/DRACOLoader.js');
fs.copyFileSync('node_modules/three/examples/jsm/loaders/DRACOLoader.js', 'www/vendor/three/addons/loaders/DRACOLoader.js');

// Copy utils needed by GLTFLoader
fs.copyFileSync('node_modules/three/examples/jsm/utils/BufferGeometryUtils.js', 'vendor/three/addons/utils/BufferGeometryUtils.js');
fs.copyFileSync('node_modules/three/examples/jsm/utils/BufferGeometryUtils.js', 'www/vendor/three/addons/utils/BufferGeometryUtils.js');
fs.copyFileSync('node_modules/three/examples/jsm/utils/SkeletonUtils.js', 'vendor/three/addons/utils/SkeletonUtils.js');
fs.copyFileSync('node_modules/three/examples/jsm/utils/SkeletonUtils.js', 'www/vendor/three/addons/utils/SkeletonUtils.js');

// Copy draco library
copyFolderSync('node_modules/three/examples/jsm/libs/draco', 'vendor/three/addons/libs/draco');
copyFolderSync('node_modules/three/examples/jsm/libs/draco', 'www/vendor/three/addons/libs/draco');

console.log("Build directory www prepared successfully!");
