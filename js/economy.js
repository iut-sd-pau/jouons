// ============================================================
// ÉCONOMIE & SAUVEGARDE PERSISTANTE DU JOUEUR
// ============================================================
// Chaque joueur a un identifiant stable stocké dans le navigateur
// (localStorage), ce qui permet de retrouver son argent et son
// inventaire à chaque connexion, sans système de compte complexe.

export class PlayerData {
  constructor(username) {
    this.username = username;
    this.playerId = this.getOrCreatePersistentId();
    this.money = 500; // argent de départ
    this.wantedLevel = 0; // 0 à 5 étoiles
    this.inventory = [];
    this.ownedVehicleColor = "#e63946";
    this.age = 6;
    this.education = 0;
    this.deathAge = null; // calculé au premier chargement si absent
    this.ref = db.ref("playerData/" + this.playerId);
    this.onLoaded = null;
    this._wantedDecayTimer = 0;
  }

  getOrCreatePersistentId() {
    let id = localStorage.getItem("vv_player_id");
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("vv_player_id", id);
    }
    return id;
  }

  async load() {
    const snap = await this.ref.get();
    if (snap.exists()) {
      const data = snap.val();
      this.money = data.money ?? this.money;
      this.inventory = data.inventory ?? [];
      this.ownedVehicleColor = data.ownedVehicleColor ?? this.ownedVehicleColor;
      this.age = data.age ?? this.age;
      this.education = data.education ?? this.education;
      this.deathAge = data.deathAge ?? null;
      // wantedLevel n'est jamais persisté volontairement (repart à 0 à chaque session)
    } else {
      this.save();
    }
    if (this.onLoaded) this.onLoaded();
  }

  save() {
    this.ref.set({
      username: this.username,
      money: this.money,
      inventory: this.inventory,
      ownedVehicleColor: this.ownedVehicleColor,
      age: this.age,
      education: this.education,
      deathAge: this.deathAge,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
  }

  addMoney(amount) {
    this.money = Math.max(0, this.money + amount);
    this.save();
  }

  addItem(item) {
    this.inventory.push(item);
    this.save();
  }

  setVehicleColor(hex) {
    this.ownedVehicleColor = hex;
    this.save();
  }

  increaseWanted(amount) {
    this.wantedLevel = Math.min(5, this.wantedLevel + amount);
    this._wantedDecayTimer = 0;
  }

  // Le niveau de recherche redescend tout seul si le joueur reste
  // "tranquille" quelques secondes (comme dans GTA)
  updateWantedDecay(delta) {
    if (this.wantedLevel <= 0) return;
    this._wantedDecayTimer += delta;
    if (this._wantedDecayTimer > 8) {
      this.wantedLevel = Math.max(0, this.wantedLevel - 1);
      this._wantedDecayTimer = 0;
    }
  }
}
