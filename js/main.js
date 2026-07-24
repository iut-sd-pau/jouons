import * as THREE from "three";
import { Multiplayer } from "./multiplayer.js";
import { PlayerData } from "./economy.js";
import { Lifecycle } from "./lifecycle.js";
import { spawnVehicles } from "./vehicles.js";
import { spawnNPCs } from "./npc.js";
import {
  buildWorld, buildMissionMarker, WORLD_SIZE,
  JOB_GIVER_POS, SHOP_POS, DELIVERY_DROPOFF_POS, SCHOOL_POS, TAXI_STAND_POS
} from "./world.js";
import { UI } from "./ui.js";

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let scene, camera, renderer;
let player;
let otherPlayers = {};
let multiplayer = null;
let playerData = null;
let lifecycle = null;
let ui = null;

let vehicles = [];
let npcs = [];
let streetlights = [];
let currentVehicle = null;
let nearestInteractable = null;

let policeCar = null;
let policeActive = false;
let activeMission = null; // { type: 'delivery'|'taxi', markerMesh }
let gamePaused = false;

let sunLight, ambientLight;
let dayTime = 0.3; // 0 = minuit, 0.25 = lever du jour, 0.5 = midi, 0.75 = coucher du soleil
const DAY_LENGTH_SECONDS = 240; // durée d'un cycle jour/nuit complet

const keys = {};
let cameraYaw = 0;
let cameraPitch = 0.35;
let cameraDistance = 7;
const clock = new THREE.Clock();

const BASE_MOVE_SPEED = 6;
const INTERACT_RADIUS = 2.5;
const HIT_SPEED_THRESHOLD = 6;
const PUNCH_COOLDOWN = 0.8;
let punchTimer = 0;

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
  lifecycle = new Lifecycle(playerData);

  ui.updateMoney(playerData.money);
  ui.updateWanted(playerData.wantedLevel);
  ui.updateAge(lifecycle.age, lifecycle.currentStage.label);

  initScene();
  initMultiplayer(name);
  animate();

  ui.showMission(`🍼 Tu commences ta vie comme ${lifecycle.currentStage.label.toLowerCase()}, à ${lifecycle.age} ans.`);
  setTimeout(() => ui.hideMission(), 4000);
}

