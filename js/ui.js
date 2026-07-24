// ============================================================
// INTERFACE (HUD) — argent, wanted stars, minimap, prompts, boutique
// ============================================================

export class UI {
  constructor() {
    this.moneyEl = document.getElementById("money-display");
    this.wantedEl = document.getElementById("wanted-display");
    this.promptEl = document.getElementById("interaction-prompt");
    this.missionEl = document.getElementById("mission-banner");
    this.shopModal = document.getElementById("shop-modal");
    this.shopCloseBtn = document.getElementById("shop-close-btn");
    this.shopItemsEl = document.getElementById("shop-items");
    this.minimapCanvas = document.getElementById("minimap-canvas");
    this.minimapCtx = this.minimapCanvas.getContext("2d");

    this.shopCloseBtn.addEventListener("click", () => this.closeShop());
  }

  updateMoney(amount) {
    this.moneyEl.textContent = `💰 ${amount} €`;
  }

  updateWanted(level) {
    const stars = "★".repeat(level) + "☆".repeat(5 - level);
    this.wantedEl.textContent = level > 0 ? `🚨 ${stars}` : "";
  }

  showPrompt(text) {
    this.promptEl.textContent = text;
    this.promptEl.classList.remove("hidden");
  }

  hidePrompt() {
    this.promptEl.classList.add("hidden");
  }

  showMission(text) {
    this.missionEl.textContent = text;
    this.missionEl.classList.remove("hidden");
  }

  hideMission() {
    this.missionEl.classList.add("hidden");
  }

  openShop(items, onBuy) {
    this.shopItemsEl.innerHTML = "";
    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "shop-item";
      div.innerHTML = `
        <div class="shop-item-swatch" style="background:${item.color}"></div>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-price">${item.price} €</div>
        </div>
        <button class="shop-buy-btn">Acheter</button>
      `;
      div.querySelector(".shop-buy-btn").addEventListener("click", () => onBuy(item));
      this.shopItemsEl.appendChild(div);
    });
    this.shopModal.classList.remove("hidden");
  }

  closeShop() {
    this.shopModal.classList.add("hidden");
  }

  isShopOpen() {
    return !this.shopModal.classList.contains("hidden");
  }

  // Dessine la minimap : joueur (centre), autres joueurs, PNJ importants, marqueurs
  drawMinimap(playerPos, playerRotY, otherPlayers, pointsOfInterest, worldSize) {
    const ctx = this.minimapCtx;
    const size = this.minimapCanvas.width;
    const scale = size / worldSize;
    ctx.clearRect(0, 0, size, size);

    // Fond
    ctx.fillStyle = "rgba(10, 14, 20, 0.55)";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    const toMap = (worldX, worldZ) => ({
      x: size / 2 + (worldX - playerPos.x) * scale,
      y: size / 2 + (worldZ - playerPos.z) * scale
    });

    // Points d'intérêt
    pointsOfInterest.forEach((poi) => {
      const p = toMap(poi.x, poi.z);
      ctx.fillStyle = poi.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Autres joueurs
    ctx.fillStyle = "#ff6b6b";
    for (const id in otherPlayers) {
      const pos = otherPlayers[id].mesh.position;
      const p = toMap(pos.x, pos.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Bordure
    ctx.strokeStyle = "rgba(120,170,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Joueur (toujours au centre, flèche orientée)
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(playerRotY);
    ctx.fillStyle = "#4f7fff";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
