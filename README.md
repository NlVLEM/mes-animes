# Mes Animes

Ma liste d'animes : ce que j'ai vu, ce que je regarde (épisode par épisode) et ce que je veux voir, avec les plateformes où chaque anime est dispo.

- `index.html` : toute l'app (infos, affiches et liens de streaming via l'API publique d'[AniList](https://anilist.co))
- `sw.js`, `manifest.webmanifest`, icônes : installation sur l'écran d'accueil et ouverture hors ligne
- `.github/workflows/pages.yml` : publie le site sur GitHub Pages à chaque modification

La liste est enregistrée dans le navigateur, et synchronisée entre appareils dans le fichier `animes.json` d'un dépôt GitHub privé (le même que le Classeur Pokémon), avec un jeton d'accès collé dans les réglages de chaque appareil. Rien de personnel n'est stocké dans ce dépôt-ci.