// ============================================================
// INITIALISATION DE LA SCÈNE 3D
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc7ff);
  scene.fog = new THREE.Fog(0x8fc7ff, 30, 110);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  const canvas = document.getElementById("game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const worldRefs = buildWorld(scene);
  streetlights = worldRefs.streetlights;
  vehicles = spawnVehicles(scene);
  npcs = spawnNPCs(scene, WORLD_SIZE, 16);

  policeCar = buildPoliceCar();
  policeCar.visible = false;
  scene.add(policeCar);

  player = createCharacter(playerData.ownedVehicleColor || 0x4f7fff, lifecycle.currentStage.scale);
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
  if (chatInputEl.dataset.active === "1" || gamePaused) return;

  if (e.code === "KeyE") handleInteraction();
  if (e.code === "KeyF") handlePunch();
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

function createCharacter(color, scale = 1) {
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

  group.scale.setScalar(scale);
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

  switch (nearestInteractable.type) {
    case "vehicle": enterVehicle(nearestInteractable.ref); break;
    case "exit_vehicle": exitVehicle(); break;
    case "npc_job": startDeliveryMission(); break;
    case "npc_shop": openShop(); break;
    case "school": studyAtSchool(); break;
    case "taxi": startTaxiMission(); break;
  }
}

function handlePunch() {
  if (punchTimer > 0 || currentVehicle) return;
  punchTimer = PUNCH_COOLDOWN;

  for (const npc of npcs) {
    if (npc.role !== "pedestrian" || npc.knockedDown) continue;
    if (player.position.distanceTo(npc.mesh.position) < 1.8) {
      npc.knockDown();
      playerData.increaseWanted(1);
      break;
    }
  }
}

function enterVehicle(vehicle) {
  if (vehicle.occupied) return;
  if (!lifecycle.canDrive()) {
    ui.showMission(`🚫 Trop jeune pour conduire (il faut avoir 18 ans, tu as ${lifecycle.age} ans)`);
    setTimeout(() => ui.hideMission(), 2500);
    return;
  }
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
  if (!lifecycle.canWork()) {
    ui.showMission("🚫 Trop jeune pour travailler pour l'instant — va à l'école !");
    setTimeout(() => ui.hideMission(), 2500);
    return;
  }
  ui.showMission("📦 Livraison en cours : rejoins le marqueur vert sur la carte !");
  const marker = buildMissionMarker(scene, DELIVERY_DROPOFF_POS, 0x06d6a0);
  activeMission = { type: "delivery", markerMesh: marker };
}

function startTaxiMission() {
  if (activeMission) return;
  if (!lifecycle.canWork() || !lifecycle.canDrive()) {
    ui.showMission("🚫 Il faut être adulte et savoir conduire pour faire le taxi");
    setTimeout(() => ui.hideMission(), 2500);
    return;
  }
  ui.showMission("🚕 Course de taxi : dépose ton client au marqueur orange, en voiture !");
  const dropoff = new THREE.Vector3(-JOB_GIVER_POS.x - 10, 0, -JOB_GIVER_POS.z - 10);
  const marker = buildMissionMarker(scene, dropoff, 0xfb923c);
  activeMission = { type: "taxi", markerMesh: marker, dropoff };
}

function completeMission() {
  if (!activeMission) return;
  scene.remove(activeMission.markerMesh);
  const mult = lifecycle.getIncomeMultiplier();

  if (activeMission.type === "delivery") {
    const reward = Math.round(150 * mult);
    playerData.addMoney(reward);
    ui.showMission(`✅ Livraison réussie ! +${reward} €`);
  } else if (activeMission.type === "taxi") {
    const reward = Math.round(250 * mult);
    playerData.addMoney(reward);
    ui.showMission(`✅ Course terminée ! +${reward} €`);
  }

  activeMission = null;
  ui.updateMoney(playerData.money);
  setTimeout(() => ui.hideMission(), 3000);
}

function studyAtSchool() {
  if (lifecycle.age >= 18) {
    ui.showMission("🎓 Tu as déjà fini tes études.");
    setTimeout(() => ui.hideMission(), 2000);
    return;
  }
  const gained = lifecycle.studyAtSchool();
  ui.showMission(`📚 Tu étudies... +${gained} points d'éducation (total : ${lifecycle.education}/100)`);
  setTimeout(() => ui.hideMission(), 2500);
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
// CYCLE DE VIE
// ============================================================
function handleLifeEvent(event) {
  if (event.type === "death") {
    triggerDeath();
  } else if (event.type === "stage_change") {
    player.scale.setScalar(event.stage.scale);
    ui.showMission(`🎉 Tu es maintenant ${event.stage.label.toLowerCase()} ! (${lifecycle.age} ans)`);
    setTimeout(() => ui.hideMission(), 3500);
  } else if (event.type === "birthday") {
    const roll = Math.random();
    if (roll < 0.25) {
      const gift = 20 + Math.floor(Math.random() * 60);
      playerData.addMoney(gift);
      ui.updateMoney(playerData.money);
      ui.showMission(`🎂 Joyeux anniversaire (${event.age} ans) ! Tu reçois ${gift} € en cadeau.`);
    } else {
      ui.showMission(`🎂 Joyeux anniversaire, tu as maintenant ${event.age} ans !`);
    }
    setTimeout(() => ui.hideMission(), 3000);
  }
}

function triggerDeath() {
  gamePaused = true;
  if (currentVehicle) exitVehicle();

  const summary =
    `Tu as vécu jusqu'à ${lifecycle.age} ans.\n` +
    `Argent accumulé : ${playerData.money} €\n` +
    `Éducation atteinte : ${lifecycle.education}/100\n\n` +
    `Un quart de ton argent sera transmis à ta prochaine vie.`;

  ui.showDeathScreen(summary, () => {
    const legacy = lifecycle.reincarnate();
    player.scale.setScalar(lifecycle.currentStage.scale);
    player.position.set(0, 0, 0);
    ui.updateMoney(playerData.money);
    ui.updateAge(lifecycle.age, lifecycle.currentStage.label);
    ui.showMission(`✨ Nouvelle vie ! Tu hérites de ${legacy} € de ta vie précédente.`);
    setTimeout(() => ui.hideMission(), 4000);
    gamePaused = false;
  });
}

// ============================================================
// JOUR / NUIT
// ============================================================
function updateDayNightCycle(delta) {
  dayTime = (dayTime + delta / DAY_LENGTH_SECONDS) % 1;

  const angle = dayTime * Math.PI * 2;
  const sunHeight = Math.sin(angle - Math.PI / 2);
  const radius = 60;

  sunLight.position.set(Math.cos(angle) * radius, Math.max(5, sunHeight * radius), 20);
  sunLight.target.position.copy(player.position);

  const isNight = sunHeight < -0.15;
  const dayColor = new THREE.Color(0x8fc7ff);
  const nightColor = new THREE.Color(0x0a1128);
  const blend = THREE.MathUtils.clamp((sunHeight + 0.3) / 0.6, 0, 1);
  const skyColor = nightColor.clone().lerp(dayColor, blend);

  scene.background = skyColor;
  scene.fog.color = skyColor;
  sunLight.intensity = THREE.MathUtils.clamp(0.15 + blend * 1.1, 0.15, 1.25);
  ambientLight.intensity = THREE.MathUtils.clamp(0.15 + blend * 0.5, 0.15, 0.6);

  streetlights.forEach((sl) => {
    sl.userData.pointLight.intensity = isNight ? 1.2 : 0;
    sl.userData.bulb.material.color.set(isNight ? 0xfff2b3 : 0x555544);
  });
}

// ============================================================
// BOUCLE DE JEU
// ============================================================
let lastNetworkUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.1, clock.getDelta());

  if (punchTimer > 0) punchTimer -= delta;

  if (!gamePaused) {
    const lifeEvent = lifecycle.update(delta);
    if (lifeEvent) handleLifeEvent(lifeEvent);
    ui.updateAge(lifecycle.age, lifecycle.currentStage.label);

    if (currentVehicle) {
      currentVehicle.update(delta, keys);
    } else {
      updatePlayerMovement(delta);
    }

    updateNPCs(delta);
    updateVehiclePhysicsIdle(delta);
    updateInteractionPrompt();
    updateMissionProgress();
    updateWantedAndPolice(delta);

    playerData.updateWantedDecay(delta);
    ui.updateWanted(playerData.wantedLevel);
  }

  updateDayNightCycle(delta);
  updateCamera();
  interpolateOtherPlayers(delta);

  const activePos = currentVehicle ? currentVehicle.mesh.position : player.position;
  const activeRotY = currentVehicle ? currentVehicle.mesh.rotation.y : player.rotation.y;

  const pois = [
    { x: JOB_GIVER_POS.x, z: JOB_GIVER_POS.z, color: "#ffd60a" },
    { x: SHOP_POS.x, z: SHOP_POS.z, color: "#00b4d8" },
    { x: SCHOOL_POS.x, z: SCHOOL_POS.z, color: "#a78bfa" },
    { x: TAXI_STAND_POS.x, z: TAXI_STAND_POS.z, color: "#fb923c" }
  ];
  if (activeMission) pois.push({ x: activeMission.markerMesh.position.x, z: activeMission.markerMesh.position.z, color: "#06d6a0" });
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

    const speed = BASE_MOVE_SPEED * lifecycle.currentStage.speedMult;
    const dir = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle));
    player.position.addScaledVector(dir, speed * delta);

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

  for (const v of vehicles) {
    if (v.occupied) continue;
    if (refPos.distanceTo(v.mesh.position) < INTERACT_RADIUS) {
      nearestInteractable = { type: "vehicle", ref: v };
      ui.showPrompt(lifecycle.canDrive() ? "Appuie sur E pour monter dans le véhicule" : "Trop jeune pour conduire");
      return;
    }
  }

  for (const npc of npcs) {
    if (npc.role === "pedestrian") continue;
    if (refPos.distanceTo(npc.mesh.position) < INTERACT_RADIUS) {
      if (npc.role === "job_giver") {
        nearestInteractable = { type: "npc_job" };
        ui.showPrompt(activeMission ? "Une mission est déjà en cours..." : "Appuie sur E pour une mission de livraison");
      } else if (npc.role === "shopkeeper") {
        nearestInteractable = { type: "npc_shop" };
        ui.showPrompt("Appuie sur E pour ouvrir la boutique");
      }
      return;
    }
  }

  if (refPos.distanceTo(SCHOOL_POS) < INTERACT_RADIUS + 1) {
    nearestInteractable = { type: "school" };
    ui.showPrompt(lifecycle.age >= 18 ? "Tu as fini tes études" : "Appuie sur E pour étudier");
    return;
  }

  if (refPos.distanceTo(TAXI_STAND_POS) < INTERACT_RADIUS + 1) {
    nearestInteractable = { type: "taxi" };
    ui.showPrompt(activeMission ? "Une mission est déjà en cours..." : "Appuie sur E pour une course de taxi");
    return;
  }

  ui.hidePrompt();
}

function updateMissionProgress() {
  if (!activeMission) return;
  const refPos = currentVehicle ? currentVehicle.mesh.position : player.position;
  const target = activeMission.type === "taxi" ? activeMission.dropoff : DELIVERY_DROPOFF_POS;

  if (activeMission.type === "taxi" && !currentVehicle) return;

  if (refPos.distanceTo(target) < 2.5) {
    completeMission();
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
      const chaseSpeed = 5 + wanted;
      policeCar.position.addScaledVector(toPlayer, chaseSpeed * delta);
      policeCar.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    policeCar.userData.flashTimer += delta;
    const on = Math.floor(policeCar.userData.flashTimer * 6) % 2 === 0;
    policeCar.userData.light.material.color.set(on ? 0xff0000 : 0x0000ff);

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
