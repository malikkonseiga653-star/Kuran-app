import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  };
    }
