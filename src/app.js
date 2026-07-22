// Main application file for 3D Eye Exam Simulator
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { playBeep, playWhir, playPuff, speakText } from './audio.js';
import { Patient, SNELLEN_CHART, SNELLEN_LINES } from './patient.js';
import { ClinicBuilder } from './clinic.js';

// --- ANIMATION VARIABLES ---
const clock = new THREE.Clock();
let patientMixer = null;
let patientAnimations = {};

// --- GAME STATE ---
let state = 'menu'; // 'menu', 'doctor-select', 'roam', 'ar-zoom', 'autorefractor', 'nct-zoom', 'nct', 'phoropter-zoom', 'phoropter', 'report'
let selectedDoctor = { gender: 'male', name: 'Dr. Carter', icon: '👨‍⚕️' };
let patient = null;
let hasGltfPatient = false;
let patientSittingMesh3D = null;
let hasGltfPatientSitting = false;

// --- 3D DOCTOR SELECTION VARIABLES ---
let doctorSelectGroup = null;
let femaleCardMesh = null;
let maleCardMesh = null;
let hoveredDoc = null;
const docSelectRaycaster = new THREE.Raycaster();
const docSelectMouse = new THREE.Vector2();

// --- 3D ENGINE VARIABLES ---
let scene, camera, renderer;
let clinicBuilder;
let patientMesh3D = null;
let keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// Camera looking angles
let yaw = -Math.PI / 2; // Facing north/east
let pitch = 0;
const mouseSpeed = 0.0025;
let isMouseDown = false;

// Movement variables
const playerSpeed = 0.06;
const playerRadius = 0.55;
const playerHeight = 1.6;

// Camera interpolation variables for transition
let transitionT = 0;
const transitionDuration = 45; // frames (0.75s at 60fps)
let camStartPos = new THREE.Vector3();
let camStartTarget = new THREE.Vector3();
let camTargetPos = new THREE.Vector3();
let camTargetTarget = new THREE.Vector3();

// Patient follow variables
let patientFollow = false;
let patientTargetPos = new THREE.Vector3(-9, 0, -2.2);
let patientCurrentPos = new THREE.Vector3(-9, 0, -2.2);

// --- CLINIC DEVICE STATES ---
let arFocusValue = 10; // Current focus slider value (0 to 100). 50 is sharp.
let arEye = 'OD'; // 'OD' or 'OS'
let arMeasurements = { OD: null, OS: null };

let nctEye = 'OD';
let nctOffset = { x: 45, y: -30 }; // pixel offsets from alignment center
let nctMeasurements = { OD: null, OS: null };

let phoropterEye = 'OD';
let phoropterLens = {
  OD: { sph: 0.00, cyl: 0.00, ax: 180 },
  OS: { sph: 0.00, cyl: 0.00, ax: 180 }
};
let comparisonLenses = {
  lens1: { sph: 0.00, cyl: 0.00, ax: 180 },
  lens2: { sph: 0.00, cyl: 0.00, ax: 180 }
};
let projectorOn = false;
let currentAcuityLine = 20; // 20/20 default select

// --- DOM ELEMENT CACHE ---
const dom = {
  mainMenu: document.getElementById('main-menu'),
  doctorSelect: document.getElementById('doctor-select'),
  gameContainer: document.getElementById('game-container'),
  canvasHolder: document.getElementById('canvas-holder'),
  hud: document.getElementById('hud'),
  hudDocIcon: document.getElementById('hud-doc-icon'),
  hudDocName: document.getElementById('hud-doc-name'),
  hudObjective: document.getElementById('hud-objective-text'),
  crosshair: document.getElementById('crosshair'),
  dialogueBox: document.getElementById('dialogue-box'),
  speakerName: document.getElementById('speaker-name'),
  speakerText: document.getElementById('speaker-text'),
  btnNextDialogue: document.getElementById('btn-next-dialogue'),
  interactToast: document.getElementById('interact-toast'),
  interactAction: document.getElementById('interact-action'),
  lblFemaleDoc: document.getElementById('lbl-female-doc'),
  lblMaleDoc: document.getElementById('lbl-male-doc'),
  
  // Autorefractor
  viewAr: document.getElementById('view-autorefractor'),
  arBalloon: document.getElementById('balloon-sprite'),
  arSliderFocus: document.getElementById('slider-focus'),
  arStatus: document.getElementById('ar-status'),
  arPrescription: document.getElementById('ar-prescription'),
  btnArMeasure: document.getElementById('btn-ar-measure'),
  btnArExit: document.getElementById('btn-ar-exit'),

  // NCT
  viewNct: document.getElementById('view-nct'),
  nctRing: document.getElementById('nct-aligned-ring'),
  nctStatus: document.getElementById('nct-status'),
  nctPressure: document.getElementById('nct-pressure'),
  btnNctPuff: document.getElementById('btn-nct-puff'),
  btnNctExit: document.getElementById('btn-nct-exit'),

  // Phoropter
  viewPhoropter: document.getElementById('view-phoropter'),
  chartContent: document.getElementById('chart-projector-content'),
  chartLetters: document.getElementById('chart-letters'),
  chartLineLbl: document.getElementById('chart-line-lbl'),
  tabOD: document.getElementById('btn-tab-od'),
  tabOS: document.getElementById('btn-tab-os'),
  lblSph: document.getElementById('lbl-sph-val'),
  lblCyl: document.getElementById('lbl-cyl-val'),
  lblAx: document.getElementById('lbl-ax-val'),
  btnSphDec: document.getElementById('btn-sph-dec'),
  btnSphInc: document.getElementById('btn-sph-inc'),
  btnCylDec: document.getElementById('btn-cyl-dec'),
  btnCylInc: document.getElementById('btn-cyl-inc'),
  btnAxDec: document.getElementById('btn-ax-dec'),
  btnAxInc: document.getElementById('btn-ax-inc'),
  btnPresent1: document.getElementById('btn-present-1'),
  btnPresent2: document.getElementById('btn-present-2'),
  btnCompareQuery: document.getElementById('btn-compare-query'),
  btnProjectorPower: document.getElementById('btn-projector-power'),
  selectChartLine: document.getElementById('select-chart-line'),
  btnChartRead: document.getElementById('btn-chart-read'),
  btnExamFinalize: document.getElementById('btn-exam-finalize'),
  btnExamExit: document.getElementById('btn-exam-exit'),

  // Report
  viewReport: document.getElementById('view-report'),
  reportDate: document.getElementById('report-date'),
  reportClinician: document.getElementById('report-clinician'),
  reportPatientName: document.getElementById('report-patient-name'),
  tdArOD: document.getElementById('td-ar-od'),
  tdArOS: document.getElementById('td-ar-os'),
  tdNctOD: document.getElementById('td-nct-od'),
  tdNctOS: document.getElementById('td-nct-os'),
  tdRxODSph: document.getElementById('td-rx-od-sph'),
  tdRxODCyl: document.getElementById('td-rx-od-cyl'),
  tdRxODAx: document.getElementById('td-rx-od-ax'),
  tdRxODVa: document.getElementById('td-rx-od-va'),
  tdRxOSSph: document.getElementById('td-rx-os-sph'),
  tdRxOSCyl: document.getElementById('td-rx-os-cyl'),
  tdRxOSAx: document.getElementById('td-rx-os-ax'),
  tdRxOSVa: document.getElementById('td-rx-os-va'),
  reportEvaluation: document.getElementById('report-evaluation-text'),
  reportSig: document.getElementById('report-sig-draw'),
  btnRestart: document.getElementById('btn-report-restart')
};

