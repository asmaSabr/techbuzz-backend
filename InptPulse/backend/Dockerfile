FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances d'abord (meilleur cache)
COPY package*.json ./

# Installer toutes les dépendances (y compris dev pour le hot-reload)
RUN npm install -g nodemon

# Copier tout le code source
COPY . .

# Exposer le port de l'application
EXPOSE 3000

# Commande de démarrage (nodemon pour le hot-reload en dev)
CMD ["npm", "run", "dev"]