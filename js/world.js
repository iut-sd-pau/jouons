import * as THREE from "three";

// ============================================================
// CONSTRUCTION DU MONDE
// ============================================================

export const WORLD_SIZE = 70;

// Points d'intérêt fixes (identiques pour tous les joueurs)
export const JOB_GIVER_POS = new THREE.Vector3(8, 0, 8);
export const SHOP_POS = new THREE.Vector3(-10, 0, -6);
export const DELIVERY_DROPOFF_POS = new THREE.Vector3(-20, 0, 18);

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
  buildMarker(scene, JOB_GIVER_POS, 0xffd60a);
  buildMarker(scene, SHOP_POS, 0x00b4d8);
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
  const buildingCount = 22;
  for (let i = 0; i < buildingCount; i++) {
    const w = 3 + Math.random() * 4;
    const d = 3 + Math.random() * 4;
    const h = 4 + Math.random() * 14;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${Math.random() * 360}, 20%, 70%)`)
    });
    const building = new THREE.Mesh(geo, mat);

    let x, z;
    let attempts = 0;
    do {
      x = (Math.random() - 0.5) * (WORLD_SIZE - 10);
      z = (Math.random() - 0.5) * (WORLD_SIZE - 10);
      attempts++;
    } while ((Math.abs(x) < 5 || Math.abs(z) < 5) && attempts < 20);

    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
  }
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