// --- INITIALIZATION ---
function init() {
  setupThreeJS();
  build3DClinic();
  build3DDoctorSelection();
  setupEventListeners();
  animate();
}

function setupThreeJS() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1d);
  scene.fog = new THREE.FogExp2(0x0a0f1d, 0.05);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.3, 1.0); // Start looking at character selection cards

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  dom.canvasHolder.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  // Doctor's Office / Exam Room Overhead Lighting Grid (X: 4 to 12)
  createCeilingLight(9.2, 3.46, 3.0);   // Directly over Phoropter & Patient Exam Chair
  createCeilingLight(6.8, 3.46, -3.5);  // Directly over Doctor's Desk
  createCeilingLight(6.0, 3.46, 0.0);   // Doctor Office Entry / Center
  createCeilingLight(10.0, 3.46, -1.5); // Doctor Office Rear Wall Area

  // Pre-Testing Room Overhead Lighting (X: -4 to 4)
  createCeilingLight(-1.8, 3.46, 3.5);  // Over Autorefractor Desk
  createCeilingLight(1.8, 3.46, 3.5);   // Over NCT Tonometer Desk
  createCeilingLight(0.0, 3.46, -2.0);  // Pre-Testing Room Center

  // Waiting Room Overhead Lighting (X: -12 to -4)
  createCeilingLight(-6.0, 3.46, -3.0); // Over Reception Desk
  createCeilingLight(-9.0, 3.46, 0.0);  // Over Waiting Area Seating

  // Directional window light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7); // Bright white daylight
  dirLight.position.set(-15, 6, 2);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);
}

function createCeilingLight(x, y, z) {
  // PointLight for soft broad illumination
  const light = new THREE.PointLight(0xffffff, 0.85, 12);
  light.position.set(x, y - 0.2, z);
  light.castShadow = true;
  light.shadow.bias = -0.002;
  scene.add(light);

  // SpotLight for focused downlighting
  const spot = new THREE.SpotLight(0xffffff, 0.4, 10, Math.PI / 4, 0.5);
  spot.position.set(x, y - 0.1, z);
  spot.target.position.set(x, 0, z);
  scene.add(spot);
  scene.add(spot.target);

  // 3D Recessed LED Troffer Panel Light Fixture
  const fixtureGroup = new THREE.Group();

  // Silver/Aluminum Bezel Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.7), frameMat);
  frame.position.set(x, y + 0.02, z);
  fixtureGroup.add(frame);

  // Glowing Emissive LED Panel
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    roughness: 0.1
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.6), panelMat);
  panel.position.set(x, y, z);
  fixtureGroup.add(panel);

  scene.add(fixtureGroup);
}

// GLTF/Draco Loader Setup
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('vendor/three/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

function loadGltfModel(url, desiredHeight, position, rotationY, hotspotAction, isPatient = false, alignBottom = true) {
  gltfLoader.load(url, (gltf) => {
    const model = gltf.scene;
    
    // Auto-scale model using bounding box, except for patient meshes which suffer from skinned mesh CPU bounds issues
    let scale = 1.0;
    if (isPatient || hotspotAction === 'patient-interact-sitting') {
      scale = 0.95; // Match standard real-world height (~1.7m) for humanoids
    } else {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      scale = desiredHeight / (size.y || 1);
    }
    model.scale.set(scale, scale, scale);
    
    let targetObject = model;
    
    if (alignBottom) {
      // Create a wrapper group to center and align the bottom Y
      const wrapper = new THREE.Group();
      wrapper.add(model);
      
      // Re-compute bounding box of scaled model inside wrapper
      const scaledBox = new THREE.Box3().setFromObject(model);
      const minVal = scaledBox.min.y;
      const center = scaledBox.getCenter(new THREE.Vector3());
      
      // Shift model so its bottom center aligns with wrapper's local origin (0,0,0)
      model.position.y = -minVal;
      model.position.x = -center.x;
      model.position.z = -center.z;
      
      targetObject = wrapper;
    }
    
    // Position and rotate target object
    targetObject.position.copy(position);
    targetObject.rotation.y = rotationY;
    
    // Shadows
    targetObject.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    scene.add(targetObject);

    // Find hotspot to replace procedural mesh
    const hot = clinicBuilder.hotspots.find(h => h.action === hotspotAction);
    if (hot) {
      if (hot.mesh) {
        scene.remove(hot.mesh);
      }
      hot.mesh = targetObject;
    }

        if (hotspotAction === 'patient-interact-sitting') {
      patientSittingMesh3D = targetObject;
      hasGltfPatientSitting = true;
      
      // If standing patient is already loaded, hide standing, show sitting
      if (patientMesh3D) {
        patientMesh3D.visible = false;
      }
      patientSittingMesh3D.visible = true;
      return;
    }

    if (isPatient) {
      // Remove the old procedural patientMesh3D from scene
      if (patientMesh3D) {
        scene.remove(patientMesh3D);
      }
      patientMesh3D = targetObject;
      hasGltfPatient = true;

      // If sitting patient is already loaded, hide standing patient at startup
      if (hasGltfPatientSitting && patientSittingMesh3D) {
        patientMesh3D.visible = false;
      }

      // Handle custom patient animations if they exist
      if (gltf.animations && gltf.animations.length > 0) {
        patientMixer = new THREE.AnimationMixer(model); // bind mixer to inner model
        gltf.animations.forEach(clip => {
          const name = clip.name.toLowerCase();
          if (name.includes('idle') || name.includes('breath')) {
            patientAnimations.idle = patientMixer.clipAction(clip);
          } else if (name.includes('sit')) {
            patientAnimations.sit = patientMixer.clipAction(clip);
          } else if (name.includes('walk') || name.includes('run')) {
            patientAnimations.walk = patientMixer.clipAction(clip);
          } else if (name.includes('stand')) {
            patientAnimations.stand = patientMixer.clipAction(clip);
          }
        });
        
        // Fallbacks
        if (!patientAnimations.idle) patientAnimations.idle = patientMixer.clipAction(gltf.animations[0]);
        if (!patientAnimations.sit) patientAnimations.sit = patientAnimations.idle;
        if (!patientAnimations.stand) patientAnimations.stand = patientAnimations.idle;
        if (!patientAnimations.walk) patientAnimations.walk = patientAnimations.idle;
        
        patientAnimations.idle.play();
      }
    }
  }, undefined, (err) => {
    console.warn(`Could not load GLB asset ${url}. Falling back to procedural 3D meshes.`, err);
  });
}

function build3DClinic() {
  clinicBuilder = new ClinicBuilder(scene);
  clinicBuilder.buildAll();
  
  patientMesh3D = clinicBuilder.createPatient3D();
  patient = new Patient();
  
  // Set report date
  const d = new Date();
  dom.reportDate.innerText = d.toISOString().slice(0,10);
  dom.reportPatientName.innerText = patient.name;

  // Load GLB models to replace procedural placeholders
  // 1. Autorefractor (desired height = 0.52m, sits on desk Y = 0.75, alignBottom = true)
  loadGltfModel('assets/autorefractor.glb', 0.52, new THREE.Vector3(-1.8, 0.75, 3.5), Math.PI, 'ar-enter', false, true);
  
  // 2. NCT Tonometer (desired height = 0.52m, sits on desk Y = 0.75, alignBottom = true)
  loadGltfModel('assets/nct.glb', 0.52, new THREE.Vector3(1.8, 0.75, 3.5), Math.PI, 'nct-enter', false, true);

  // 3. Phoropter (desired height = 0.55m, floats at Y = 1.35, alignBottom = false as it is already great!)
  loadGltfModel('assets/phoropter.glb', 0.55, new THREE.Vector3(9.2, 1.35, 2.5), Math.PI, 'phoropter-enter', false, false);

  // 4. Standing Patient (desired height = 1.6m, placed sitting in reception chair Y = 0.15, alignBottom = true)
  loadGltfModel('assets/patient/patient walk.glb', 1.6, new THREE.Vector3(-9, 0.15, -2.2), Math.PI / 2, 'patient-interact', true, true);

  // 5. Sitting Patient (desired height = 1.6m, placed sitting in reception chair Y = 0.0, alignBottom = true)
  loadGltfModel('assets/patient/patient sit down.glb', 1.6, new THREE.Vector3(-9, 0.0, -2.2), Math.PI / 2, 'patient-interact-sitting', false, true);

  // 6. Receptionist (desired height = 1.6m, placed behind reception desk X = -6, Z = -3.8, alignBottom = true)
  loadGltfModel('assets/receptionist.glb', 1.6, new THREE.Vector3(-6, 0.0, -3.8), 0, 'receptionist-interact', false, true);
  loadGltfModel('assets/receptionist/receptionist.glb', 1.6, new THREE.Vector3(-6, 0.0, -3.8), 0, 'receptionist-interact', false, true);
}

function build3DDoctorSelection() {
  doctorSelectGroup = new THREE.Group();
  scene.add(doctorSelectGroup);

  // Cool cyber grid floor under cards
  const gridHelper = new THREE.GridHelper(20, 20, 0x0ea5e9, 0x1e293b);
  gridHelper.position.y = 0;
  doctorSelectGroup.add(gridHelper);

  // Spotlights for cards
  const spotLight1 = new THREE.SpotLight(0xffffff, 2, 10, Math.PI / 6, 0.5, 1);
  spotLight1.position.set(-1.5, 3, 1);
  spotLight1.target.position.set(-1.5, 1.3, -3);
  doctorSelectGroup.add(spotLight1);
  doctorSelectGroup.add(spotLight1.target);

  const spotLight2 = new THREE.SpotLight(0xffffff, 2, 10, Math.PI / 6, 0.5, 1);
  spotLight2.position.set(1.5, 3, 1);
  spotLight2.target.position.set(1.5, 1.3, -3);
  doctorSelectGroup.add(spotLight2);
  doctorSelectGroup.add(spotLight2.target);

  // Textures loader
  const textureLoader = new THREE.TextureLoader();
  const femaleTex = textureLoader.load('assets/female_doctor.jpg');
  const maleTex = textureLoader.load('assets/male_doctor.jpg');

  // Materials
  const cardBackMat = new THREE.MeshStandardMaterial({ 
    color: 0x0f172a, 
    roughness: 0.2, 
    metalness: 0.8 
  });
  const femaleMat = new THREE.MeshStandardMaterial({ 
    map: femaleTex, 
    roughness: 0.1, 
    metalness: 0.2 
  });
  const maleMat = new THREE.MeshStandardMaterial({ 
    map: maleTex, 
    roughness: 0.1, 
    metalness: 0.2 
  });

  // Left Card (female_doctor)
  femaleCardMesh = new THREE.Group();
  femaleCardMesh.position.set(-1.5, 1.3, -3.0);
  
  const backL = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.68, 0.08), cardBackMat);
  backL.castShadow = true;
  femaleCardMesh.add(backL);
  
  const frontL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), femaleMat);
  frontL.position.z = 0.041;
  femaleCardMesh.add(frontL);
  
  doctorSelectGroup.add(femaleCardMesh);

  // Right Card (male_doctor)
  maleCardMesh = new THREE.Group();
  maleCardMesh.position.set(1.5, 1.3, -3.0);

  const backR = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.68, 0.08), cardBackMat);
  backR.castShadow = true;
  maleCardMesh.add(backR);

  const frontR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), maleMat);
  frontR.position.z = 0.041;
  maleCardMesh.add(frontR);

  doctorSelectGroup.add(maleCardMesh);
}

