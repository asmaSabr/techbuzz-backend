FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système pour spaCy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install -r requirements.txt

# Télécharger le modèle de langue pour spaCy
#RUN python -m spacy download en_core_web_sm

# Copier le code
COPY . .

# Exposer le port (pour info)
EXPOSE 8000

# Lancer l'application
CMD ["python", "app.py"]