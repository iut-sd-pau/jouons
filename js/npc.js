import * as THREE from "three";

// ============================================================
// PERSONNAGES NON-JOUEURS (NPC)
// ============================================================

const NPC_COLORS = [0x9d4edd, 0xffb703, 0x06d6a0, 0xef476f, 0x118ab2, 0xf72585, 0x4cc9f0, 0x80ed99];
const PEDESTRIAN_LINES = [
  "Belle journée non ?", "J'ai pas le temps, désolé...", "Tu viens du quartier ?",
  "Fais attention en conduisant !", "J'ai entendu dire qu'il y a une école par là.",
  "La boutique a de nouveaux articles !"
];

export class NPC {
  constructor(scene, position, role = "pedestrian") {
    this.scene = scene;
    this.role = role; // "pedestrian" | "job_giver" | "shopkeeper" | "passenger" | "teacher"
    this.state = "idle";
    this.wanderTarget = new THREE.Vector3().copy(position);
    this.wanderTimer = 0;
    this.speed = 1.2 + Math.random() * 0.8;
    this.knockedDown = false;
    this.knockedTimer = 0;
    this.talkCooldown = Math.random() * 6;

    this.mesh = this.buildMesh(role);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  buildMesh(role) {
    const group = new THREE.Group();
    const color = role === "job_giver" ? 0xffd60a : role === "shopkeeper" ? 0x00b4d8 : NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];

    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.27, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd8b1 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    if (role === "job_giver" || role === "shopkeeper") {
      // Icône flottante au-dessus pour repérer les PNJ importants
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = 64;
      iconCanvas.height = 64;
      const ctx = iconCanvas.getContext("2d");
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText(role === "job_giver" ? "!" : "$", 32, 48);
      const tex = new THREE.CanvasTexture(iconCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.6, 0.6, 1);
      sprite.position.y = 2.4;
      group.add(sprite);
    }

    return group;
  }

  update(delta, worldSize) {
    if (this.knockedDown) {
      this.knockedTimer -= delta;
      this.mesh.rotation.z = Math.PI / 2;
      if (this.knockedTimer <= 0) {
        this.knockedDown = false;
        this.mesh.rotation.z = 0;
      }
      return;
    }

    if (this.role !== "pedestrian") return; // les PNJ importants restent sur place

    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      const half = worldSize / 2 - 4;
      this.wanderTarget.set(
        (Math.random() - 0.5) * half * 2,
        0,
        (Math.random() - 0.5) * half * 2
      );
      this.wanderTimer = 3 + Math.random() * 4;
    }

    const toTarget = this.wanderTarget.clone().sub(this.mesh.position);
    toTarget.y = 0;
    if (toTarget.length() > 0.3) {
      toTarget.normalize();
      this.mesh.position.addScaledVector(toTarget, this.speed * delta);
      const targetAngle = Math.atan2(toTarget.x, toTarget.z);
      this.mesh.rotation.y = targetAngle;
    }

    // Petites bulles de dialogue aléatoires pour donner vie aux passants
    this.talkCooldown -= delta;
    if (this.talkCooldown <= 0) {
      this.showSpeechBubble(PEDESTRIAN_LINES[Math.floor(Math.random() * PEDESTRIAN_LINES.length)]);
      this.talkCooldown = 12 + Math.random() * 15;
    }
  }

  showSpeechBubble(text) {
    if (this.bubble) this.mesh.remove(this.bubble);

    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(0, 0, 220, 60);
    ctx.fillStyle = "#111";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    wrapText(ctx, text, 110, 26, 200, 18);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.4, 1);
    sprite.position.y = 2.3;
    this.mesh.add(sprite);
    this.bubble = sprite;

    setTimeout(() => {
      if (this.bubble === sprite) {
        this.mesh.remove(sprite);
        this.bubble = null;
      }
    }, 3200);
  }

  knockDown() {
    if (this.role !== "pedestrian") return;
    this.knockedDown = true;
    this.knockedTimer = 3;
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      lines.push(line);
      line = word + " ";
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}

export function spawnNPCs(scene, worldSize, pedestrianCount) {
  const npcs = [];
  const half = worldSize / 2 - 4;

  for (let i = 0; i < pedestrianCount; i++) {
    const x = (Math.random() - 0.5) * half * 2;
    const z = (Math.random() - 0.5) * half * 2;
    npcs.push(new NPC(scene, new THREE.Vector3(x, 0, z), "pedestrian"));
  }

  // Un donneur de mission fixe
  npcs.push(new NPC(scene, new THREE.Vector3(8, 0, 8), "job_giver"));
  // Un vendeur fixe (magasin)
  npcs.push(new NPC(scene, new THREE.Vector3(-10, 0, -6), "shopkeeper"));

  return npcs;
}