function selectDoctorCharacter(docType) {
  playBeep(900, 0.1);
  playWhir(0.5);
  
  // Prevent double trigger
  state = 'doctor-select-zoom';
  
  // Set selected Doctor details based on file names
  if (docType === 'male') {
    selectedDoctor = { gender: 'male', name: 'Dr. Allen Watts, OD', icon: '👨‍⚕️' };
  } else {
    selectedDoctor = { gender: 'female', name: 'Dr. Lauren Mays, OD', icon: '👩‍⚕️' };
  }

  // Zoom camera directly into selected card
  const mesh = docType === 'female' ? femaleCardMesh : maleCardMesh;
  const zoomTargetPos = new THREE.Vector3(mesh.position.x, 1.3, mesh.position.z + 0.9);
  const zoomTargetLookAt = new THREE.Vector3(mesh.position.x, 1.3, mesh.position.z);
  
  startCameraTransition(
    camera.position.clone(),
    new THREE.Vector3(0, 1.3, -3), // looking center
    zoomTargetPos,
    zoomTargetLookAt,
    'roam-init'
  );
}

function startGameSession() {
  // Remove select cards from scene
  scene.remove(doctorSelectGroup);
  
  // Close doctor selection screen overlay
  dom.doctorSelect.classList.remove('active');
  dom.hud.classList.remove('hidden');
  
  dom.hudDocIcon.innerText = selectedDoctor.icon;
  dom.hudDocName.innerText = selectedDoctor.name.split(',')[0];
  
  // Set camera to clinic starting position
  camera.position.set(-6, playerHeight, 0);
  yaw = -Math.PI / 2; // Face north/east
  pitch = 0;
  
  playBeep(1200, 0.25);
  setTimeout(() => playWhir(0.5), 200);

  // Intro dialogue - Receptionist greets doctor upon game start
  state = 'roam';
  setTimeout(() => {
    showDialogueBox("Receptionist", "Hello doctor, the patient's ready for you.");
    speakText("Hello doctor, the patient's ready for you.", 'receptionist', 'female', null, 'receptionist_greeting');
    dom.hudObjective.innerText = "Walk up to the patient sitting in the waiting area and click to introduce yourself.";
  }, 300);
}

