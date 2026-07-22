"use client";

import { useState } from "react";
import { Send, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00", rouge: "#EF3340" };

export function FormulairePlainte() {
  const [numeroSuivi, setNumeroSuivi] = useState("");
  const [contenu, setContenu] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [statut, setStatut] = useState(null);
  const [messageErreur, setMessageErreur] = useState("");

  const envoyer = async () => {
    setStatut(null);
    setMessageErreur("");

    const numeroPropre = numeroSuivi.trim().toUpperCase();
    if (!numeroPropre) {
      setMessageErreur("Merci d'indiquer le numéro de suivi de votre commande.");
      return;
    }
    if (!contenu.trim()) {
      setMessageErreur("Merci de décrire votre plainte.");
      return;
    }

    setEnvoiEnCours(true);
    try {
      const { error } = await supabase.from("plaintes").insert({
        numero_suivi_lie: numeroPropre,
        contenu: contenu.trim(),
        auteur: "client",
      });

      if (error) {
        if (error.message?.includes("introuvable")) {
          throw new Error("Ce numéro de suivi est introuvable. Vérifiez qu'il correspond bien à votre demande.");
        }
        throw new Error("Erreur lors de l'envoi. Réessayez.");
      }

      setStatut("succes");
      setContenu("");
    } catch (e) {
      setStatut("erreur");
      setMessageErreur(e.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };
