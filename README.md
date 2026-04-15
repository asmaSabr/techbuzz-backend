# Social Pulse INPT – Backend (Minimal Version)

Social Pulse INPT – Application Web Full-Stack sur les tendances technologiques basée sur les réseaux sociaux avec Pred. IA  
Cette première version **backend minimaliste** collecte du contenu technique (Reddit), le traite et l’expose via une API GraphQL.

---

## 🚀 Fonctionnalités déjà implémentées

- **[Collecteur Reddit](ca://s?q=Collecteur_Reddit)**  
  - Module `redditCollector.js` pour récupérer les posts depuis plusieurs subreddits techniques.  
  - Scheduler (`scheduler.js`) basé sur `node-cron` pour lancer la collecte toutes les 10 minutes.

- **[Services](ca://s?q=Services_backend)**  
  - `trendService.js` : filtrage, tri et classification des posts par catégories (AI, Languages, DevOps, Database, Frontend).  
  - `sentimentService.js` : analyse de sentiment des contenus.  
  - `categoryService.js` : attribution de catégories aux posts.  
  - `redisService.js` : gestion du cache et Pub/Sub avec Redis.

- **[Modèles](ca://s?q=Models_backend)**  
  - `Post.js` : schéma MongoDB pour les posts enrichis.  
  - `TrendSnapshot.js` : schéma MongoDB pour les tendances calculées.

- **[API GraphQL](ca://s?q=GraphQL_backend)**  
  - `schema.js` et `resolvers.js` définissent les queries et mutations.  
  - Apollo Server expose l’API sur `/graphql`.  
  - WebSocket activé pour les subscriptions en temps réel.

- **[Config](ca://s?q=Config_backend)**  
  - Centralisation des variables d’environnement et paramètres.  
  - Fichier `.env` pour MongoDB, Redis, et port du serveur.

---

## 🏗️ Architecture actuelle
```
src/
├── collectors/
│   └── redditCollector.js
├── config/
├── graphql/
│   ├── schema.js
│   └── resolvers.js
├── models/
│   ├── Post.js
│   └── TrendSnapshot.js
├── routes/
├── services/
│   ├── categoryService.js
│   ├── redisService.js
│   ├── scheduler.js
│   ├── sentimentService.js
│   └── trendService.js
└── app.js
```