// --- CONTROLS AND INPUT ---
function setupEventListeners() {
  // Main Menu start
  document.getElementById('btn-start').addEventListener('click', () => {
    playBeep(600, 0.15);
    dom.mainMenu.classList.remove('active');
    dom.doctorSelect.classList.add('active');
    state = 'doctor-select';
    
    // Position camera facing the selection cards
    camera.position.set(0, 1.3, 1.0);
    camera.lookAt(0, 1.3, -3.0);
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (state === 'roam') {
      if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys.w = true;
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys.s = true;
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys.a = true;
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys.d = true;
      
      if (e.key.toLowerCase() === 'e') {
        triggerActiveHotspot();
      }
    } else if (state === 'nct') {
      // Keyboard shortcuts for NCT alignment
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') moveNctRing(-4, 0);
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') moveNctRing(4, 0);
      if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') moveNctRing(0, -4);
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') moveNctRing(0, 4);
      
      if (e.key === 'Enter' || e.key === ' ') {
        if (!dom.btnNctPuff.disabled) {
          dom.btnNctPuff.click();
        }
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys.w = false;
    if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys.s = false;
    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys.a = false;
    if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys.d = false;
  });

  // Mouse Drag to look (web game style drag-to-look)
  window.addEventListener('mousedown', (e) => {
    if (state === 'roam' && e.target === renderer.domElement) {
      isMouseDown = true;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isMouseDown && state === 'roam') {
      yaw -= e.movementX * mouseSpeed;
      pitch -= e.movementY * mouseSpeed;
      
      // Limit vertical pitch to avoid flipping upside down
      pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    }
    
    if (state === 'doctor-select') {
      docSelectMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      docSelectMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  // Click on canvas to trigger interaction if hovering hotspot
  window.addEventListener('click', (e) => {
    if (state === 'roam' && e.target === renderer.domElement) {
      triggerActiveHotspot();
    }
    if (state === 'doctor-select' && hoveredDoc) {
      selectDoctorCharacter(hoveredDoc);
    }
  });

  // Window resizing
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Machine Dialog click
  dom.btnNextDialogue.addEventListener('click', () => {
    playBeep(900, 0.05);
    dom.dialogueBox.classList.add('hidden');
    
    // Custom workflow steps based on progression
    if (dom.speakerName.innerText === selectedDoctor.name.split(',')[0]) {
      // It was the doctor speaking in reception. Now make patient stand & follow.
      setPatientPose('standing');
      patientFollow = true;
      dom.hudObjective.innerText = "Lead the patient to the Pre-Testing Room (middle room) and click the Autorefractor.";
      
      speakText("Sounds good, doctor. Lead the way.", 'patient', 'female', null, 'patient_intro');
      showDialogueBox("Patient", "Sounds good, doctor. Lead the way.");
    }
  });

  // --- DEVICE COMPONENT LISTENERS ---
  
  // Autorefractor Adjustments
  dom.arSliderFocus.addEventListener('input', (e) => {
    arFocusValue = parseInt(e.target.value);
    
    // Focus value 50 is perfectly sharp (blur = 0).
    const defocus = Math.abs(arFocusValue - 50) / 3.5; // range 0 to 15 blur
    dom.arBalloon.style.filter = `blur(${defocus}px)`;
    
    if (defocus < 1.0) {
      dom.arStatus.innerText = "ALIGNED / ACTIVE";
      dom.arStatus.className = "status-active";
    } else {
      dom.arStatus.innerText = "STANDBY (FOCUSING)";
      dom.arStatus.className = "status-warning";
    }
  });

  dom.btnArMeasure.addEventListener('click', () => {
    playBeep(1100, 0.08);
    playWhir(0.4);
    
    // Simulate measuring
    const trueEye = patient.trueRx[arEye];
    // Objective autorefractor readings have a slight random deviation
    const devSph = (Math.random() * 0.5 - 0.25);
    const devCyl = (Math.random() * 0.25 - 0.125);
    
    const estSph = (Math.round((trueEye.sph + devSph) * 4) / 4).toFixed(2);
    const estCyl = (Math.round((trueEye.cyl + devCyl) * 4) / 4).toFixed(2);
    const estAx = trueEye.cyl !== 0 ? Math.round(trueEye.ax / 5) * 5 : 180;
    
    arMeasurements[arEye] = `${estSph > 0 ? '+' : ''}${estSph} SPH / ${estCyl} CYL x ${estAx}`;

    playBeep(900, 0.05);

    if (arEye === 'OD') {
      dom.arPrescription.innerText = `OD: ${arMeasurements.OD} | OS: --.--`;
      arEye = 'OS';
      dom.arSliderFocus.value = 10;
      dom.arBalloon.style.filter = "blur(12px)";
      speakText("Perfect. Now looking at your left eye, keep looking at the balloon.", 'doctor', selectedDoctor.gender, null, 'ar_eye_switch');
    } else {
      dom.arPrescription.innerText = `OD: ${arMeasurements.OD} | OS: ${arMeasurements.OS}`;
      dom.btnArMeasure.disabled = true;
      dom.arStatus.innerText = "TEST COMPLETE";
      dom.arStatus.className = "status-active";
      speakText("Objective measurements complete. You can step back.", 'doctor', selectedDoctor.gender, null, 'ar_finished');
      dom.hudObjective.innerText = "Autorefraction done. Exit the viewfinder and move to the Tonometer.";
    }
  });

  dom.btnArExit.addEventListener('click', () => {
    exitMachineView();
  });

  // NCT Tonometer Adjustments
  const moveNctRing = (dx, dy) => {
    playBeep(600, 0.02);
    nctOffset.x = Math.max(-65, Math.min(65, nctOffset.x + dx));
    nctOffset.y = Math.max(-65, Math.min(65, nctOffset.y + dy));
    
    // Shift green ring in HUD viewport
    dom.nctRing.style.left = `calc(50% + ${nctOffset.x}px)`;
    dom.nctRing.style.top = `calc(50% + ${nctOffset.y}px)`;
    
    // Check alignment
    const dist = Math.sqrt(nctOffset.x * nctOffset.x + nctOffset.y * nctOffset.y);
    if (dist < 8) {
      dom.nctStatus.innerText = "READY TO PUFF";
      dom.nctStatus.className = "status-active";
      dom.btnNctPuff.disabled = false;
    } else {
      dom.nctStatus.innerText = "ALIGN TARGET";
      dom.nctStatus.className = "status-warning";
      dom.btnNctPuff.disabled = true;
    }
  };

  dom.viewNct.querySelector('#btn-nct-left').addEventListener('click', () => moveNctRing(-8, 0));
  dom.viewNct.querySelector('#btn-nct-right').addEventListener('click', () => moveNctRing(8, 0));
  dom.viewNct.querySelector('#btn-nct-up').addEventListener('click', () => moveNctRing(0, -8));
  dom.viewNct.querySelector('#btn-nct-down').addEventListener('click', () => moveNctRing(0, 8));

  dom.btnNctPuff.addEventListener('click', () => {
    // Air puff logic
    playPuff();
    
    // Visual flash screen
    const flash = document.getElementById('nct-puff-flash');
    flash.classList.add('flash-active');
    setTimeout(() => flash.classList.remove('flash-active'), 300);

    const iopVal = patient.iop[nctEye];
    nctMeasurements[nctEye] = `${iopVal} mmHg`;

    if (nctEye === 'OD') {
      dom.nctPressure.innerText = `OD: ${nctMeasurements.OD} | OS: -- mmHg`;
      nctEye = 'OS';
      nctOffset = { x: -40, y: 35 }; // Reset offset to unaligned for OS
      moveNctRing(0, 0); // Trigger update
      speakText("Don't blink, now checking the left eye.", 'doctor', selectedDoctor.gender, null, 'nct_eye_switch');
    } else {
      dom.nctPressure.innerText = `OD: ${nctMeasurements.OD} | OS: ${nctMeasurements.OS}`;
      dom.btnNctPuff.disabled = true;
      dom.nctStatus.innerText = "TEST COMPLETE";
      dom.nctStatus.className = "status-active";
      speakText("All done with eye pressure, thank you.", 'doctor', selectedDoctor.gender, null, 'nct_finished');
      dom.hudObjective.innerText = "NCT done. Exit the viewfinder, guide patient into Exam Room (right) and click the Refraction Bench.";
    }
  });

  dom.btnNctExit.addEventListener('click', () => {
    exitMachineView();
  });

  // Phoropter Controls
  dom.tabOD.addEventListener('click', () => {
    phoropterEye = 'OD';
    dom.tabOD.classList.add('active');
    dom.tabOS.classList.remove('active');
    updatePhoropterDials();
  });

  dom.tabOS.addEventListener('click', () => {
    phoropterEye = 'OS';
    dom.tabOS.classList.add('active');
    dom.tabOD.classList.remove('active');
    updatePhoropterDials();
  });

  // Dials increments
  const dialChange = (field, delta) => {
    playBeep(700, 0.05);
    let val = phoropterLens[phoropterEye][field];
    if (field === 'sph' || field === 'cyl') {
      val = Math.max(-7.00, Math.min(4.00, val + delta));
    } else if (field === 'ax') {
      val = (val + delta + 180) % 180;
      if (val === 0) val = 180;
    }
    phoropterLens[phoropterEye][field] = val;
    updatePhoropterDials();
    updateChartBlur();
  };

  dom.btnSphDec.addEventListener('click', () => dialChange('sph', -0.25));
  dom.btnSphInc.addEventListener('click', () => dialChange('sph', 0.25));
  dom.btnCylDec.addEventListener('click', () => dialChange('cyl', -0.25));
  dom.btnCylInc.addEventListener('click', () => dialChange('cyl', 0.25));
  dom.btnAxDec.addEventListener('click', () => dialChange('ax', -5));
  dom.btnAxInc.addEventListener('click', () => dialChange('ax', 5));

  // Present Lens Comparisons (Subjective Refraction)
  dom.btnPresent1.addEventListener('click', () => {
    playBeep(900, 0.08);
    playWhir(0.2);
    // Deep clone current lens setting to Lens 1
    comparisonLenses.lens1 = JSON.parse(JSON.stringify(phoropterLens[phoropterEye]));
    dom.btnPresent1.innerText = "Option 1 Stored";
    setTimeout(() => dom.btnPresent1.innerText = "Present Option 1", 1500);
  });

  dom.btnPresent2.addEventListener('click', () => {
    playBeep(900, 0.08);
    playWhir(0.2);
    // Deep clone current lens setting to Lens 2
    comparisonLenses.lens2 = JSON.parse(JSON.stringify(phoropterLens[phoropterEye]));
    dom.btnPresent2.innerText = "Option 2 Stored";
    setTimeout(() => dom.btnPresent2.innerText = "Present Option 2", 1500);
  });

  dom.btnCompareQuery.addEventListener('click', () => {
    // Speak query
    speakText("Which is better: choice 1, or choice 2?", 'doctor', selectedDoctor.gender, () => {
      // Patient feedback
      const feedbackObj = patient.compareLenses(comparisonLenses.lens1, comparisonLenses.lens2, phoropterEye);
      const textVal = feedbackObj.text || feedbackObj;
      const keyVal = feedbackObj.audioKey || null;
      speakText(textVal, 'patient', 'female', null, keyVal);
      showDialogueBox("Patient", textVal);
    }, 'lens_choice_question');
  });

  // Projector Controls
  dom.btnProjectorPower.addEventListener('click', () => {
    playBeep(800, 0.1);
    projectorOn = !projectorOn;
    if (projectorOn) {
      dom.chartContent.classList.remove('chart-off');
      dom.btnProjectorPower.innerText = "Projector Off";
      dom.selectChartLine.disabled = false;
      dom.btnChartRead.disabled = false;
      updateChartBlur();
    } else {
      dom.chartContent.classList.add('chart-off');
      dom.chartLetters.innerText = "SNELLEN PROJECTOR STANDBY";
      dom.chartLineLbl.innerText = "LINE: --";
      dom.btnProjectorPower.innerText = "Projector On";
      dom.selectChartLine.disabled = true;
      dom.btnChartRead.disabled = true;
    }
  });

  dom.selectChartLine.addEventListener('change', (e) => {
    currentAcuityLine = parseInt(e.target.value);
    updateChartBlur();
  });

  dom.btnChartRead.addEventListener('click', () => {
    speakText("Please read the lowest line you can see.", 'doctor', selectedDoctor.gender, () => {
      const curLens = phoropterLens[phoropterEye];
      const result = patient.readSnellenLine(currentAcuityLine, curLens.sph, curLens.cyl, curLens.ax, phoropterEye);
      
      speakText(result.text, 'patient', 'female', null, result.audioKey);
      showDialogueBox("Patient", result.text);
    }, 'acuity_question');
  });

  // Finalize Prescription & exit
  dom.btnExamFinalize.addEventListener('click', () => {
    playBeep(1000, 0.2);
    playWhir(1.0);
    
    // Fill printable paper summary
    dom.reportClinician.innerText = selectedDoctor.name;
    dom.reportSig.innerText = selectedDoctor.name.split(',')[0];
    
    dom.tdArOD.innerText = arMeasurements.OD || 'Not Measured';
    dom.tdArOS.innerText = arMeasurements.OS || 'Not Measured';
    dom.tdNctOD.innerText = nctMeasurements.OD || 'Not Measured';
    dom.tdNctOS.innerText = nctMeasurements.OS || 'Not Measured';
    
    const rxOD = phoropterLens.OD;
    dom.tdRxODSph.innerText = `${rxOD.sph > 0 ? '+' : ''}${rxOD.sph.toFixed(2)}`;
    dom.tdRxODCyl.innerText = rxOD.cyl.toFixed(2);
    dom.tdRxODAx.innerText = `${rxOD.ax}°`;
    
    const rxOS = phoropterLens.OS;
    dom.tdRxOSSph.innerText = `${rxOS.sph > 0 ? '+' : ''}${rxOS.sph.toFixed(2)}`;
    dom.tdRxOSCyl.innerText = rxOS.cyl.toFixed(2);
    dom.tdRxOSAx.innerText = `${rxOS.ax}°`;

    // Compute VA achieved
    const odBlur = patient.calculateBlurIndex(rxOD.sph, rxOD.cyl, rxOD.ax, 'OD');
    const osBlur = patient.calculateBlurIndex(rxOS.sph, rxOS.cyl, rxOS.ax, 'OS');
    const odVA = patient.getVisualAcuityLine(odBlur);
    const osVA = patient.getVisualAcuityLine(osBlur);
    
    dom.tdRxODVa.innerText = `20/${odVA}`;
    dom.tdRxOSVa.innerText = `20/${osVA}`;

    // Diagnostic Evaluation Score
    let evalScore = 0;
    const diffODSph = Math.abs(rxOD.sph - patient.trueRx.OD.sph);
    const diffODCyl = Math.abs(rxOD.cyl - patient.trueRx.OD.cyl);
    const diffOSSph = Math.abs(rxOS.sph - patient.trueRx.OS.sph);
    const diffOSCyl = Math.abs(rxOS.cyl - patient.trueRx.OS.cyl);

    let clinicalNotes = "";
    if (diffODSph <= 0.25 && diffODCyl <= 0.25 && diffOSSph <= 0.25 && diffOSCyl <= 0.25) {
      clinicalNotes = "EXCELLENT DIAGNOSIS. Your finalized glasses prescription perfectly matches the patient's biological error. Visual acuity was fully restored to 20/20 or better. The patient will experience comfortable, headache-free vision.";
    } else if (diffODSph <= 0.5 && diffOSSph <= 0.5) {
      clinicalNotes = "ACCEPTABLE RX. The prescription is close enough to resolve primary defocus issues. The patient might experience minor squinting or slight astigmatic blur, but distance vision will be functional (20/25).";
    } else {
      clinicalNotes = "DIAGNOSTIC ERROR / MISMATCH. The final prescription deviates significantly from the patient's actual refractive error. The patient will continue to experience headaches, double vision, or distance blur. Recommend retraining on subjective phoropter comparisons.";
    }

    dom.reportEvaluation.innerText = clinicalNotes;

    // Transition to report screen
    dom.viewPhoropter.classList.add('hidden');
    dom.viewReport.classList.add('active');
    state = 'report';
  });

  dom.btnExamExit.addEventListener('click', () => {
    exitMachineView();
  });

  dom.btnRestart.addEventListener('click', () => {
    playBeep(600, 0.15);
    window.location.reload();
  });
}

function updatePhoropterDials() {
  const current = phoropterLens[phoropterEye];
  dom.lblSph.innerText = `${current.sph > 0 ? '+' : ''}${current.sph.toFixed(2)}`;
  dom.lblCyl.innerText = current.cyl.toFixed(2);
  dom.lblAx.innerText = `${current.ax}°`;
}

function updateChartBlur() {
  if (!projectorOn) return;
  
  const curLens = phoropterLens[phoropterEye];
  const blurIndex = patient.calculateBlurIndex(curLens.sph, curLens.cyl, curLens.ax, phoropterEye);
  
  // Calculate text scale based on Snellen size
  const scaleRatio = currentAcuityLine / 20; // 20/20 is base size
  dom.chartLetters.innerText = SNELLEN_CHART[currentAcuityLine];
  dom.chartLineLbl.innerText = `LINE: 20/${currentAcuityLine}`;
  
  // Font scaling
  const baseSize = 24; // pixels
  dom.chartLetters.style.fontSize = `${baseSize * scaleRatio}px`;
  
  // Blur filter simulating optical defocus inside phoropter
  // Blur scale: diopters of blur mapped to pixels
  const pxBlur = blurIndex * 5.5; 
  dom.chartLetters.style.filter = `blur(${pxBlur}px)`;
}

// --- HOTSPOT / MACHINE ACTIONS ---
function triggerActiveHotspot() {
  const currentHotspot = checkHotspotsNearPlayer();
  if (!currentHotspot) return;

  if (currentHotspot.action === 'receptionist-interact') {
    playBeep(800, 0.1);
    showDialogueBox("Receptionist", "Hello doctor, the patient's ready for you.");
    speakText("Hello doctor, the patient's ready for you.", 'receptionist', 'female', null, 'receptionist_greeting');
  }

  else if (currentHotspot.action === 'patient-interact') {
    if (patientFollow) return; // Already greeted and following, do not repeat greeting!
    
    // Talk to patient
    playBeep(800, 0.1);
    
    // Doctor introduces themselves and asks to follow
    const docShortName = selectedDoctor.name.split(',')[0];
    showDialogueBox(docShortName, `Hello! I am ${docShortName}. Let's head back to the pre-testing room for some initial measurements.`);
    speakText(`Hello! I am ${docShortName}. Let's head back to the pre-testing room for some initial measurements.`, 'doctor', selectedDoctor.gender, null, 'patient_greeting');
  } 
  
  else if (currentHotspot.action === 'ar-enter') {
    playBeep(900, 0.1);
    playWhir(0.75);
    
    // Place patient at machine (now facing North, Math.PI)
    movePatientToStool(-1.8, 4.3, Math.PI);
    
    // Set up camera interpolation
    startCameraTransition(
      camera.position.clone(),
      camera.position.clone().add(new THREE.Vector3(Math.cos(pitch)*Math.sin(yaw), Math.sin(pitch), Math.cos(pitch)*Math.cos(yaw))),
      new THREE.Vector3(-1.8, 1.25, 2.7), // doctor eyepiece height
      new THREE.Vector3(-1.8, 1.20, 3.5),  // look forward at visor
      'autorefractor'
    );
  } 
  
  else if (currentHotspot.action === 'nct-enter') {
    playBeep(900, 0.1);
    playWhir(0.75);
    
    movePatientToStool(1.8, 4.3, Math.PI);

    startCameraTransition(
      camera.position.clone(),
      camera.position.clone().add(new THREE.Vector3(Math.cos(pitch)*Math.sin(yaw), Math.sin(pitch), Math.cos(pitch)*Math.cos(yaw))),
      new THREE.Vector3(1.8, 1.25, 2.7), 
      new THREE.Vector3(1.8, 1.20, 3.5), 
      'nct'
    );
  } 
  
  else if (currentHotspot.action === 'phoropter-enter') {
    playBeep(900, 0.1);
    playWhir(0.75);
    
    // Place patient sitting at refraction chair (X = 9.2, Z = 3)
    movePatientToExamChair();

    startCameraTransition(
      camera.position.clone(),
      camera.position.clone().add(new THREE.Vector3(Math.cos(pitch)*Math.sin(yaw), Math.sin(pitch), Math.cos(pitch)*Math.cos(yaw))),
      new THREE.Vector3(8.0, 1.28, -0.6), // doctor stool
      new THREE.Vector3(9.2, 1.3, 3.0),  // looking at patient
      'phoropter'
    );
  }
}

function startCameraTransition(startP, startT, targetP, targetT, nextState) {
  state = nextState + '-zoom';
  camStartPos.copy(startP);
  camStartTarget.copy(startT);
  camTargetPos.copy(targetP);
  camTargetTarget.copy(targetT);
  transitionT = 0;
  dom.hud.classList.add('hidden');
}

function exitMachineView() {
  playBeep(700, 0.15);
  
  // Hide all machine HTML overlays immediately
  dom.viewAr.classList.add('hidden');
  dom.viewNct.classList.add('hidden');
  dom.viewPhoropter.classList.add('hidden');
  
  // Set up transition back to roam position
  // Move patient to follow doctor again if they were follow-enabled
  if (patientFollow) {
    setPatientPose('standing');
  }

  // Camera stands back up behind table
  let backPos = camera.position.clone();
  backPos.z -= 1.0; // backup slightly
  
  startCameraTransition(
    camera.position.clone(),
    camTargetTarget.clone(),
    new THREE.Vector3(camera.position.x, playerHeight, camera.position.z - 1.2),
    new THREE.Vector3(camera.position.x, playerHeight, camera.position.z - 4),
    'roam'
  );
}

// Subtitle drawer
function showDialogueBox(speaker, text) {
  dom.speakerName.innerText = speaker;
  dom.speakerText.innerText = `"${text}"`;
  dom.dialogueBox.classList.remove('hidden');
}

// 3D Patient posture/position switches
function playPatientAnimation(name) {
  if (!patientMixer || Object.keys(patientAnimations).length === 0) return;
  const action = patientAnimations[name.toLowerCase()];
  if (action) {
    // Fade out other animations
    Object.values(patientAnimations).forEach(a => {
      if (a !== action) a.fadeOut(0.2);
    });
    action.reset().fadeIn(0.2).play();
  }
}

function setPatientPose(pose) {
  if (!patientMesh3D) return;

  if (hasGltfPatient) {
    if (pose === 'standing') {
      if (hasGltfPatientSitting && patientSittingMesh3D) {
        patientSittingMesh3D.visible = false;
        patientMesh3D.visible = true;
      }
      patientMesh3D.position.y = 0.0;
      playPatientAnimation('stand');
    }
    return;
  }

  const torso = patientMesh3D.children[2];
  const head = patientMesh3D.children[3];
  const hair = patientMesh3D.children[4];
  const eyeL = patientMesh3D.children[5];
  const eyeR = patientMesh3D.children[6];
  const glasses = patientMesh3D.children[7];
  const armL = patientMesh3D.children[8];
  const armR = patientMesh3D.children[9];
  const leftLeg = patientMesh3D.children[0];
  const rightLeg = patientMesh3D.children[1];

  // Remove shins if standing
  const shinL = patientMesh3D.getObjectByName('shinL');
  const shinR = patientMesh3D.getObjectByName('shinR');

  if (pose === 'standing') {
    // Heights
    torso.position.y = 1.075;
    head.position.y = 1.55;
    hair.position.set(0, 1.62, 0.02);
    eyeL.position.set(-0.08, 1.57, -0.18);
    eyeR.position.set(0.08, 1.57, -0.18);
    glasses.position.set(0, 1.57, -0.19);
    
    // Legs straight
    leftLeg.rotation.x = 0;
    leftLeg.position.set(-0.16, 0.35, 0);
    rightLeg.rotation.x = 0;
    rightLeg.position.set(0.16, 0.35, 0);

    if (shinL) patientMesh3D.remove(shinL);
    if (shinR) patientMesh3D.remove(shinR);

    // Arms hanging down
    armL.rotation.x = 0;
    armL.position.set(-0.31, 1.1, 0);
    armR.rotation.x = 0;
    armR.position.set(0.31, 1.1, 0);

    // Adjust group y-offset so standing on floor
    patientMesh3D.position.y = 0.15; 
  }
}

function movePatientToStool(x, z, rotationY) {
  patientFollow = false;
  
  // Transition to sitting pose
  setPatientPoseSitting();
  
  if (hasGltfPatientSitting && patientSittingMesh3D) {
    patientSittingMesh3D.position.set(x, 0.0, z);
    patientSittingMesh3D.rotation.y = rotationY;
    patientMesh3D.position.set(x, 0.0, z);
    patientMesh3D.rotation.y = rotationY;
  } else {
    const yVal = hasGltfPatient ? 0.0 : 0.15;
    patientMesh3D.position.set(x, yVal, z);
    patientMesh3D.rotation.y = rotationY;
  }
}

function movePatientToExamChair() {
  patientFollow = false;
  setPatientPoseSitting();
  
  if (hasGltfPatientSitting && patientSittingMesh3D) {
    patientSittingMesh3D.position.set(9.2, 0.3, 3.0);
    patientSittingMesh3D.rotation.y = Math.PI;
    patientMesh3D.position.set(9.2, 0.0, 3.0);
    patientMesh3D.rotation.y = Math.PI;
  } else {
    const yVal = hasGltfPatient ? 0.0 : 0.45;
    patientMesh3D.position.set(9.2, yVal, 3.0);
    patientMesh3D.rotation.y = Math.PI; // Face Doctor (South)
  }
}

function setPatientPoseSitting() {
  if (!patientMesh3D) return;

  if (hasGltfPatient) {
    if (hasGltfPatientSitting && patientSittingMesh3D) {
      patientMesh3D.visible = false;
      patientSittingMesh3D.visible = true;
    }
    patientMesh3D.position.y = 0.0;
    playPatientAnimation('sit');
    return;
  }

  const torso = patientMesh3D.children[2];
  const head = patientMesh3D.children[3];
  const hair = patientMesh3D.children[4];
  const eyeL = patientMesh3D.children[5];
  const eyeR = patientMesh3D.children[6];
  const glasses = patientMesh3D.children[7];
  const armL = patientMesh3D.children[8];
  const armR = patientMesh3D.children[9];
  const leftLeg = patientMesh3D.children[0];
  const rightLeg = patientMesh3D.children[1];

  torso.position.y = 0.85;
  head.position.y = 1.3255;
  hair.position.set(0, 1.3955, 0.02);
  eyeL.position.set(-0.08, 1.3455, -0.18);
  eyeR.position.set(0.08, 1.3455, -0.18);
  glasses.position.set(0, 1.3455, -0.19);
  
  leftLeg.rotation.x = -Math.PI / 2;
  leftLeg.position.set(-0.16, 0.75, -0.3);
  rightLeg.rotation.x = -Math.PI / 2;
  rightLeg.position.set(0.16, 0.75, -0.3);

  // Add shins if not present
  let shinL = patientMesh3D.getObjectByName('shinL');
  let shinR = patientMesh3D.getObjectByName('shinR');
  
  if (!shinL) {
    const legMat = leftLeg.material;
    shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), legMat);
    shinL.name = 'shinL';
    shinL.position.set(-0.16, 0.45, -0.6);
    patientMesh3D.add(shinL);
  }
  if (!shinR) {
    const legMat = rightLeg.material;
    shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), legMat);
    shinR.name = 'shinR';
    shinR.position.set(0.16, 0.45, -0.6);
    patientMesh3D.add(shinR);
  }

  armL.rotation.x = -0.3;
  armL.position.set(-0.31, 0.9, -0.15);
  armR.rotation.x = -0.3;
  armR.position.set(0.31, 0.9, -0.15);
}

// --- HELPER LOGICS: COLLISION AND HOTSPOTS ---
function checkCollision(newPos) {
  // Check bounds first
  if (newPos.x < -11.5 || newPos.x > 11.5 || newPos.z < -5.5 || newPos.z > 5.5) {
    return true;
  }
  
  // Check against static furniture colliders in clinicBuilder
  for (let i = 0; i < clinicBuilder.colliders.length; i++) {
    const col = clinicBuilder.colliders[i];
    
    // Since everything is simple boxes, check bounding box overlaps
    const box = new THREE.Box3().setFromObject(col);
    
    // Player is represented as an AABB for speed
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newPos.x - playerRadius, 0, newPos.z - playerRadius),
      new THREE.Vector3(newPos.x + playerRadius, 2.0, newPos.z + playerRadius)
    );
    
    if (box.intersectsBox(playerBox)) {
      return true; // Collision detected!
    }
  }
  return false;
}

