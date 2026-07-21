-- ============================================================
-- KURAN-APP — FINITIONS SÉCURITÉ + NOTATION (esprit Yango)
-- À exécuter bloc par bloc dans Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- BLOC A : validation que numero_suivi_lie existe vraiment
-- avant d'accepter une plainte (empêche les plaintes fantômes)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION verifier_numero_suivi_existe()
RETURNS TRIGGER AS $$
DECLARE
  existe_dans_pannes BOOLEAN;
  existe_dans_installations BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pannes WHERE numero_suivi = NEW.numero_suivi_lie) INTO existe_dans_pannes;
  SELECT EXISTS(SELECT 1 FROM installations WHERE numero_suivi = NEW.numero_suivi_lie) INTO existe_dans_installations;

  IF NOT existe_dans_pannes AND NOT existe_dans_installations THEN
    RAISE EXCEPTION 'Numéro de suivi introuvable : %', NEW.numero_suivi_lie;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verifier_numero_suivi ON plaintes;
CREATE TRIGGER trg_verifier_numero_suivi
  BEFORE INSERT ON plaintes
  FOR EACH ROW
  EXECUTE FUNCTION verifier_numero_suivi_existe();

-- ------------------------------------------------------------
-- BLOC B : table de notation électricien (après intervention)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_suivi TEXT NOT NULL,
  electricien_id UUID,
  note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_principal_all_notations" ON notations;
CREATE POLICY "admin_principal_all_notations" ON notations
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin_principal')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin_principal');

DROP POLICY IF EXISTS "employe_lecture_notations" ON notations;
CREATE POLICY "employe_lecture_notations" ON notations
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin_principal', 'employe'));

DROP POLICY IF EXISTS "public_insert_notations" ON notations;
CREATE POLICY "public_insert_notations" ON notations
  FOR INSERT WITH CHECK (true); -- client note après intervention, sans compte

-- ------------------------------------------------------------
-- BLOC C : vue note moyenne + nombre d'interventions par électricien
-- (remplace la vue simple précédente pour employe)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW electriciens_avec_stats AS
SELECT
  e.id,
  e.nom,
  e.prenom,
  e.experience,
  e.statut,
  COALESCE(AVG(n.note), 0)::NUMERIC(3,2) AS note_moyenne,
  COUNT(n.id) AS nombre_interventions
FROM electriciens e
LEFT JOIN notations n ON n.electricien_id = e.id
GROUP BY e.id, e.nom, e.prenom, e.experience, e.statut;

GRANT SELECT ON electriciens_avec_stats TO authenticated;

-- ------------------------------------------------------------
-- BLOC D : anti-abus sur les notations (une note par numero_suivi)
-- ------------------------------------------------------------
ALTER TABLE notations ADD CONSTRAINT IF NOT EXISTS notation_unique_par_suivi UNIQUE (numero_suivi);

-- ============================================================
-- FIN — après ce script :
-- - une plainte sans numero_suivi valide est rejetée
-- - le client peut noter 1 à 5 après intervention
-- - electriciens_avec_stats donne note moyenne + volume, sans exposer
--   téléphone/diplôme/localisation
-- ============================================================
