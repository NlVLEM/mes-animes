# Mes Animes

Ma liste d'animes et celle de mes amis : ce qu'on a vu, ce qu'on regarde (saison par saison, épisode par épisode), ce qu'on veut voir, nos notes et nos recommandations, et où regarder chaque anime en France.

- `index.html`, `styles.css`, `app.js` : le site
- `config.js` : les réglages Firebase et la clé TMDB (pas secrets, faits pour être dans une page web)
- `firebase.js` : la bibliothèque Firebase (connexion Google et base de données), regroupée en un fichier à partir de `scripts/firebase-entry.js` avec esbuild
- `firestore.rules` : les règles de sécurité à coller dans la console Firebase
- `sw.js`, `manifest.webmanifest`, icônes : installation sur l'écran d'accueil
- `.github/workflows/pages.yml` : publie le site sur GitHub Pages à chaque modification

Chacun se connecte avec son compte Google et choisit un pseudo. Les listes sont enregistrées dans Firestore ; seules les personnes connectées au site peuvent les lire, et chacun ne peut modifier que la sienne. L'adresse e-mail n'est jamais enregistrée.

Infos, images et saisons : [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. Dispos en France : JustWatch, via TMDB.
