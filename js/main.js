import * as THREE from "three";
import { Multiplayer } from "./multiplayer.js";
import { PlayerData } from "./economy.js";
import { spawnVehicles } from "./vehicles.js";
import { spawnNPCs } from "./npc.js";
import { buildWorld, buildMissionMarker, WORLD_SIZE, JOB_GIVER_POS, SHOP_POS, DELIVERY_DROPOFF_POS } from "./world.js";
import { UI } from "./ui.js";

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let scene, camera, renderer;
let player;
let otherPlayers = {};
let multiplayer = null;
let playerData = null;
let ui = null;

let vehicles = [];
let npcs = [];
let currentVehicle = null; // véhicule occupé par MOI
let nearestInteractable = null; // { type: 'vehicle'|'npc', ref }

let policeCar = null;
let policeActive = false;

let activeMission = null; // { markerMesh }

const keys = {};
let cameraYaw = 0;
let cameraPitch = 0.35;
let cameraDistance = 7;
const clock = new THREE.Clock();

const MOVE_SPEED = 6;
const INTERACT_RADIUS = 2.5;
const HIT_SPEED_THRESHOLD = 6;

const SHOP_ITEMS = [
  { id: "bleu", name: "Tenue Bleue", price: 100, color: "#4f7fff" },
  { id: "rouge", name: "Tenue Rouge", price: 100, color: "#ff6b6b" },
  { id: "or", name: "Tenue Dorée", price: 400, color: "#ffd60a" },
  { id: "neon", name: "Tenue Néon", price: 600, color: "#39ff14" }
];

// ============================================================
// ÉCRAN DE CONNEXION
// ============================================================
const loginScreen = document.getElementById("login-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const hud = document.getElementById("hud");
const playerCountEl = document.getElementById("player-count");
const chatMessagesEl = document.getElementById("chat-messages");
const chatInputEl = document.getElementById("chat-input");

joinBtn.addEventListener("click", startGame);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startGame();
});

async function startGame() {
  const name = usernameInput.value.trim() || "Joueur" + Math.floor(Math.random() * 1000);
  loginScreen.style.display = "none";
  hud.classList.remove("hidden");

  ui = new UI();
  playerData = new PlayerData(name);
  await playerData.load();
  ui.updateMoney(playerData.money);
  ui.updateWanted(playerData.wantedLevel);

  initScene();
  initMultiplayer(name);
  animate();
}

// ============================================================
// INITIALISATION DE LA SCÈNE 3D
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc7ff);
  scene.fog = new THREE.Fog(0x8fc7ff, 30, 100);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  const canvas = document.getElementById("game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(sun);

  buildWorld(scene);
  vehicles = spawnVehicles(scene);
  npcs = spawnNPCs(scene, WORLD_SIZE, 10);

  // Voiture de police (invisible tant qu'aucun niveau de recherche)
  policeCar = buildPoliceCar();
  policeCar.visible = false;
  scene.add(policeCar);

  // Joueur
  player = createCharacter(playerData.ownedVehicleColor || 0x4f7fff);
  player.position.set(0, 0, 0);
  scene.add(player);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onResize);

  let isDragging = false;
  let lastX = 0, lastY = 0;
  renderer.domElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => (isDragging = false));
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    cameraYaw -= dx * 0.005;
    cameraPitch = Math.max(0.1, Math.min(1.2, cameraPitch - dy * 0.005));
  });
  renderer.domElement.addEventListener("wheel", (e) => {
    cameraDistance = Math.max(3, Math.min(18, cameraDistance + e.deltaY * 0.01));
  });

  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && chatInputEl.value.trim()) {
      multiplayer.sendChatMessage(chatInputEl.value);
      chatInputEl.value = "";
    }
  });
  chatInputEl.addEventListener("focus", () => (chatInputEl.dataset.active = "1"));
  chatInputEl.addEventListener("blur", () => (chatInputEl.dataset.active = "0"));
}

