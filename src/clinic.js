// 3D Clinic Environment Builder using Three.js primitive meshes and procedural canvas textures
import * as THREE from 'three';

// 1. Procedural Texture Generators
function createTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill tile base color (pure bright white porcelain tile)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  
  // Draw subtle high-end porcelain noise/sheen inside tiles
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(226,232,240,0.25)';
    ctx.fillRect(x, y, size, size);
  }

  // Draw crisp light silver tile grout lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 12);
  return texture;
}

function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Warm brown base
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 256, 256);
  
  // Wood grain stripes
  ctx.fillStyle = '#451a03';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 256;
    const height = Math.random() * 15 + 2;
    ctx.fillRect(0, y, 256, height);
  }
  
  // Blur effect for soft grain
  ctx.fillStyle = 'rgba(120,53,15,0.3)';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(Math.random() * 256, 0, Math.random() * 40, 256);
  }

  return new THREE.CanvasTexture(canvas);
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Pure white drywall base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  
  // Subtle plaster noise
  ctx.fillStyle = 'rgba(241,245,249,0.3)';
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  
  return new THREE.CanvasTexture(canvas);
}

// 2. Main Builder Class
export class ClinicBuilder {
  constructor(scene) {
    this.scene = scene;
    
    // Cache materials
    this.materials = {
      floor: new THREE.MeshStandardMaterial({ 
        map: createTileTexture(),
        roughness: 0.1,
        metalness: 0.05
      }),
      wall: new THREE.MeshStandardMaterial({ 
        map: createWallTexture(), 
        color: 0xffffff,
        roughness: 0.85 
      }),
      divider: new THREE.MeshStandardMaterial({ 
        map: createWallTexture(),
        color: 0xffffff, // White partition walls
        roughness: 0.85
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.95
      }),
      blueAccent: new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Vibrant clinical blue accent band on top
        roughness: 0.3,
        metalness: 0.1
      }),
      wood: new THREE.MeshStandardMaterial({ 
        map: createWoodTexture(), 
        roughness: 0.6 
      }),
      metalSleek: new THREE.MeshStandardMaterial({ 
        color: 0x94a3b8, 
        roughness: 0.2, 
        metalness: 0.8 
      }),
      metalChrome: new THREE.MeshStandardMaterial({ 
        color: 0xe2e8f0, 
        roughness: 0.05, 
        metalness: 0.95 
      }),
      screenGlass: new THREE.MeshStandardMaterial({ 
        color: 0x020617, 
        roughness: 0.1, 
        emissive: 0x093356
      }),
      cushionBlue: new THREE.MeshStandardMaterial({ 
        color: 0x1e3a8a, 
        roughness: 0.8 
      }),
      cushionOrange: new THREE.MeshStandardMaterial({ 
        color: 0xc2410c, 
        roughness: 0.8 
      }),
      whitePlastic: new THREE.MeshStandardMaterial({ 
        color: 0xf1f5f9, 
        roughness: 0.3 
      })
    };

    // Keep track of collidable objects
    this.colliders = [];
    // Keep track of interactable hotspots
    // Form: { name: string, position: Vector3, radius: number, action: string, mesh: Object3D }
    this.hotspots = [];
  }

  buildAll() {
    this.buildStructure();
    this.buildWaitingRoom();
    this.buildPreTestingRoom();
    this.buildExamRoom();
  }

  buildStructure() {
    // 1. Floor (24m wide x 12m deep - White Porcelain Tile)
    const floorGeo = new THREE.PlaneGeometry(24, 12);
    const floor = new THREE.Mesh(floorGeo, this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling Plane (24m wide x 12m deep at Y = 3.5 facing down)
    const ceilingGeo = new THREE.PlaneGeometry(24, 12);
    const ceiling = new THREE.Mesh(ceilingGeo, this.materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.5;
    this.scene.add(ceiling);

    // 2. Exterior Walls (Z = -6, Z = 6, X = -12, X = 12)
    const wallHeight = 3.5;
    const wallGeoBack = new THREE.PlaneGeometry(24, wallHeight);
    const wallBack = new THREE.Mesh(wallGeoBack, this.materials.wall);
    wallBack.position.set(0, wallHeight / 2, -6);
    this.scene.add(wallBack);

    const wallGeoFront = new THREE.PlaneGeometry(24, wallHeight);
    const wallFront = new THREE.Mesh(wallGeoFront, this.materials.wall);
    wallFront.rotation.y = Math.PI;
    wallFront.position.set(0, wallHeight / 2, 6);
    this.scene.add(wallFront);

    const wallGeoSide = new THREE.PlaneGeometry(12, wallHeight);
    const wallLeft = new THREE.Mesh(wallGeoSide, this.materials.wall);
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.position.set(-12, wallHeight / 2, 0);
    this.scene.add(wallLeft);

    const wallRight = new THREE.Mesh(wallGeoSide, this.materials.wall);
    wallRight.rotation.y = -Math.PI / 2;
    wallRight.position.set(12, wallHeight / 2, 0);
    this.scene.add(wallRight);

    // 3. Top Blue Accent Trim Bands (along top of all exterior walls near ceiling)
    const trimHeight = 0.18;
    const trimY = wallHeight - trimHeight / 2; // Y = 3.41
    
    // Back wall blue trim
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(24, trimHeight, 0.05), this.materials.blueAccent);
    trimBack.position.set(0, trimY, -5.97);
    this.scene.add(trimBack);

    // Front wall blue trim
    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(24, trimHeight, 0.05), this.materials.blueAccent);
    trimFront.position.set(0, trimY, 5.97);
    this.scene.add(trimFront);

    // Left wall blue trim
    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, trimHeight, 12), this.materials.blueAccent);
    trimLeft.position.set(-11.97, trimY, 0);
    this.scene.add(trimLeft);

    // Right wall blue trim
    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, trimHeight, 12), this.materials.blueAccent);
    trimRight.position.set(11.97, trimY, 0);
    this.scene.add(trimRight);

    // Add boundaries to colliders
    this.createInvisibleBoundary(-12, 0, 0.5, 12, 'left-boundary');
    this.createInvisibleBoundary(12, 0, 0.5, 12, 'right-boundary');
    this.createInvisibleBoundary(0, -6, 24, 0.5, 'back-boundary');
    this.createInvisibleBoundary(0, 6, 24, 0.5, 'front-boundary');

    // 4. Room Partitions (Dividing Clinic into 3 rooms: Waiting, Pretesting, Exam)
    // Left partition at X = -4 (Leaving a door gap from Z = -2 to Z = 2)
    this.buildPartitionWithDoor(-4, 0.2, 12, wallHeight, 3.5); // gap is size 3.5 in center
    // Right partition at X = 4
    this.buildPartitionWithDoor(4, 0.2, 12, wallHeight, 3.5);
  }

  createInvisibleBoundary(x, z, w, d, name) {
    const geo = new THREE.BoxGeometry(w, 4, d);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 2, z);
    this.scene.add(mesh);
    this.colliders.push(mesh);
  }

  buildPartitionWithDoor(x, thickness, length, height, gapSize) {
    // We make two wall sections on either side of the doorway
    const sectLength = (length - gapSize) / 2; // e.g. (12 - 3.5)/2 = 4.25
    
    // Back section (from Z = -6 to Z = -1.75)
    const geo1 = new THREE.BoxGeometry(thickness, height, sectLength);
    const wall1 = new THREE.Mesh(geo1, this.materials.divider);
    wall1.position.set(x, height / 2, -6 + sectLength / 2);
    this.scene.add(wall1);
    this.colliders.push(wall1);

    // Front section (from Z = 1.75 to Z = 6)
    const geo2 = new THREE.BoxGeometry(thickness, height, sectLength);
    const wall2 = new THREE.Mesh(geo2, this.materials.divider);
    wall2.position.set(x, height / 2, 6 - sectLength / 2);
    this.scene.add(wall2);
    this.colliders.push(wall2);
    
    // Door frame header (above the door)
    const geoHeader = new THREE.BoxGeometry(thickness, height - 2.2, gapSize);
    const header = new THREE.Mesh(geoHeader, this.materials.divider);
    header.position.set(x, height - (height - 2.2) / 2, 0);
    this.scene.add(header);

    // Top Blue Accent Band for partition wall
    const trimHeight = 0.18;
    const trimY = height - trimHeight / 2;
    const trimPart = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.04, trimHeight, length), this.materials.blueAccent);
    trimPart.position.set(x, trimY, 0);
    this.scene.add(trimPart);
  }

  // 3. Waiting Room Details (X: -12 to -4)
  buildWaitingRoom() {
    // Waiting Room benches/chairs along the wall
    for (let z = -4; z <= 2; z += 1.8) {
      this.buildChair(-9, 0, z, Math.PI / 2, 'reception'); // Facing East
    }

    // Reception desk
    const deskGeo = new THREE.BoxGeometry(1.5, 1.1, 3);
    const desk = new THREE.Mesh(deskGeo, this.materials.wood);
    desk.position.set(-6, 0.55, -3);
    this.scene.add(desk);
    this.colliders.push(desk);

    // Reception computer
    const pcGeo = new THREE.BoxGeometry(0.1, 0.4, 0.5);
    const pc = new THREE.Mesh(pcGeo, this.materials.metalSleek);
    pc.position.set(-6, 1.3, -3);
    this.scene.add(pc);

    // Receptionist 3D character behind the reception desk
    const receptionistGroup = new THREE.Group();
    receptionistGroup.position.set(-6, 0.15, -3.8);

    const recTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    recTorso.position.y = 0.9;
    receptionistGroup.add(recTorso);

    const recHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfde047 }));
    recHead.position.y = 1.35;
    receptionistGroup.add(recHead);

    const recHair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    recHair.position.set(0, 1.42, -0.02);
    receptionistGroup.add(recHair);

    this.scene.add(receptionistGroup);

    this.hotspots.push({
      name: 'Receptionist',
      position: new THREE.Vector3(-6, 0, -3.8),
      radius: 1.5,
      action: 'receptionist-interact',
      mesh: receptionistGroup
    });

    // Waiting Room Plant
    const potGeo = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 8);
    const pot = new THREE.Mesh(potGeo, this.materials.divider);
    pot.position.set(-11, 0.3, -5);
    this.scene.add(pot);
    this.colliders.push(pot);

    const plantGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.9 });
    const plant = new THREE.Mesh(plantGeo, plantMat);
    plant.position.set(-11, 0.8, -5);
    this.scene.add(plant);
  }

  // 4. Pre-Testing Room Details (X: -4 to 4)
  buildPreTestingRoom() {
    // Autorefractor Desk (Left side of pretesting room, X = -1.5, Z = 3)
    const desk1Geo = new THREE.BoxGeometry(2, 0.75, 1.2);
    const desk1 = new THREE.Mesh(desk1Geo, this.materials.whitePlastic);
    desk1.position.set(-1.8, 0.375, 3.5);
    this.scene.add(desk1);
    this.colliders.push(desk1);

    // Autorefractor Machine
    const arGroup = new THREE.Group();
    arGroup.position.set(-1.8, 0.75, 3.5);

    // Machine Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), this.materials.metalSleek);
    base.position.y = 0.05;
    arGroup.add(base);

    // Machine Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.materials.whitePlastic);
    body.position.y = 0.3;
    arGroup.add(body);

    // Machine Visor (doctor viewing screen on back, patient face rest on front)
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16), this.materials.metalSleek);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.45, 0);
    arGroup.add(visor);

    // Patient side visor pad (facing Z = -1, i.e., doctor looks from Z = 1 towards Z = -1)
    // Actually patient sits at Z = 4.2 (facing Z = 2.8) and doctor sits at Z = 2.8 (facing Z = 4.2)
    // Let's orient the visor along the Z axis.
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), this.materials.screenGlass);
    screen.position.set(0, 0.38, -0.25); // facing doctor
    arGroup.add(screen);

    this.scene.add(arGroup);
    
    // Autorefractor Hotspot (Doctor stands in front of it)
    this.hotspots.push({
      name: 'Autorefractor',
      position: new THREE.Vector3(-1.8, 0, 2.3),
      radius: 1.2,
      action: 'ar-enter',
      mesh: arGroup
    });

    // NCT Desk (Right side of pretesting room, X = 1.8, Z = 3.5)
    const desk2Geo = new THREE.BoxGeometry(2, 0.75, 1.2);
    const desk2 = new THREE.Mesh(desk2Geo, this.materials.whitePlastic);
    desk2.position.set(1.8, 0.375, 3.5);
    this.scene.add(desk2);
    this.colliders.push(desk2);

    // NCT Machine
    const nctGroup = new THREE.Group();
    nctGroup.position.set(1.8, 0.75, 3.5);
    
    const nctBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), this.materials.metalSleek);
    nctBase.position.y = 0.05;
    nctGroup.add(nctBase);

    const nctBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), this.materials.whitePlastic);
    nctBody.position.y = 0.285;
    nctGroup.add(nctBody);

    // Nozzle / Air jet tube (pointed towards patient)
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), this.materials.metalChrome);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.35, 0.2); // pointing Z-forward towards patient chair
    nctGroup.add(nozzle);

    const nctScreen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), this.materials.screenGlass);
    nctScreen.position.set(0, 0.35, -0.225); // doctor screen
    nctGroup.add(nctScreen);

    this.scene.add(nctGroup);

    // NCT Hotspot
    this.hotspots.push({
      name: 'Tonometer (NCT)',
      position: new THREE.Vector3(1.8, 0, 2.3),
      radius: 1.2,
      action: 'nct-enter',
      mesh: nctGroup
    });

    // Stools for patient at each machine
    this.buildChair(-1.8, 0, 4.3, 0, 'stooled'); // Patient stool at Autorefractor
    this.buildChair(1.8, 0, 4.3, 0, 'stooled');  // Patient stool at NCT
  }

  // 5. Exam Room Details (X: 4 to 12)
  buildExamRoom() {
    // Doctor desk X = 7, Z = -3
    const docDeskGeo = new THREE.BoxGeometry(2.2, 0.75, 1.2);
    const docDesk = new THREE.Mesh(docDeskGeo, this.materials.wood);
    docDesk.position.set(6.8, 0.375, -3.5);
    this.scene.add(docDesk);
    this.colliders.push(docDesk);

    this.buildChair(6.8, 0, -2.4, Math.PI, 'doctor'); // Doctor stool facing desk

    // Patient Exam Chair (X = 9, Z = 3.5)
    // Medical high-backed adjustable chair
    const examChairGroup = new THREE.Group();
    examChairGroup.position.set(9.2, 0, 3);
    
    // Heavy cylinder pedestal
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.15, 12), this.materials.metalSleek);
    base.position.y = 0.075;
    examChairGroup.add(base);
    
    const hydraulicStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), this.materials.metalChrome);
    hydraulicStalk.position.y = 0.45;
    examChairGroup.add(hydraulicStalk);

    // Seat cushion
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), this.materials.cushionBlue);
    seat.position.y = 0.75;
    examChairGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.15), this.materials.cushionBlue);
    back.position.set(0, 1.25, 0.3); // back offset
    examChairGroup.add(back);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.6), this.materials.metalSleek);
    armL.position.set(-0.38, 0.9, -0.05);
    examChairGroup.add(armL);
    
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.6), this.materials.metalSleek);
    armR.position.set(0.38, 0.9, -0.05);
    examChairGroup.add(armR);

    // Chin rest stand for patient alignment in front of Phoropter
    // This is located slightly in front of the chair (Z = 2.4)
    this.scene.add(examChairGroup);
    this.colliders.push(examChairGroup);

    // Phoropter Stand & arm next to the chair
    const standGroup = new THREE.Group();
    standGroup.position.set(10.3, 0, 2.5); // to the left/right of patient

    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), this.materials.metalChrome);
    standPole.position.y = 1.0;
    standGroup.add(standPole);

    // Horizontal arm extending over the patient
    const extendArm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), this.materials.metalChrome);
    extendArm.position.set(-0.5, 1.8, 0.1);
    standGroup.add(extendArm);

    // Phoropter body dangling down
    const phoropterMock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.15), this.materials.metalSleek);
    phoropterMock.position.set(-1.0, 1.6, 0.1);
    standGroup.add(phoropterMock);

    this.scene.add(standGroup);
    this.colliders.push(standGroup);

    // Hotspot for refraction
    this.hotspots.push({
      name: 'Refraction Bench (Phoropter)',
      position: new THREE.Vector3(8.0, 0, 2.4),
      radius: 1.3,
      action: 'phoropter-enter',
      mesh: phoropterMock
    });

    // Snellen Projector Screen on the opposite wall (X = 9.2, Z = -5.95)
    const screenGeo = new THREE.BoxGeometry(1.8, 1.4, 0.05);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const projScreen = new THREE.Mesh(screenGeo, screenMat);
    projScreen.position.set(9.2, 1.8, -5.9);
    this.scene.add(projScreen);
    
    // Add a border frame around screen
    const frameGeo = new THREE.BoxGeometry(1.9, 1.5, 0.03);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const screenFrame = new THREE.Mesh(frameGeo, frameMat);
    screenFrame.position.set(9.2, 1.8, -5.92);
    this.scene.add(screenFrame);
  }

  // Builder Helper for chairs
  buildChair(x, y, z, rotationY, type = 'reception') {
    const chairGroup = new THREE.Group();
    chairGroup.position.set(x, y, z);
    chairGroup.rotation.y = rotationY;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8);
    const legMat = this.materials.metalSleek;
    
    const l1 = new THREE.Mesh(legGeo, legMat); l1.position.set(-0.2, 0.225, -0.2); chairGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, legMat); l2.position.set(0.2, 0.225, -0.2); chairGroup.add(l2);
    const l3 = new THREE.Mesh(legGeo, legMat); l3.position.set(-0.2, 0.225, 0.2); chairGroup.add(l3);
    const l4 = new THREE.Mesh(legGeo, legMat); l4.position.set(0.2, 0.225, 0.2); chairGroup.add(l4);

    // Cushion
    let cushionGeo;
    let cushionMat;
    
    if (type === 'reception') {
      cushionGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
      cushionMat = this.materials.cushionOrange;
      
      // Add a backrest for reception chair
      const backGeo = new THREE.BoxGeometry(0.5, 0.4, 0.06);
      const back = new THREE.Mesh(backGeo, cushionMat);
      back.position.set(0, 0.65, -0.22);
      chairGroup.add(back);
      
      const supportGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
      const s1 = new THREE.Mesh(supportGeo, legMat); s1.position.set(-0.15, 0.45, -0.22); chairGroup.add(s1);
      const s2 = new THREE.Mesh(supportGeo, legMat); s2.position.set(0.15, 0.45, -0.22); chairGroup.add(s2);

    } else if (type === 'doctor') {
      // Doctor round rolling stool
      cushionGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16);
      cushionMat = this.materials.cushionBlue;
      
    } else {
      // Simple round metal/plastic stool
      cushionGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12);
      cushionMat = this.materials.divider;
    }

    const seat = new THREE.Mesh(cushionGeo, cushionMat);
    seat.position.y = 0.47;
    chairGroup.add(seat);

    this.scene.add(chairGroup);
    this.colliders.push(chairGroup);

    return chairGroup;
  }

  // 6. Draw Patient in 3D (a simple blocky humanoid model that can sit/stand)
  createPatient3D() {
    const patGroup = new THREE.Group();
    patGroup.name = 'patient-3d';
    
    // Pants / Legs (blue jeans)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8 });
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8), legMat);
    leftLeg.position.set(-0.16, 0.35, 0);
    patGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.7, 8), legMat);
    rightLeg.position.set(0.16, 0.35, 0);
    patGroup.add(rightLeg);

    // Torso (yellow sweater)
    const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.75, 0.3), sweaterMat);
    torso.position.y = 1.075;
    patGroup.add(torso);

    // Head (skin tone)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdbcb4, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skinMat);
    head.position.y = 1.55;
    patGroup.add(head);

    // Hair (brown)
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), hairMat);
    hair.scale.set(1.02, 0.8, 1.02);
    hair.position.set(0, 1.62, 0.02);
    patGroup.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
    eyeL.position.set(-0.08, 1.57, -0.18);
    patGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
    eyeR.position.set(0.08, 1.57, -0.18);
    patGroup.add(eyeR);

    // Glasses
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 1.57, -0.19);
    
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.2 });
    const glL = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.045, 16), frameMat);
    glL.position.x = -0.08;
    glassesGroup.add(glL);

    const glR = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.045, 16), frameMat);
    glR.position.x = 0.08;
    glassesGroup.add(glR);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), frameMat);
    glassesGroup.add(bridge);
    
    patGroup.add(glassesGroup);

    // Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8), sweaterMat);
    armL.position.set(-0.31, 1.1, 0);
    patGroup.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8), sweaterMat);
    armR.position.set(0.31, 1.1, 0);
    patGroup.add(armR);

    // Set shadow support
    patGroup.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    // Start Patient sitting in Waiting Room (X = -9, Z = -2.2)
    // For sitting down, we need to adjust leg angles and height
    patGroup.position.set(-9, 0.15, -2.2);
    patGroup.rotation.y = Math.PI / 2; // Facing East
    
    // Sit pose modification
    torso.position.y = 0.85;
    head.position.y = 1.3255;
    hair.position.set(0, 1.3955, 0.02);
    eyeL.position.set(-0.08, 1.3455, -0.18);
    eyeR.position.set(0.08, 1.3455, -0.18);
    glassesGroup.position.set(0, 1.3455, -0.19);
    
    leftLeg.rotation.x = -Math.PI / 2;
    leftLeg.position.set(-0.16, 0.75, -0.3);
    rightLeg.rotation.x = -Math.PI / 2;
    rightLeg.position.set(0.16, 0.75, -0.3);
    
    // Add shins going down
    const shinMat = legMat;
    const shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), shinMat);
    shinL.name = 'shinL';
    shinL.position.set(-0.16, 0.45, -0.6);
    patGroup.add(shinL);
    
    const shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), shinMat);
    shinR.name = 'shinR';
    shinR.position.set(0.16, 0.45, -0.6);
    patGroup.add(shinR);

    // Adjust arms to sit on lap
    armL.rotation.x = -0.3;
    armL.position.set(-0.31, 0.9, -0.15);
    armR.rotation.x = -0.3;
    armR.position.set(0.31, 0.9, -0.15);

    this.scene.add(patGroup);
    
    // Seated patient hotspot (Waiting Room)
    this.hotspots.push({
      name: 'Patient (Arthur)',
      position: new THREE.Vector3(-8.0, 0, -2.2),
      radius: 1.4,
      action: 'patient-interact',
      mesh: patGroup
    });

    return patGroup;
  }
}
