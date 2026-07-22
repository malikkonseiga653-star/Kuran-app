import { useState } from "react";
import { Send, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00", rouge: "#EF3340" };

// ============================================================
// FORMULAIRE DE PLAINTE — lié obligatoirement au numéro de suivi
// La base rejette elle-même toute plainte dont le numéro n'existe
// pas (trigger trg_verifier_numero_suivi), donc on relaie ce
// message d'erreur tel quel au client.
// ============================================================
export function FormulairePlainte() {
  const [numeroSuivi, setNumeroSuivi] = useState("");
  const [contenu, setContenu] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [statut, setStatut] = useState(null); // null | 'succes' | 'erreur'
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
        // Le trigger renvoie "Numéro de suivi introuvable : XXX" si le numéro n'existe pas.
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

// ============================================================
// NOTATION ÉLECTRICIEN — après intervention (esprit Yango)
// numeroSuivi et electricienId doivent être passés en props
// depuis l'écran de suivi une fois le statut "resolu" atteint.
// ============================================================
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
        // La contrainte notation_unique_par_suivi bloque une deuxième note sur la même commande.
        if (error.code === "23505") {
          throw new Error("Cette intervention a déjà été notée. Merci !");
        }
        throw new Error("Erreur lors de l'envoi de votre note. Réessayez.");
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