function onKeyDown(e) {
  keys[e.code] = true;
  if (chatInputEl.dataset.active === "1") return;

  if (e.code === "KeyE") {
    handleInteraction();
  }
}

function buildPoliceCar() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111133 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  group.add(body);

  const lightGeo = new THREE.BoxGeometry(1.8, 0.2, 0.6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(0, 1.1, 0);
  group.add(light);
  group.userData.light = light;
  group.userData.flashTimer = 0;

  return group;
}

function createCharacter(color) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffd8b1 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);

  return group;
}

function createNameLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(10,14,20,0.7)";
  ctx.fillRect(0, 8, 256, 48);
  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "#eaf2ff";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 42);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 2.3;
  return sprite;
}

// ============================================================
// MULTIJOUEUR
// ============================================================
function initMultiplayer(username) {
  multiplayer = new Multiplayer(username);

  multiplayer.onPlayerJoined = (id, data) => {
    const mesh = createCharacter(data.color || 0xff6b6b);
    mesh.position.set(data.x, data.y, data.z);
    mesh.add(createNameLabel(data.username));
    scene.add(mesh);
    otherPlayers[id] = { mesh, target: new THREE.Vector3(data.x, data.y, data.z), rotY: data.rotY || 0 };
    updatePlayerCount();
  };

  multiplayer.onPlayerMoved = (id, data) => {
    const p = otherPlayers[id];
    if (!p) return;
    p.target.set(data.x, data.y, data.z);
    p.rotY = data.rotY || 0;
  };

  multiplayer.onPlayerLeft = (id) => {
    const p = otherPlayers[id];
    if (!p) return;
    scene.remove(p.mesh);
    delete otherPlayers[id];
    updatePlayerCount();
  };

  multiplayer.onChatMessage = (username, text) => {
    const line = document.createElement("div");
    line.className = "chat-line";
    line.innerHTML = `<b>${escapeHtml(username)}:</b> ${escapeHtml(text)}`;
    chatMessagesEl.appendChild(line);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    while (chatMessagesEl.children.length > 30) {
      chatMessagesEl.removeChild(chatMessagesEl.firstChild);
    }
  };

  multiplayer.connect();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updatePlayerCount() {
  playerCountEl.textContent = `Joueurs connectés : ${Object.keys(otherPlayers).length + 1}`;
}

// ============================================================
// INTERACTIONS (touche E)
// ============================================================
function handleInteraction() {
  if (!nearestInteractable) return;

  if (nearestInteractable.type === "vehicle") {
    enterVehicle(nearestInteractable.ref);
  } else if (nearestInteractable.type === "exit_vehicle") {
    exitVehicle();
  } else if (nearestInteractable.type === "npc_job") {
    startDeliveryMission();
  } else if (nearestInteractable.type === "npc_shop") {
    openShop();
  }
}

function enterVehicle(vehicle) {
  if (vehicle.occupied) return;
  currentVehicle = vehicle;
  vehicle.occupied = true;
  vehicle.driverId = "me";
  player.visible = false;
}

function exitVehicle() {
  if (!currentVehicle) return;
  const exitPos = currentVehicle.getExitPosition();
  player.position.copy(exitPos);
  player.rotation.y = currentVehicle.mesh.rotation.y;
  currentVehicle.occupied = false;
  currentVehicle.driverId = null;
  currentVehicle = null;
  player.visible = true;
}

function startDeliveryMission() {
  if (activeMission) return;
  ui.showMission("📦 Livraison en cours : rejoins le marqueur vert sur la carte !");
  const marker = buildMissionMarker(scene, DELIVERY_DROPOFF_POS, 0x06d6a0);
  activeMission = { markerMesh: marker };
}

function completeDeliveryMission() {
  if (!activeMission) return;
  scene.remove(activeMission.markerMesh);
  activeMission = null;
  playerData.addMoney(150);
  ui.updateMoney(playerData.money);
  ui.showMission("✅ Livraison réussie ! +150 €");
  setTimeout(() => ui.hideMission(), 3000);
}

function openShop() {
  ui.openShop(SHOP_ITEMS, (item) => {
    if (playerData.money < item.price) {
      ui.showMission("❌ Pas assez d'argent pour : " + item.name);
      setTimeout(() => ui.hideMission(), 2000);
      return;
    }
    playerData.addMoney(-item.price);
    playerData.setVehicleColor(item.color);
    ui.updateMoney(playerData.money);
    recolorPlayer(item.color);
    ui.showMission("🛍️ Achat effectué : " + item.name);
    setTimeout(() => ui.hideMission(), 2500);
  });
}

function recolorPlayer(hexColor) {
  const body = player.children[0];
  body.material.color.set(hexColor);
}

// ============================================================
// BOUCLE DE JEU
// ============================================================
let lastNetworkUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.1, clock.getDelta());

  if (currentVehicle) {
    currentVehicle.update(delta, keys);
  } else {
    updatePlayerMovement(delta);
  }

  updateCamera();
  interpolateOtherPlayers(delta);
  updateNPCs(delta);
  updateVehiclePhysicsIdle(delta);
  updateInteractionPrompt();
  updateMissionProgress();
  updateWantedAndPolice(delta);

  playerData.updateWantedDecay(delta);
  ui.updateWanted(playerData.wantedLevel);

  const activePos = currentVehicle ? currentVehicle.mesh.position : player.position;
  const activeRotY = currentVehicle ? currentVehicle.mesh.rotation.y : player.rotation.y;

  const pois = [
    { x: JOB_GIVER_POS.x, z: JOB_GIVER_POS.z, color: "#ffd60a" },
    { x: SHOP_POS.x, z: SHOP_POS.z, color: "#00b4d8" }
  ];
  if (activeMission) pois.push({ x: DELIVERY_DROPOFF_POS.x, z: DELIVERY_DROPOFF_POS.z, color: "#06d6a0" });
  ui.drawMinimap(activePos, activeRotY, otherPlayers, pois, WORLD_SIZE);

  lastNetworkUpdate += delta;
  if (lastNetworkUpdate > 1 / 15) {
    multiplayer.updatePosition(activePos.x, activePos.y, activePos.z, activeRotY);
    lastNetworkUpdate = 0;
  }

  renderer.render(scene, camera);
}

