-- ============================================================
-- NUMEROS DE SUIVI AUTOMATIQUES POUR KURAN-APP
-- Format : AAAA-MMJJ-NNN (ex: 2026-0721-001)
-- Compteur separe pour "pannes" et "installations"
-- ============================================================

-- 1. Ajouter la colonne numero_suivi si elle n'existe pas deja
ALTER TABLE pannes ADD COLUMN IF NOT EXISTS numero_suivi TEXT UNIQUE;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS numero_suivi TEXT UNIQUE;

-- 2. Fonction generique qui genere le numero pour une table donnee
CREATE OR REPLACE FUNCTION generer_numero_suivi()
RETURNS TRIGGER AS $$
DECLARE
  prefixe_date TEXT;
  dernier_numero INTEGER;
  nouveau_numero TEXT;
  nom_table TEXT;
BEGIN
  nom_table := TG_TABLE_NAME;
  prefixe_date := TO_CHAR(NOW(), 'YYYY-MMDD');

  -- Compte combien d'entrees existent deja aujourd'hui pour CETTE table
  IF nom_table = 'pannes' THEN
    SELECT COUNT(*) INTO dernier_numero
    FROM pannes
    WHERE numero_suivi LIKE prefixe_date || '-%';
  ELSIF nom_table = 'installations' THEN
    SELECT COUNT(*) INTO dernier_numero
    FROM installations
    WHERE numero_suivi LIKE prefixe_date || '-%';
  END IF;

  nouveau_numero := prefixe_date || '-' || LPAD((dernier_numero + 1)::TEXT, 3, '0');
  NEW.numero_suivi := nouveau_numero;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger sur la table "pannes"
DROP TRIGGER IF EXISTS trigger_numero_suivi_pannes ON pannes;
CREATE TRIGGER trigger_numero_suivi_pannes
BEFORE INSERT ON pannes
FOR EACH ROW
EXECUTE FUNCTION generer_numero_suivi();

-- 4. Trigger sur la table "installations"
DROP TRIGGER IF EXISTS trigger_numero_suivi_installations ON installations;
CREATE TRIGGER trigger_numero_suivi_installations
BEFORE INSERT ON installations
FOR EACH ROW
EXECUTE FUNCTION generer_numero_suivi();

-- ============================================================
-- FIN DU SCRIPT
-- Apres execution : chaque nouvelle panne ou installation
-- recevra automatiquement un numero_suivi unique du type
-- 2026-0721-001, 2026-0721-002, etc. (compteurs separes)
-- ============================================================
