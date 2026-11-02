# Vidéo de démo : scénario de tournage

La vidéo de la page d'accueil et du README suit ce scénario. Elle est produite automatiquement, et peut aussi être tournée à la main avec [Recordly](https://github.com/webadderallorg/Recordly).

## Refaire la vidéo automatiquement

`scripts/record-demo.mjs` joue ce scénario dans Edge sans fenêtre, sur un build de production local, avec un curseur lissé, des effets de clic et des zooms qui suivent l'action (comme le zoom automatique de Recordly) :

```bash
npx supabase start
npm run demo:reset                 # remet les 17 candidatures d'exemple
npm run build && npx next start -p 3100
node scripts/record-demo.mjs       # écrit docs/demo/herbarium-demo.mp4 et affiche les temps des chapitres
npm run demo -- 19 20              # vidéo web, image d'attente, GIF du README (début 19 s, 20 s)
```

Reportez les temps affichés dans `DEMO_CHAPTERS` (`src/components/demo-video.tsx`).

## Tourner à la main avec Recordly

Recordly se pilote uniquement à la souris. Le reste de ce document sert à tourner la vidéo avec lui.

**Durée visée : 60 à 75 secondes, interface en anglais** (compréhensible par tous). Pas de voix : la vidéo tourne en boucle, sans son, sur l'accueil.

## Préparer

1. Lancez l'app **en ligne** (https://herbarium-eta.vercel.app) dans **Chrome ou Edge**, pour que les plantes se peignent en direct.
   La démo se remet à zéro toutes les heures : tournez juste après une heure pile pour partir des 17 candidatures d'exemple.
2. Fenêtre du navigateur en **1440 × 900** environ, zoom du navigateur à 100 %, barre de favoris masquée, aucun autre onglet visible.
3. Déconnectez-vous avant de commencer (la vidéo part de l'accueil).

## Régler Recordly

- Source : **la fenêtre du navigateur** (pas l'écran entier).
- Micro et son système : **désactivés**.
- Zoom automatique : **activé** ; curseur lissé : **activé**.
- Arrière-plan / cadre : sobre, couleur proche de `#e9ece2` ou `#1e3a2b`.

## Tourner

Bougez la souris lentement et marquez une courte pause (1 s) avant chaque clic : le zoom automatique de Recordly suit le curseur.

| Temps | Chapitre | Action |
|---|---|---|
| 0:00 | **Accueil** | Laissez la forêt se peindre (3 s). Cliquez **J'ai déjà un compte**. |
| 0:06 | | Connectez-vous avec `demo@herbarium.test` / `demo-herbarium-2026`. |
| 0:12 | **Vue d'ensemble** | Survolez la barre « Où en sont vos candidatures », puis les **Relances à faire** (pastille ocre du menu). |
| 0:22 | **Nouvelle candidature** | Cliquez le ticket **Nouvelle candidature · N° 018**. Tapez `Jardin des Plantes`, puis `Stage en botanique`. Choisissez l'étiquette **Recherche**. Laissez l'aperçu se peindre à droite (2 s). |
| 0:38 | | Changez le statut sur **Entretien** : la plante de l'aperçu fleurit. Remettez **Envoyée**, puis cliquez **Ajouter à l'herbier**. |
| 0:46 | **La fiche** | Sur la fiche créée, laissez la plante se peindre (2 s). |
| 0:50 | **Mettre à jour** | Dans **Candidatures**, ouvrez le menu du statut d'une ligne et passez-la à **Entretien**. |
| 0:56 | **CV** | Cliquez **CV** : montrez le taux de réponse par version. |
| 1:02 | **Analyse** | Revenez à **Vue d'ensemble**, faites défiler jusqu'à **Réponses par type de stage / par CV / par canal** et la phrase **À retenir**. Fin. |

## Exporter

- Format **MP4**, **1080p**, 30 images/s, qualité « haute » (le fichier sera recompressé ensuite).
- Facultatif : un **GIF** de 15 à 20 s (de 0:22 à 0:46, la création d'une candidature), 960 px de large, pour le README.
- Enregistrez le projet `.recordly` à côté, pour pouvoir retoucher.

Déposez les fichiers dans `docs/demo/` (`herbarium-demo.mp4`, et `herbarium-demo.gif` si vous l'avez fait).
Si l'enchaînement s'écarte du tableau, notez les vrais temps de début de chaque chapitre : ils servent aux chapitres cliquables de l'accueil (`DEMO_CHAPTERS` dans `src/components/demo-video.tsx`).