function updatePlayerMovement(delta) {
  if (chatInputEl.dataset.active === "1") return;
  const forward = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0);
  const strafe = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyQ"] || keys["ArrowLeft"] ? 1 : 0);

  if (forward !== 0 || strafe !== 0) {
    const moveAngle = Math.atan2(strafe, forward) + cameraYaw;
    player.rotation.y = lerpAngle(player.rotation.y, moveAngle, 0.2);

    const dir = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle));
    player.position.addScaledVector(dir, MOVE_SPEED * delta);

    const half = WORLD_SIZE / 2 - 1;
    player.position.x = Math.max(-half, Math.min(half, player.position.x));
    player.position.z = Math.max(-half, Math.min(half, player.position.z));
  }
}

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function updateCamera() {
  const focus = currentVehicle ? currentVehicle.mesh.position : player.position;
  const dist = currentVehicle ? cameraDistance + 3 : cameraDistance;
  const offsetX = Math.sin(cameraYaw) * Math.cos(cameraPitch) * dist;
  const offsetZ = Math.cos(cameraYaw) * Math.cos(cameraPitch) * dist;
  const offsetY = Math.sin(cameraPitch) * dist;

  camera.position.set(focus.x + offsetX, focus.y + offsetY + 1, focus.z + offsetZ);
  camera.lookAt(focus.x, focus.y + 1.2, focus.z);
}

function interpolateOtherPlayers(delta) {
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    p.mesh.position.lerp(p.target, Math.min(1, delta * 8));
    p.mesh.rotation.y = lerpAngle(p.mesh.rotation.y, p.rotY, 0.2);
  }
}