function checkHotspotsNearPlayer() {
  for (let i = 0; i < clinicBuilder.hotspots.length; i++) {
    const hot = clinicBuilder.hotspots[i];
    
    // Calculate 2D distance on the horizontal plane
    const dx = camera.position.x - hot.position.x;
    const dz = camera.position.z - hot.position.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);
    
    if (dist2D < hot.radius) {
      return hot;
    }
  }
  return null;
}

// --- ANIMATION / GAME LOOP ---
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  if (patientMixer) {
    patientMixer.update(delta);
  }
  
  if (state === 'roam') {
    handlePlayerMovement();
    handlePatientFollow();
    updateHUDInteractiveToast();
  } 
  
  else if (state === 'doctor-select') {
    handleDoctorSelectionState();
  }
  
  else if (state.endsWith('-zoom')) {
    handleCameraInterpolation();
  }
  
  // Render
  renderer.render(scene, camera);
}

// Variables to hold card target states for interpolation
let femaleTargetZ = -3.0;
let femaleTargetRotY = 0;
let maleTargetZ = -3.0;
let maleTargetRotY = 0;

function handleDoctorSelectionState() {
  if (!femaleCardMesh || !maleCardMesh) return;
  
  docSelectRaycaster.setFromCamera(docSelectMouse, camera);
  
  // Intersection check
  const intersectsL = docSelectRaycaster.intersectObjects(femaleCardMesh.children);
  const intersectsR = docSelectRaycaster.intersectObjects(maleCardMesh.children);
  
  if (intersectsL.length > 0) {
    hoveredDoc = 'female';
    femaleTargetZ = -2.3;
    femaleTargetRotY = 0.15;
    
    maleTargetZ = -3.0;
    maleTargetRotY = 0;
    
    dom.lblFemaleDoc.classList.add('active-hover');
    dom.lblMaleDoc.classList.remove('active-hover');
  } else if (intersectsR.length > 0) {
    hoveredDoc = 'male';
    maleTargetZ = -2.3;
    maleTargetRotY = -0.15;
    
    femaleTargetZ = -3.0;
    femaleTargetRotY = 0;
    
    dom.lblMaleDoc.classList.add('active-hover');
    dom.lblFemaleDoc.classList.remove('active-hover');
  } else {
    hoveredDoc = null;
    femaleTargetZ = -3.0;
    femaleTargetRotY = 0;
    maleTargetZ = -3.0;
    maleTargetRotY = 0;
    
    dom.lblFemaleDoc.classList.remove('active-hover');
    dom.lblMaleDoc.classList.remove('active-hover');
  }
  
  // Lerp positions and rotations
  const lerpFactor = 0.1;
  femaleCardMesh.position.z += (femaleTargetZ - femaleCardMesh.position.z) * lerpFactor;
  femaleCardMesh.rotation.y += (femaleTargetRotY - femaleCardMesh.rotation.y) * lerpFactor;
  
  maleCardMesh.position.z += (maleTargetZ - maleCardMesh.position.z) * lerpFactor;
  maleCardMesh.rotation.y += (maleTargetRotY - maleCardMesh.rotation.y) * lerpFactor;
  
  // Sine float Y
  const floatTime = Date.now() * 0.003;
  femaleCardMesh.position.y = 1.3 + Math.sin(floatTime) * 0.04;
  maleCardMesh.position.y = 1.3 + Math.cos(floatTime + 1) * 0.04;
}

