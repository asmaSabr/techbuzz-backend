import redis
import json
import os
import logging
import time
import spacy
from keybert import KeyBERT

# ─────────────────────────────────────────────
# CONFIGURATION LOGS
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# INITIALISATION DES MODÈLES NLP
# ─────────────────────────────────────────────
def load_models():
    """Charge les modèles NLP avec fallback gracieux"""
    models = {"nlp": None, "keybert": None}
    
    # Charger spaCy (Named Entity Recognition)
    try:
        models["nlp"] = spacy.load("en_core_web_sm")
        logger.info("✅ Modèle spaCy 'en_core_web_sm' chargé")
    except OSError:
        logger.warning("⚠️ spaCy modèle non trouvé. NER désactivé.")
    
    # Charger KeyBERT (extraction keywords sémantiques)
    try:
        models["keybert"] = KeyBERT()
        logger.info("✅ KeyBERT initialisé")
    except Exception as e:
        logger.warning(f"⚠️ KeyBERT échec: {e}. Fallback TF-IDF activé.")
    
    return models

# ─────────────────────────────────────────────
# EXTRACTION KEYWORDS (Sémantique)
# ─────────────────────────────────────────────
def extract_keywords(text, nlp_models, max_keywords=10):
    """Extrait des keywords sémantiques depuis un texte"""
    keywords = []
    
    # Option 1: KeyBERT (si disponible)
    if nlp_models["keybert"]:
        try:
            kw = nlp_models["keybert"].extract_keywords(
                text,
                keyphrase_ngram_range=(1, 3),  # 1 à 3 mots
                stop_words='english',
                top_n=max_keywords,
                diversity=0.7  # Évite les doublons sémantiques
            )
            keywords = [{"text": k[0], "score": round(k[1], 3)} for k in kw]
            logger.debug(f"🔑 KeyBERT: {len(keywords)} keywords extraits")
            return keywords
        except Exception as e:
            logger.warning(f"⚠️ KeyBERT erreur: {e}. Fallback simple.")
    
    # Option 2: Fallback simple (regex + fréquence)
    words = text.lower().replace('[^a-z\s]', '').split()
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
    freq = {}
    for w in words:
        if len(w) > 3 and w not in stopwords:
            freq[w] = freq.get(w, 0) + 1
    keywords = [{"text": k, "score": round(v/len(words), 3)} 
                for k, v in sorted(freq.items(), key=lambda x: -x[1])[:max_keywords]]
    logger.debug(f"🔑 Fallback: {len(keywords)} keywords extraits")
    return keywords

# ─────────────────────────────────────────────
# DÉTECTION ENTITÉS (spaCy NER)
# ─────────────────────────────────────────────
def extract_entities(text, nlp_models):
    """Détecte les entités nommées (technologies, entreprises...)"""
    entities = []
    if not nlp_models["nlp"]:
        return entities
    
    try:
        doc = nlp_models["nlp"](text)
        for ent in doc.ents:
            # Filtrer uniquement les entités pertinentes pour l'IT
            if ent.label_ in ["ORG", "PRODUCT", "GPE", "TECH"] or len(ent.text) > 3:
                entities.append({
                    "text": ent.text,
                    "type": ent.label_,
                    "confidence": 0.8  # Score simplifié
                })
        logger.debug(f"🏷️  NER: {len(entities)} entités détectées")
    except Exception as e:
        logger.warning(f"⚠️ NER erreur: {e}")
    return entities

# ─────────────────────────────────────────────
# ANALYSE SENTIMENT (Simple)
# ─────────────────────────────────────────────
def analyze_sentiment(text):
    """Analyse sentiment basique (positif/négatif/neutre)"""
    # Liste simplifiée de mots sentimentaux tech
    positive = {'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'impressive', 'powerful'}
    negative = {'bad', 'terrible', 'hate', 'worst', 'awful', 'slow', 'buggy', 'broken'}
    
    words = set(text.lower().split())
    pos_count = len(words & positive)
    neg_count = len(words & negative)
    
    if pos_count > neg_count:
        return {"score": 0.7, "label": "positive"}
    elif neg_count > pos_count:
        return {"score": -0.7, "label": "negative"}
    return {"score": 0.0, "label": "neutral"}

# ─────────────────────────────────────────────
# TRAITEMENT PRINCIPAL D'UN POST
# ─────────────────────────────────────────────
def process_post(message, nlp_models):
    """Traite un post et retourne les résultats NLP"""
    start_time = time.time()
    
    try:
        content = f"{message.get('title', '')} {message.get('content', '')}".strip()
        if len(content) < 20:
            return {"error": "content_too_short"}
        
        # Extraire keywords, entités, sentiment
        keywords = extract_keywords(content, nlp_models)
        entities = extract_entities(content, nlp_models)
        sentiment = analyze_sentiment(content)
        
        processing_time = round((time.time() - start_time) * 1000, 2)
        
        logger.info(f"✅ Post traité en {processing_time}ms: {len(keywords)} keywords, {len(entities)} entités")
        
        return {
            "job_id": message.get("job_id"),
            "status": "success",
            "processing_time_ms": processing_time,
            "result": {
                "keywords": keywords,
                "entities": entities,
                "sentiment": sentiment,
                "language": "en"  # À améliorer avec langdetect plus tard
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur traitement post: {e}")
        return {
            "job_id": message.get("job_id"),
            "status": "error",
            "error": {"code": "PROCESSING_ERROR", "message": str(e)}
        }

# ─────────────────────────────────────────────
# BOUCLE PRINCIPALE DU WORKER
# ─────────────────────────────────────────────
def main():
    logger.info("🚀 NLP Worker démarré")
    
    # Charger les modèles NLP
    nlp_models = load_models()
    
    # Connexion Redis
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    logger.info(f"🔌 Connexion à Redis: {redis_url}")
    
    while True:
        try:
            r = redis.from_url(redis_url)
            r.ping()
            logger.info("✅ Connecté à Redis. En écoute sur 'nlp_queue'...")
            
            # Boucle de consommation des messages
            while True:
                # Attendre un message (timeout 5s pour permettre les Ctrl+C)
                result = r.brpop("nlp_queue", timeout=5)
                
                if result:
                    _, raw_message = result
                    message = json.loads(raw_message)
                    logger.info(f"📥 Message reçu: job_id={message.get('job_id')}")
                    
                    # Traiter le post
                    response = process_post(message, nlp_models)
                    
                    # Envoyer la réponse
                    r.lpush("nlp_results_queue", json.dumps(response))
                    logger.info(f"📤 Réponse envoyée: {response['status']}")
                    
        except redis.ConnectionError:
            logger.warning("⏳ Redis indisponible, réessai dans 3s...")
            time.sleep(3)
        except KeyboardInterrupt:
            logger.info("🛑 Arrêt du worker demandé")
            break
        except Exception as e:
            logger.error(f"❌ Erreur inattendue: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()