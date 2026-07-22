"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", rouge: "#EF3340" };

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
          throw new Error("Ce numéro de suivi est introuvable.");
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

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Déposer une plainte</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Chaque plainte doit être liée au numéro de suivi de votre panne ou installation.
      </p>

      <label style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Numéro de suivi</label>
      <input
        type="text"
        value={numeroSuivi}
        onChange={(e) => setNumeroSuivi(e.target.value)}
        placeholder="PANNE-2026-000123"
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd",
          fontSize: 15, marginTop: 6, marginBottom: 14, boxSizing: "border-box",
        }}
      />

      <label style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Votre message</label>
      <textarea
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        placeholder="Décrivez votre problème..."
        rows={4}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd",
          fontSize: 15, marginTop: 6, boxSizing: "border-box", resize: "vertical",
        }}
      />

      {statut === "erreur" && (
        <p style={{ color: COULEURS.rouge, fontSize: 13, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={15} /> {messageErreur}
        </p>
      )}
      {statut === "succes" && (
        <p style={{ color: COULEURS.vert, fontSize: 13, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={15} /> Plainte envoyée. L'équipe vous répondra bientôt.
        </p>
      )}

      <button
        onClick={envoyer}
        disabled={envoiEnCours}
        style={{
          marginTop: 16, width: "100%", background: COULEURS.vert, color: "white",
          border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
          opacity: envoiEnCours ? 0.7 : 1,
        }}
      >
        <Send size={16} /> {envoiEnCours ? "Envoi..." : "Envoyer la plainte"}
      </button>
    </div>
  );
        }
