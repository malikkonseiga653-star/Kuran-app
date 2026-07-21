import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ---- Fonctions d'accès aux données (remplacent window.storage) ----

export async function chargerPannes() {
  const { data, error } = await supabase
    .from("pannes")
    .select("*")
    .order("cree_le", { ascending: false });
  if (error) {
    console.error("Erreur chargement pannes:", error);
    return [];
  }
  return (data || []).map(depuisLignePanne);
}

export async function chargerElectriciens() {
  const { data, error } = await supabase
    .from("electriciens")
    .select("*")
    .order("inscrit_le", { ascending: false });
  if (error) {
    console.error("Erreur chargement electriciens:", error);
    return [];
  }
  return (data || []).map(depuisLigneElectricien);
}

export async function ajouterPanneDB(panne) {
  const { error } = await supabase.from("pannes").insert(versLignePanne(panne));
  return !error;
}

export async function majPanneDB(id, champs) {
  const { error } = await supabase.from("pannes").update(champs).eq("id", id);
  return !error;
}

export async function ajouterElectricienDB(candidat) {
  const { error } = await supabase.from("electriciens").insert(versLigneElectricien(candidat));
  return !error;
}

export async function majElectricienDB(id, statut) {
  const { error } = await supabase.from("electriciens").update({ statut }).eq("id", id);
  return !error;
}

export async function feliciterElectricien(id) {
  const { error } = await supabase
    .from("electriciens")
    .update({ felicitation_le: Date.now(), felicitation_vue: false })
    .eq("id", id);
  return !error;
}

export async function marquerFelicitationVueElectricien(id) {
  const { error } = await supabase.from("electriciens").update({ felicitation_vue: true }).eq("id", id);
  return !error;
}

// ---- Mot de passe administrateur ----

export async function verifierMotDePasseAdmin(motDePasse) {
  const { data, error } = await supabase
    .from("admin_config")
    .select("mot_de_passe")
    .eq("id", "principal")
    .single();
  if (error || !data) return false;
  return data.mot_de_passe === motDePasse;
}

export async function changerMotDePasseAdmin(nouveauMotDePasse) {
  const { error } = await supabase
    .from("admin_config")
    .update({ mot_de_passe: nouveauMotDePasse })
    .eq("id", "principal");
  return !error;
}

// ---- Comptes administrateurs / employés ----

export async function connecterCompteAdmin(identifiant, motDePasse) {
  const { data, error } = await supabase
    .from("comptes_admin")
    .select("*")
    .eq("identifiant", identifiant)
    .maybeSingle();
  if (error || !data) return null;
  if (data.mot_de_passe !== motDePasse) return null;
  return {
    id: data.id,
    identifiant: data.identifiant,
    nom: data.nom,
    prenom: data.prenom,
    role: data.role,
    statut: data.statut,
    felicitationLe: data.felicitation_le ? Number(data.felicitation_le) : null,
    felicitationVue: data.felicitation_vue !== false,
  };
}

export async function demanderCompteEmploye(candidat) {
  const { error } = await supabase.from("comptes_admin").insert({
    id: candidat.id,
    identifiant: candidat.identifiant,
    mot_de_passe: candidat.motDePasse,
    nom: candidat.nom,
    prenom: candidat.prenom,
    role: "employe",
    statut: "en_attente",
    cree_le: candidat.creeLe,
  });
  return !error;
}

export async function chargerComptesAdmin() {
  const { data, error } = await supabase
    .from("comptes_admin")
    .select("*")
    .order("cree_le", { ascending: false });
  if (error) {
    console.error("Erreur chargement comptes admin:", error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    identifiant: row.identifiant,
    nom: row.nom,
    prenom: row.prenom,
    role: row.role,
    statut: row.statut,
    creeLe: Number(row.cree_le),
    felicitationLe: row.felicitation_le ? Number(row.felicitation_le) : null,
    felicitationVue: row.felicitation_vue !== false,
  }));
}

export async function majStatutCompteAdmin(id, statut) {
  const { error } = await supabase.from("comptes_admin").update({ statut }).eq("id", id);
  return !error;
}

export async function feliciterEmploye(id) {
  const { error } = await supabase
    .from("comptes_admin")
    .update({ felicitation_le: Date.now(), felicitation_vue: false })
    .eq("id", id);
  return !error;
}

export async function marquerFelicitationVueEmploye(id) {
  const { error } = await supabase.from("comptes_admin").update({ felicitation_vue: true }).eq("id", id);
  return !error;
}

// ---- Journal des actions (traçabilité) ----

export async function enregistrerAction(auteur, action, cible) {
  const { error } = await supabase.from("journal_actions").insert({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    auteur_identifiant: auteur.identifiant,
    auteur_nom: `${auteur.prenom} ${auteur.nom}`,
    action,
    cible: cible || null,
    horodatage: Date.now(),
  });
  return !error;
}

export async function chargerJournal() {
  const { data, error } = await supabase
    .from("journal_actions")
    .select("*")
    .order("horodatage", { ascending: false })
    .limit(200);
  if (error) {
    console.error("Erreur chargement journal:", error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    auteurIdentifiant: row.auteur_identifiant,
    auteurNom: row.auteur_nom,
    action: row.action,
    cible: row.cible,
    horodatage: Number(row.horodatage),
  }));
}

// ---- Conversion entre le format JS (camelCase) et les colonnes SQL (snake_case) ----

function versLignePanne(p) {
  return {
    id: p.id,
    categorie: p.categorie,
    type: p.type,
    description: p.description,
    secteur: p.secteur,
    position_lat: p.position ? p.position.lat : null,
    position_lng: p.position ? p.position.lng : null,
    statut: p.statut,
    cree_le: p.creeLe,
    maj_le: p.majLe,
    prix_min: p.prixMin,
    prix_max: p.prixMax,
    prix_final: p.prixFinal,
    commission: p.commission,
  };
}

function depuisLignePanne(row) {
  return {
    id: row.id,
    categorie: row.categorie,
    type: row.type,
    description: row.description,
    secteur: row.secteur,
    position: row.position_lat != null ? { lat: row.position_lat, lng: row.position_lng } : null,
    statut: row.statut,
    creeLe: Number(row.cree_le),
    majLe: Number(row.maj_le),
    prixMin: row.prix_min,
    prixMax: row.prix_max,
    prixFinal: row.prix_final,
    commission: row.commission,
  };
}

function versLigneElectricien(e) {
  return {
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    age: e.age,
    secteur: e.secteur,
    experience: e.experience,
    niveau_etudes: e.niveauEtudes,
    telephone: e.telephone,
    mot_de_passe: e.motDePasse,
    cnib_nom_fichier: e.cnibNomFichier,
    statut: e.statut,
    inscrit_le: e.inscritLe,
  };
}

function depuisLigneElectricien(row) {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    age: row.age,
    secteur: row.secteur,
    experience: row.experience,
    niveauEtudes: row.niveau_etudes,
    telephone: row.telephone,
    motDePasse: row.mot_de_passe,
    cnibNomFichier: row.cnib_nom_fichier,
    statut: row.statut,
    inscritLe: Number(row.inscrit_le),
    felicitationLe: row.felicitation_le ? Number(row.felicitation_le) : null,
    felicitationVue: row.felicitation_vue !== false,
  };
}