function handlePlayerMovement() {
  const moveVector = new THREE.Vector3();
  
  // WASD controls relative to camera looking angle (yaw)
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const right = new THREE.Vector3(Math.sin(yaw - Math.PI / 2), 0, Math.cos(yaw - Math.PI / 2)).normalize();

  if (keys.w) moveVector.add(forward);
  if (keys.s) moveVector.add(forward.clone().negate());
  if (keys.a) moveVector.add(right.clone().negate());
  if (keys.d) moveVector.add(right);

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(playerSpeed);
    
    // Proposed new position
    const nextPos = camera.position.clone().add(moveVector);
    
    // Run collision check
    if (!checkCollision(nextPos)) {
      camera.position.copy(nextPos);
    }
  }

  // Update camera orientation
  const target = new THREE.Vector3();
  target.x = camera.position.x + Math.sin(yaw) * Math.cos(pitch);
  target.y = camera.position.y + Math.sin(pitch);
  target.z = camera.position.z + Math.cos(yaw) * Math.cos(pitch);
  camera.lookAt(target);
}

function handlePatientFollow() {
  if (!patientFollow || !patientMesh3D) return;

  // Patient follows player but stays 1.8 meters behind
  const dist = patientMesh3D.position.distanceTo(camera.position);
  if (dist > 1.8) {
    const dir = new THREE.Vector3().subVectors(camera.position, patientMesh3D.position).normalize();
    
    // Ground movement only
    dir.y = 0;
    patientMesh3D.position.add(dir.multiplyScalar(0.045));
    
    // Look at player
    const lookTarget = camera.position.clone();
    lookTarget.y = patientMesh3D.position.y;
    patientMesh3D.lookAt(lookTarget);
    
    if (hasGltfPatient && patientAnimations.walk) {
      playPatientAnimation('walk');
      patientMesh3D.position.y = 0.0;
    } else {
      // Animate subtle walking bounce
      const time = Date.now() * 0.008;
      patientMesh3D.position.y = 0.15 + Math.abs(Math.sin(time)) * 0.08;
    }
  } else {
    if (hasGltfPatient) {
      if (patientAnimations.idle && patientAnimations.idle !== patientAnimations.walk) {
        playPatientAnimation('idle');
      } else {
        // Freeze walk animation at standing pose when still
        if (patientMixer) {
          patientMixer.stopAllAction();
        }
      }
      patientMesh3D.position.y = 0.0;
    } else {
      // Smooth idle breathing
      patientMesh3D.position.y = 0.15 + Math.sin(Date.now() * 0.002) * 0.01;
    }
  }
}

