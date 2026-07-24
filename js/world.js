import * as THREE from "three";

// ============================================================
// CONSTRUCTION DU MONDE
// ============================================================

export const WORLD_SIZE = 90;

// Points d'intérêt fixes (identiques pour tous les joueurs)
export const JOB_GIVER_POS = new THREE.Vector3(8, 0, 8);
export const SHOP_POS = new THREE.Vector3(-10, 0, -6);
export const DELIVERY_DROPOFF_POS = new THREE.Vector3(-20, 0, 18);
export const SCHOOL_POS = new THREE.Vector3(16, 0, -18);
export const TAXI_STAND_POS = new THREE.Vector3(-22, 0, -22);

export function buildWorld(scene) {
  // Sol
  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  buildRoads(scene);
  buildBuildings(scene);
  buildTrees(scene);
  const streetlights = buildStreetlights(scene);
  buildMarker(scene, JOB_GIVER_POS, 0xffd60a);
  buildMarker(scene, SHOP_POS, 0x00b4d8);
  buildMarker(scene, SCHOOL_POS, 0xa78bfa);
  buildMarker(scene, TAXI_STAND_POS, 0xfb923c);

  return { streetlights };
}

function buildRoads(scene) {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });

  // Route horizontale et verticale principales (croix au centre)
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, 6), roadMat);
  roadH.rotation.x = -Math.PI / 2;
  roadH.position.y = 0.01;
  roadH.receiveShadow = true;
  scene.add(roadH);

  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(6, WORLD_SIZE), roadMat);
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.y = 0.01;
  roadV.receiveShadow = true;
  scene.add(roadV);

  // Lignes blanches simples au sol (bandes)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = -WORLD_SIZE / 2; i < WORLD_SIZE / 2; i += 4) {
    const line1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), lineMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(i, 0.02, 0);
    scene.add(line1);

    const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.5), lineMat);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(0, 0.02, i);
    scene.add(line2);
  }
}

function buildBuildings(scene) {
  const buildingCount = 40;
  for (let i = 0; i < buildingCount; i++) {
    // Zone centrale = quartier d'affaires (tours hautes), périphérie = quartier résidentiel (petites maisons)
    let x, z, attempts = 0;
    do {
      x = (Math.random() - 0.5) * (WORLD_SIZE - 10);
      z = (Math.random() - 0.5) * (WORLD_SIZE - 10);
      attempts++;
    } while ((Math.abs(x) < 5 || Math.abs(z) < 5) && attempts < 20);

    const distFromCenter = Math.sqrt(x * x + z * z);
    const isDowntown = distFromCenter < 22;

    const w = isDowntown ? 3 + Math.random() * 3 : 4 + Math.random() * 3;
    const d = isDowntown ? 3 + Math.random() * 3 : 4 + Math.random() * 3;
    const h = isDowntown ? 10 + Math.random() * 20 : 3 + Math.random() * 3;

    const geo = new THREE.BoxGeometry(w, h, d);
    const hue = isDowntown ? 210 + Math.random() * 40 : 20 + Math.random() * 40;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${hue}, ${isDowntown ? 15 : 35}%, ${isDowntown ? 65 : 75}%)`)
    });
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
  }
}

function buildTrees(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f });

  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 6);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 6);
    if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;

    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    group.add(trunk);

    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), leavesMat);
    leaves.position.y = 1.8;
    leaves.castShadow = true;
    group.add(leaves);

    group.position.set(x, 0, z);
    scene.add(group);
  }
}

export function buildStreetlights(scene) {
  const lights = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b3 });

  const positions = [];
  for (let i = -WORLD_SIZE / 2 + 6; i < WORLD_SIZE / 2 - 6; i += 14) {
    positions.push({ x: i, z: 4 }, { x: i, z: -4 }, { x: 4, z: i }, { x: -4, z: i });
  }

  positions.forEach((p) => {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), poleMat);
    pole.position.y = 1.5;
    group.add(pole);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bulbMat.clone());
    bulb.position.y = 3;
    group.add(bulb);

    const pointLight = new THREE.PointLight(0xfff2b3, 0, 8);
    pointLight.position.y = 3;
    group.add(pointLight);

    group.position.set(p.x, 0, p.z);
    group.userData.bulb = bulb;
    group.userData.pointLight = pointLight;
    scene.add(group);
    lights.push(group);
  });

  return lights;
}

function buildMarker(scene, position, color) {
  const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const marker = new THREE.Mesh(geo, mat);
  marker.position.copy(position);
  marker.position.y = 0.05;
  scene.add(marker);
  return marker;
}

export function buildMissionMarker(scene, position, color = 0x06d6a0) {
  return buildMarker(scene, position, color);
}
