# Vie Virtuelle — Une Vraie Vie, de la Naissance à la Mort

Jeu 3D jouable dans le navigateur, inspiré de GTA mais centré sur un **vrai cycle de vie** : tu commences enfant, tu grandis, tu vas à l'école, tu deviens adolescent puis adulte (tu peux alors conduire et travailler), tu vieillis, et tu finis par mourir — avec un héritage transmis à ta prochaine vie. Le tout dans une ville ouverte avec voitures, motos, PNJ vivants, missions, police, boutique, cycle jour/nuit, et multijoueur temps réel.

## Structure du dossier

```
vie-virtuelle/
├── index.html                    → page principale + tout le HUD
├── css/style.css                 → tous les styles
├── js/main.js                    → cœur du jeu, boucle de jeu, liaison de tous les systèmes
├── js/lifecycle.js               → NOUVEAU — âge, étapes de vie, mort, héritage
├── js/world.js                   → génération du monde (routes, bâtiments, quartiers, arbres, lampadaires)
├── js/vehicles.js                → véhicules conduisibles (voitures + motos)
├── js/npc.js                     → piétons qui parlent, PNJ à rôle (mission, boutique)
├── js/economy.js                 → argent, éducation, âge, sauvegarde persistante
├── js/ui.js                      → HUD (argent, âge, étoiles, minimap, boutique, écran de mort)
├── js/multiplayer.js             → synchronisation Firebase (joueurs, chat)
├── js/firebase-config.js         → TES clés Firebase (à remplir)
└── firebase-database-rules.json  → règles de sécurité à coller dans Firebase
```

## Ce qui fonctionne — le cycle de vie complet

| Étape | Âge | Ce qui change |
|---|---|---|
| 👶 Enfant | 6-12 ans | Petit personnage, lent, ne peut pas conduire ni travailler. Peut étudier à l'école (+ points d'éducation) |
| 🧑 Adolescent | 13-17 ans | Grandit, peut commencer à travailler (livraisons), toujours pas le droit de conduire |
| 🧑‍💼 Adulte | 18-64 ans | Taille et vitesse normales, peut conduire, prendre tous les métiers (livraison, taxi), acheter en boutique |
| 👴 Senior | 65 ans+ | Un peu plus lent, toujours actif |
| 🕊️ Mort | entre 72 et 94 ans (aléatoire, tiré au sort à la naissance) | Écran de fin de vie avec résumé, puis nouvelle vie avec 25% de l'argent transmis en héritage |

Le temps s'écoule automatiquement : **1 année de vie = 18 secondes réelles** par défaut (réglable dans `js/lifecycle.js`, constante `SECONDS_PER_YEAR`) — une vie complète dure environ 20 à 25 minutes de jeu. Des anniversaires apparaissent avec parfois un petit cadeau en argent.

## Le reste du monde

| Système | Détail |
|---|---|
| Conduite | Voitures et motos (accélération/vitesse différentes), montée/descente avec E |
| Renverser des piétons | Fonce sur un PNJ en véhicule → il tombe, ton niveau de recherche augmente |
| Combat simple | Touche F pour donner un coup de poing à un piéton proche (à pied uniquement) |
| Police | Te repère et te poursuit dès que tu as des étoiles ; t'attrape → amende et perte des étoiles |
| École | Zone violette : étudier fait gagner des points d'éducation, qui augmentent tes revenus une fois adulte (jusqu'à +50%) |
| Missions livraison | PNJ "!" doré : livre un colis, marqueur vert sur la carte |
| Missions taxi | Zone orange : dépose un client en voiture, doit être adulte et savoir conduire |
| Boutique | PNJ "$" bleu : achète des tenues qui changent la couleur de ton personnage |
| Jour/nuit | Cycle complet (~4 min), le ciel change de couleur, les lampadaires s'allument la nuit |
| PNJ vivants | Les piétons se déplacent et affichent parfois des petites bulles de dialogue |
| Multijoueur | Les autres joueurs connectés apparaissent et bougent en temps réel, avec chat |
| Sauvegarde | Argent, âge, éducation liés à ton navigateur (pas besoin de compte) |

## Mise en ligne (identique à avant)

### 1. Créer un projet Firebase (gratuit)
https://console.firebase.google.com → "Ajouter un projet"

### 2. Récupérer tes clés
Icône **`</>`** ("Ajouter une app Web") → copie le bloc `firebaseConfig` → colle-le dans `js/firebase-config.js`.

### 3. Activer la Realtime Database
**Build → Realtime Database → Créer une base de données** → mode test.

### 4. Copier les règles de sécurité
Onglet **Règles** → colle `firebase-database-rules.json` → **Publier**.

### 5. Mettre en ligne avec GitHub Pages
Repo GitHub public → tout le contenu à la racine → `git push` → **Settings → Pages** → branche `main`, dossier `/ (root)`.

### 6. Tester
Ouvre le lien, choisis un pseudo, tu commences enfant à 6 ans. Laisse le temps passer, va à l'école, grandis, deviens adulte, prends une voiture, fais des missions, et regarde ce qui se passe quand tu meurs de vieillesse.

## Limites honnêtes de cette version

- **Pas de vraie famille/relations** (parents, enfants, mariage, amis proches) — c'est la plus grosse simplification par rapport à un vrai simulateur de vie type BitLife. Faisable ensuite si tu veux.
- **Un seul type d'événement de vie aléatoire** (cadeau d'anniversaire) — pas encore de maladies, accidents, choix de vie à embranchements
- **Pas de vraie carrière progressive** (juste deux métiers répétables : livraison et taxi), pas de logement à acheter
- **Personnages en formes géométriques simples**, pas de vrais modèles animés qui vieillissent visuellement (juste une mise à l'échelle)
- **Les véhicules ne sont pas synchronisés entre joueurs** (position du joueur oui, mais pas le modèle 3D du véhicule vu par les autres)
- **Pas de collisions avec les bâtiments**
- **Firebase gratuit (plan Spark)** : jusqu'à 100 connexions simultanées, largement suffisant pour toi et tes amis

## Prochaines briques possibles

1. **Relations/famille** — rencontrer d'autres joueurs, se marier, avoir des enfants (avec de vraies implications de gameplay)
2. **Vrais événements de vie aléatoires** — maladies, accidents, opportunités, choix moraux avec conséquences
3. **Carrières progressives** — embauche fixe avec évolution de poste/salaire plutôt que missions répétées
4. **Logement à acheter/décorer**
5. **Modèles 3D qui vieillissent visuellement** (cheveux blancs, canne pour les seniors, etc.)
6. **Collisions avec les bâtiments**
