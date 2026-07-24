// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// 1. https://console.firebase.google.com → Créer un projet (gratuit)
// 2. Ajoute une "Web App" (icône </>) dans les paramètres du projet
// 3. Colle ici les valeurs affichées
// 4. Active "Realtime Database" dans le menu de gauche
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDIVze3XJ3OY8OvQc_ekpf2uxPnD-B2mxQ",
  authDomain: "jouons-ba9fe.firebaseapp.com",
  databaseURL: "https://jouons-ba9fe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "jouons-ba9fe",
  storageBucket: "jouons-ba9fe.firebasestorage.app",
  messagingSenderId: "1003832351346",
  appId: "1:1003832351346:web:6eb5550a066ca389c480eb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