function updateHUDInteractiveToast() {
  const hot = checkHotspotsNearPlayer();
  if (hot) {
    dom.crosshair.className = "crosshair-hover";
    dom.interactAction.innerText = hot.name;
    dom.interactToast.classList.remove('hidden');
  } else {
    dom.crosshair.className = "crosshair-normal";
    dom.interactToast.classList.add('hidden');
  }
}

function handleCameraInterpolation() {
  transitionT += 1;
  const progress = transitionT / transitionDuration;
  
  // Smooth sine step interpolation
  const ease = Math.sin(progress * Math.PI / 2);

  // Position interpolation
  const currentPos = new THREE.Vector3().lerpVectors(camStartPos, camTargetPos, ease);
  camera.position.copy(currentPos);

  // LookAt interpolation
  const currentTarget = new THREE.Vector3().lerpVectors(camStartTarget, camTargetTarget, ease);
  camera.lookAt(currentTarget);

  if (transitionT >= transitionDuration) {
    // Zoom complete, activate UI
    const targetState = state.replace('-zoom', '');
    state = targetState;
    
    if (state === 'roam-init') {
      startGameSession();
      return;
    }
    
    if (state === 'roam') {
      dom.hud.classList.remove('hidden');
      
      // Update heading yaw/pitch to prevent sudden camera snap back
      const dir = new THREE.Vector3().subVectors(camTargetTarget, camTargetPos).normalize();
      yaw = Math.atan2(dir.x, dir.z);
      pitch = Math.asin(dir.y);
    } 
    
    else if (state === 'autorefractor') {
      arEye = 'OD';
      arFocusValue = 10;
      dom.arSliderFocus.value = 10;
      dom.arPrescription.innerText = "OD: --.-- | OS: --.--";
      dom.btnArMeasure.disabled = false;
      dom.arStatus.innerText = "ALIGN / FOCUS RING";
      dom.arStatus.className = "status-warning";
      dom.arBalloon.style.filter = "blur(12px)";
      dom.viewAr.classList.remove('hidden');
      
      speakText("Please place your chin on the rest and look into the screen. Keep looking at the hot air balloon.", 'doctor', selectedDoctor.gender, null, 'ar_intro');
    } 
    
    else if (state === 'nct') {
      nctEye = 'OD';
      nctOffset = { x: 50, y: -45 };
      dom.nctRing.style.left = `calc(50% + ${nctOffset.x}px)`;
      dom.nctRing.style.top = `calc(50% + ${nctOffset.y}px)`;
      dom.nctStatus.innerText = "ALIGN TARGET";
      dom.nctStatus.className = "status-warning";
      dom.btnNctPuff.disabled = true;
      dom.nctPressure.innerText = "OD: -- mmHg | OS: -- mmHg";
      dom.viewNct.classList.remove('hidden');

      speakText("Now look at the small red dot in the center of the ring. You'll feel a tiny puff of air.", 'doctor', selectedDoctor.gender, null, 'nct_intro');
    } 
    
    else if (state === 'phoropter') {
      phoropterEye = 'OD';
      phoropterLens.OD = { sph: 0.00, cyl: 0.00, ax: 180 };
      phoropterLens.OS = { sph: 0.00, cyl: 0.00, ax: 180 };
      updatePhoropterDials();
      
      projectorOn = false;
      dom.chartContent.classList.add('chart-off');
      dom.btnProjectorPower.innerText = "Projector On";
      dom.selectChartLine.disabled = true;
      dom.btnChartRead.disabled = true;
      dom.viewPhoropter.classList.remove('hidden');

      // Trigger user speech first
      speakText("Have you been experiencing any vision issues lately?", 'doctor', selectedDoctor.gender, () => {
        speakText(patient.complaint, 'patient', 'female', null, patient.complaintAudioKey);
        showDialogueBox("Patient", patient.complaint);
      }, 'history_question');
      showDialogueBox(selectedDoctor.name.split(',')[0], "Have you been experiencing any vision issues lately?");
      
      dom.hudObjective.innerText = "Subjective Refraction: Turn on Projector, dial lenses to match true Rx, select 20/20 line, and read!";
    }
  }
}

// Start everything
init();
