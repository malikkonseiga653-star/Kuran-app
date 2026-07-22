"use client";

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00", rouge: "#EF3340" };

export function NotationElectricien({ numeroSuivi, electricienId }) {
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const envoyer = async () => {
    if (note === 0) {
      setErreur("Merci de choisir une note avant d'envoyer.");
      return;
    }
    setErreur("");
    setEnvoiEnCours(true);
    try {
      const { error } = await supabase.from("notations").insert({
        numero_suivi: numeroSuivi,
        electricien_id: electricienId,
        note,
        commentaire: commentaire.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Cette intervention a déjà été notée. Merci !");
        }
        throw new Error("Erreur lors de l'envoi de votre note.");
      }

      setEnvoye(true);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (envoye) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <CheckCircle2 size={32} color={COULEURS.vert} />
        <p style={{ marginTop: 10, fontSize: 15, color: "#333" }}>Merci pour votre évaluation !</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>
        Comment s'est passée l'intervention ?
      </h1>
      <p style={{ fontSize: 13, color: "#999", textAlign: "center", marginBottom: 20 }}>{numeroSuivi}</p>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setNote(n)}
            onMouseEnter={() => setSurvol(n)}
            onMouseLeave={() => setSurvol(0)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          >
            <Star
              size={32}
              fill={n <= (survol || note) ? COULEURS.jaune : "none"}
              color={n <= (survol || note) ? COULEURS.jaune : "#ccc"}
            />
          </button>
        ))}
      </div>

      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Un commentaire (facultatif)"
        rows={3}
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
      />

      {erreur && <p style={{ color: COULEURS.rouge, fontSize: 13, marginTop: 8 }}>{erreur}</p>}

      <button
        onClick={envoyer}
        disabled={envoiEnCours}
        style={{
          marginTop: 14, width: "100%", background: COULEURS.vert, color: "white",
          border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 15, cursor: "pointer",
          opacity: envoiEnCours ? 0.7 : 1,
        }}
      >
        {envoiEnCours ? "Envoi..." : "Envoyer mon évaluation"}
      </button>
    </div>
  );
    }
