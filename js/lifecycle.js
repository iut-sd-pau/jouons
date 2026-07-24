// ============================================================
// CYCLE DE VIE — âge, étapes, vieillissement, mort, héritage
// ============================================================
// 1 année de vie du personnage = SECONDS_PER_YEAR secondes réelles.
// Ajuste cette valeur si tu veux des vies plus longues ou plus courtes.

export const SECONDS_PER_YEAR = 18;

export const STAGES = {
  ENFANT: { key: "enfant", label: "Enfant", minAge: 6, scale: 0.55, speedMult: 0.85, canDrive: false, canWork: false },
  ADO: { key: "ado", label: "Adolescent", minAge: 13, scale: 0.8, speedMult: 1.0, canDrive: false, canWork: true },
  ADULTE: { key: "adulte", label: "Adulte", minAge: 18, scale: 1.0, speedMult: 1.0, canDrive: true, canWork: true },
  SENIOR: { key: "senior", label: "Senior", minAge: 65, scale: 0.95, speedMult: 0.7, canDrive: true, canWork: true }
};

export class Lifecycle {
  constructor(playerData) {
    this.playerData = playerData;
    this.age = playerData.age ?? 6;
    this.education = playerData.education ?? 0;
    this.deathAge = playerData.deathAge ?? this.rollDeathAge();
    this.ageTimer = 0;
    this.alive = true;
    this.currentStage = this.computeStage();
  }

  rollDeathAge() {
    // Espérance de vie aléatoire réaliste, entre 72 et 94 ans
    return 72 + Math.floor(Math.random() * 22);
  }

  computeStage() {
    if (this.age >= STAGES.SENIOR.minAge) return STAGES.SENIOR;
    if (this.age >= STAGES.ADULTE.minAge) return STAGES.ADULTE;
    if (this.age >= STAGES.ADO.minAge) return STAGES.ADO;
    return STAGES.ENFANT;
  }

  // Retourne un événement à afficher si l'âge a changé ce tick, sinon null
  update(delta) {
    if (!this.alive) return null;
    this.ageTimer += delta;

    if (this.ageTimer >= SECONDS_PER_YEAR) {
      this.ageTimer = 0;
      this.age += 1;
      this.playerData.age = this.age;
      this.playerData.save();

      const newStage = this.computeStage();
      const stageChanged = newStage.key !== this.currentStage.key;
      this.currentStage = newStage;

      if (this.age >= this.deathAge) {
        this.alive = false;
        return { type: "death" };
      }

      if (stageChanged) {
        return { type: "stage_change", stage: newStage };
      }

      return { type: "birthday", age: this.age };
    }

    return null;
  }

  studyAtSchool() {
    if (this.age >= STAGES.ADULTE.minAge) return 0;
    const gained = 5;
    this.education = Math.min(100, this.education + gained);
    this.playerData.education = this.education;
    this.playerData.save();
    return gained;
  }

  // Bonus de revenu lié à l'éducation accumulée (max +50%)
  getIncomeMultiplier() {
    return 1 + this.education / 200;
  }

  canDrive() {
    return this.currentStage.canDrive;
  }

  canWork() {
    return this.currentStage.canWork;
  }

  // Applique un héritage et repart de zéro (nouvelle vie)
  reincarnate() {
    const legacy = Math.floor(this.playerData.money * 0.25);
    this.playerData.money = 500 + legacy;
    this.playerData.age = 6;
    this.playerData.education = 0;
    this.playerData.deathAge = this.rollDeathAge();
    this.playerData.save();

    this.age = 6;
    this.education = 0;
    this.ageTimer = 0;
    this.deathAge = this.playerData.deathAge;
    this.alive = true;
    this.currentStage = this.computeStage();

    return legacy;
  }
}