function updateNPCs(delta) {
  npcs.forEach((npc) => npc.update(delta, WORLD_SIZE));

  // Détection de collision voiture <-> piéton (renverser quelqu'un)
  if (currentVehicle && Math.abs(currentVehicle.speed) > HIT_SPEED_THRESHOLD) {
    npcs.forEach((npc) => {
      if (npc.role !== "pedestrian" || npc.knockedDown) return;
      const dist = currentVehicle.mesh.position.distanceTo(npc.mesh.position);
      if (dist < 1.6) {
        npc.knockDown();
        playerData.increaseWanted(1);
      }
    });
  }
}

function updateVehiclePhysicsIdle(delta) {
  vehicles.forEach((v) => {
    if (v !== currentVehicle) v.update(delta, null);
  });
}

function updateInteractionPrompt() {
  nearestInteractable = null;
  const refPos = currentVehicle ? currentVehicle.mesh.position : player.position;

  if (currentVehicle) {
    nearestInteractable = { type: "exit_vehicle" };
    ui.showPrompt("Appuie sur E pour sortir du véhicule");
    return;
  }

  // Véhicule à proximité
  for (const v of vehicles) {
    if (v.occupied) continue;
    if (refPos.distanceTo(v.mesh.position) < INTERACT_RADIUS) {
      nearestInteractable = { type: "vehicle", ref: v };
      ui.showPrompt("Appuie sur E pour monter dans le véhicule");
      return;
    }
  }

  // PNJ à proximité
  for (const npc of npcs) {
    if (npc.role === "pedestrian") continue;
    if (refPos.distanceTo(npc.mesh.position) < INTERACT_RADIUS) {
      if (npc.role === "job_giver") {
        nearestInteractable = { type: "npc_job" };
        ui.showPrompt(activeMission ? "Livraison déjà en cours..." : "Appuie sur E pour prendre une mission de livraison");
      } else if (npc.role === "shopkeeper") {
        nearestInteractable = { type: "npc_shop" };
        ui.showPrompt("Appuie sur E pour ouvrir la boutique");
      }
      return;
    }
  }

  ui.hidePrompt();
}

function updateMissionProgress() {
  if (!activeMission) return;
  const refPos = currentVehicle ? currentVehicle.mesh.position : player.position;
  if (refPos.distanceTo(DELIVERY_DROPOFF_POS) < 2.5) {
    completeDeliveryMission();
  }
}

function updateWantedAndPolice(delta) {
  const wanted = playerData.wantedLevel;

  if (wanted > 0 && !policeActive) {
    policeActive = true;
    policeCar.visible = true;
    const refPos = currentVehicle ? currentVehicle.mesh.position : player.position;
    const angle = Math.random() * Math.PI * 2;
    policeCar.position.set(refPos.x + Math.cos(angle) * 15, 0, refPos.z + Math.sin(angle) * 15);
  }

  if (wanted <= 0 && policeActive) {
    policeActive = false;
    policeCar.visible = false;
  }

  if (policeActive) {
    const refPos = currentVehicle ? currentVehicle.mesh.position : player.position;
    const toPlayer = refPos.clone().sub(policeCar.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist > 0.5) {
      toPlayer.normalize();
      const chaseSpeed = 5 + wanted; // plus le niveau est élevé, plus la police est rapide
      policeCar.position.addScaledVector(toPlayer, chaseSpeed * delta);
      policeCar.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    // Gyrophare
    policeCar.userData.flashTimer += delta;
    const on = Math.floor(policeCar.userData.flashTimer * 6) % 2 === 0;
    policeCar.userData.light.material.color.set(on ? 0xff0000 : 0x0000ff);

    // Arrestation si la police rattrape le joueur
    if (dist < 2) {
      playerData.wantedLevel = 0;
      playerData.addMoney(-50);
      ui.updateMoney(playerData.money);
      ui.showMission("🚔 Arrêté par la police — amende de 50 €");
      setTimeout(() => ui.hideMission(), 3000);
    }
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("beforeunload", () => {
  if (multiplayer) multiplayer.disconnect();
});
