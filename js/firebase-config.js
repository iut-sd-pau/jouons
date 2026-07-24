// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// 1. https://console.firebase.google.com → Créer un projet (gratuit)
// 2. Ajoute une "Web App" (icône </>) dans les paramètres du projet
// 3. Colle ici les valeurs affichées
// 4. Active "Realtime Database" dans le menu de gauche
// ============================================================

const firebaseConfig = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI.firebaseapp.com",
  databaseURL: "https://REMPLACE_MOI-default-rtdb.firebaseio.com",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI.appspot.com",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
