import * as THREE from "three";

// ============================================================
// VÉHICULES
// ============================================================

export class Vehicle {
  constructor(scene, position, color = 0xe63946) {
    this.scene = scene;
    this.speed = 0;
    this.steerAngle = 0;
    this.maxSpeed = 18;
    this.acceleration = 9;
    this.braking = 14;
    this.friction = 4;
    this.turnSpeed = 2.2;
    this.occupied = false;
    this.driverId = null; // null = libre, "me" = moi, sinon id joueur distant

    this.mesh = this.buildMesh(color);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  buildMesh(color) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, transparent: true, opacity: 0.85 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Roues
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const positions = [
      [-1, 0.35, 1.3], [1, 0.35, 1.3],
      [-1, 0.35, -1.3], [1, 0.35, -1.3]
    ];
    this.wheels = positions.map(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      group.add(wheel);
      return wheel;
    });

    return group;
  }

  update(delta, input) {
    if (this.occupied && input) {
      const throttle = (input["KeyW"] || input["ArrowUp"] ? 1 : 0) - (input["KeyS"] || input["ArrowDown"] ? 1 : 0);
      const steer = (input["KeyA"] || input["ArrowLeft"] ? 1 : 0) - (input["KeyD"] || input["ArrowRight"] ? 1 : 0);

      if (throttle > 0) {
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
      } else if (throttle < 0) {
        this.speed = Math.max(-this.maxSpeed / 2, this.speed - this.braking * delta);
      } else {
        // Frein moteur naturel
        if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * delta);
        else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * delta);
      }

      if (Math.abs(this.speed) > 0.1) {
        this.mesh.rotation.y += steer * this.turnSpeed * delta * Math.sign(this.speed);
      }

      const dir = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
      this.mesh.position.addScaledVector(dir, this.speed * delta);

      // Rotation visuelle des roues
      this.wheels.forEach((w) => (w.rotation.x -= this.speed * delta * 2));
    } else {
      // Ralentit tout seul si personne au volant
      if (this.speed !== 0) {
        this.speed *= 0.9;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;
      }
    }
  }

  getExitPosition() {
    const dir = new THREE.Vector3(Math.sin(this.mesh.rotation.y + Math.PI / 2), 0, Math.cos(this.mesh.rotation.y + Math.PI / 2));
    return this.mesh.position.clone().addScaledVector(dir, 2);
  }
}

// Positions FIXES (pas aléatoires) pour que toutes les personnes connectées
// voient les véhicules au même endroit dès le chargement.
export function spawnVehicles(scene) {
  const spawnPoints = [
    { x: 5, z: -8 }, { x: -12, z: 4 }, { x: 15, z: 10 },
    { x: -6, z: -15 }, { x: 20, z: -3 }, { x: -18, z: -10 }
  ];
  const colors = [0xe63946, 0x2a9d8f, 0xf4a261, 0x264653, 0xe9c46a, 0x8ecae6];
  const vehicles = spawnPoints.map((p, i) =>
    new Vehicle(scene, new THREE.Vector3(p.x, 0, p.z), colors[i % colors.length])
  );
  return vehicles;
}
