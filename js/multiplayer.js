// ============================================================
// MULTIJOUEUR — synchronisation des joueurs via Firebase
// ============================================================

export class Multiplayer {
  constructor(username) {
    this.username = username;
    this.playerId = null;
    this.playersRef = db.ref("players");
    this.chatRef = db.ref("chat");
    this.myRef = null;
    this.onPlayerJoined = null;   // callback(id, data)
    this.onPlayerMoved = null;    // callback(id, data)
    this.onPlayerLeft = null;     // callback(id)
    this.onChatMessage = null;    // callback(username, text)
  }

  connect() {
    // Crée une entrée unique pour ce joueur
    this.myRef = this.playersRef.push();
    this.playerId = this.myRef.key;

    const initialState = {
      username: this.username,
      x: 0,
      y: 0,
      z: 0,
      rotY: 0,
      color: this.randomColor(),
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    };

    this.myRef.set(initialState);

    // Supprime automatiquement le joueur s'il ferme l'onglet / perd la connexion
    this.myRef.onDisconnect().remove();

    // Écoute les autres joueurs
    this.playersRef.on("child_added", (snap) => {
      if (snap.key === this.playerId) return;
      if (this.onPlayerJoined) this.onPlayerJoined(snap.key, snap.val());
    });

    this.playersRef.on("child_changed", (snap) => {
      if (snap.key === this.playerId) return;
      if (this.onPlayerMoved) this.onPlayerMoved(snap.key, snap.val());
    });

    this.playersRef.on("child_removed", (snap) => {
      if (snap.key === this.playerId) return;
      if (this.onPlayerLeft) this.onPlayerLeft(snap.key);
    });

    // Chat
    this.chatRef.limitToLast(30).on("child_added", (snap) => {
      const msg = snap.val();
      if (this.onChatMessage) this.onChatMessage(msg.username, msg.text);
    });
  }

  // Envoie ma position (appelé en boucle, mais throttled)
  updatePosition(x, y, z, rotY) {
    if (!this.myRef) return;
    this.myRef.update({
      x, y, z, rotY,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
  }

  sendChatMessage(text) {
    if (!text.trim()) return;
    this.chatRef.push({
      username: this.username,
      text: text.trim(),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }

  randomColor() {
    const colors = ["#4f7fff", "#ff6b6b", "#51cf66", "#ffd43b", "#cc5de8", "#22d3ee", "#ff922b"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  disconnect() {
    if (this.myRef) this.myRef.remove();
    this.playersRef.off();
    this.chatRef.off();
  }
}
