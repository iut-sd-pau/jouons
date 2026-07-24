# Vie Virtuelle — Monde Ouvert 3D (inspiré de GTA)

Jeu 3D jouable dans le navigateur : monde ouvert avec routes et bâtiments, personnage contrôlable, **véhicules conduisibles**, **PNJ** (piétons + PNJ à rôle), **système de mission de livraison**, **argent persistant**, **boutique**, **niveau de recherche + police qui te poursuit**, **multijoueur temps réel** et **chat**.

## Structure du dossier

```
vie-virtuelle/
├── index.html                    → page principale + tout le HUD
├── css/style.css                 → tous les styles (HUD, boutique, minimap...)
├── js/main.js                    → cœur du jeu, boucle de jeu, liaison de tous les systèmes
├── js/world.js                   → génération du monde (routes, bâtiments, points d'intérêt)
├── js/vehicles.js                → véhicules conduisibles (physique simple)
├── js/npc.js                     → piétons + PNJ à rôle (mission, boutique)
├── js/economy.js                 → argent, inventaire, sauvegarde persistante
├── js/ui.js                      → HUD (argent, étoiles, minimap, boutique, prompts)
├── js/multiplayer.js             → synchronisation Firebase (joueurs, chat)
├── js/firebase-config.js         → TES clés Firebase (à remplir)
└── firebase-database-rules.json  → règles de sécurité à coller dans Firebase
```

## Ce qui fonctionne, comme dans GTA

| Système GTA | Dans ce jeu |
|---|---|
| Déplacement à pied | ✅ Z Q S D, caméra souris, zoom molette |
| Monter/descendre de véhicule | ✅ touche E à proximité d'une voiture |
| Conduite | ✅ accélération, freinage, virage, inertie |
| Renverser des piétons | ✅ fonce sur un PNJ en voiture → il tombe, ton niveau de recherche augmente |
| Police qui te poursuit | ✅ dès que tu as des étoiles, une voiture de police te repère et te course ; si elle t'attrape → amende et perte des étoiles |
| Missions | ✅ un donneur de mission (PNJ avec "!") te confie une livraison, marqueur sur la carte, récompense en argent |
| Argent | ✅ persistant (sauvegardé), gagné en mission, dépensé en boutique |
| Boutique / customisation | ✅ un PNJ boutique ("$") vend des tenues qui changent la couleur de ton personnage |
| Minimap | ✅ en haut à droite, avec joueurs, PNJ importants et mission active |
| Monde partagé / multijoueur | ✅ les autres joueurs connectés apparaissent et bougent en temps réel, chat inclus |
| Sauvegarde de progression | ✅ ton argent et tes achats sont liés à ton navigateur (pas besoin de compte) |

## Ce qu'il te reste à faire pour le mettre en ligne

### 1. Créer un projet Firebase (gratuit)
https://console.firebase.google.com → "Ajouter un projet" → donne-lui un nom (ex: `vie-virtuelle`), Analytics pas nécessaire.

### 2. Récupérer tes clés
Dans le tableau de bord : icône **`</>`** ("Ajouter une app Web") → copie le bloc `firebaseConfig` → colle-le dans `js/firebase-config.js` à la place des `"REMPLACE_MOI"`.

### 3. Activer la Realtime Database
Menu de gauche → **Build → Realtime Database → Créer une base de données** → région Europe → démarre en mode test.

### 4. Copier les règles de sécurité
Onglet **Règles** de la Realtime Database → colle le contenu de `firebase-database-rules.json` → **Publier**.

### 5. Mettre en ligne avec GitHub Pages
1. Crée un repo GitHub public (ex: `vie-virtuelle`)
2. Mets tout le contenu de ce dossier à la racine, `git add . && git commit -m "jeu complet" && git push`
3. **Settings → Pages** → Source: `Deploy from a branch`, branche `main`, dossier `/ (root)`
4. Ton jeu sera en ligne à `https://ton-pseudo.github.io/vie-virtuelle/`

### 6. Tester
Ouvre le lien sur deux onglets/appareils avec deux pseudos différents. Roule en voiture, fonce sur un piéton, regarde la police débarquer, va faire une livraison, dépense ton argent à la boutique.

## Limites honnêtes de cette version

Je préfère être clair avec toi plutôt que de te laisser croire que c'est un GTA complet :

- **Un seul type de mission** (livraison) — pas encore de scénario, de braquages, d'histoire
- **Personnages en formes géométriques simples** (capsule + tête), pas de vrais modèles animés
- **Une seule voiture de police**, pas de vraies unités multiples ni de vraie IA de poursuite avancée
- **Pas de collisions avec les bâtiments** — on peut encore les traverser
- **10 piétons, 6 véhicules** — un monde volontairement petit pour rester fluide et gratuit
- **Firebase gratuit (plan Spark)** : jusqu'à 100 connexions simultanées et 1 Go de données/mois, largement suffisant pour toi et tes amis, mais pas pour des milliers de joueurs
- **Les véhicules ne sont pas synchronisés entre joueurs** : si tu conduis, les autres joueurs voient ton personnage se déplacer comme une voiture (la position est bien synchronisée) mais pas le modèle 3D du véhicule lui-même. Le corriger proprement demande un peu de travail réseau en plus — dis-le-moi si tu veux qu'on s'y attaque

## Prochaines briques possibles (dis-moi ce qui t'intéresse)

1. **Collisions avec les bâtiments** (empêcher de les traverser)
2. **Plus de types de missions** (course-poursuite, taxi, transport de fret)
3. **Vrais modèles 3D animés** (via Mixamo ou Kenney.nl, gratuits)
4. **Système de niveaux/XP** en plus de l'argent
5. **Plus de véhicules** (motos, camions) avec des caractéristiques différentes
6. **Zones/quartiers avec ambiances différentes** (centre-ville, campagne, plage)
