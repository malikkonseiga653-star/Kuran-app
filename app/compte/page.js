"use client";

import { useState, useEffect } from "react";
import { Phone, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

const COULEURS = { vert: "#009E49", rouge: "#EF3340" };

function telephoneVersEmail(telephone) {
  return `${telephone.replace(/\D/g, "")}@kuran-app.local`;
}

export default function PageClient() {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("connexion");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: ecouteur } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => ecouteur.subscription.unsubscribe();
  }, []);

  const validerTelephone = (t) => /^(\+226)?[0-9]{8}$/.test(t.trim());

  const inscrire = async () => {
    setErreur("");
    if (!validerTelephone(telephone)) {
      setErreur("Numéro invalide (8 chiffres attendus).");
      return;
    }
    if (motDePasse.length < 6) {
      setErreur("Mot de passe trop court (6 caractères minimum).");
      return;
    }
    setChargement(true);
    const email = telephoneVersEmail(telephone);
    const { data, error } = await supabase.auth.signUp({ email, password: motDePasse });
    if (error) {
      setErreur(error.message.includes("already registered") ? "Ce numéro a déjà un compte." : "Erreur lors de l'inscription.");
      setChargement(false);
      return;
    }
    await supabase.from("clients").insert({ auth_user_id: data.user.id, telephone: telephone.trim() });
    setChargement(false);
  };

  const seConnecter = async () => {
    setErreur("");
    setChargement(true);
    const email = telephoneVersEmail(telephone);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) setErreur("Numéro ou mot de passe incorrect.");
    setChargement(false);
  };

  if (session === undefined) return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Chargement...</p>;

  if (session) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <CheckCircle2 size={32} color={COULEURS.vert} />
        <p style={{ marginTop: 10, fontSize: 15 }}>Vous êtes connecté.</p>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ marginTop: 16, background: "#eee", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer" }}
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 20 }}>
        {mode === "connexion" ? "Connexion" : "Créer un compte"}
      </h1>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <Phone size={16} style={{ position: "absolute", left: 12, top: 14, color: "#999" }} />
        <input
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Numéro de téléphone"
          style={{ width: "100%", padding: "12px 12px 12px 36px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
        />
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <Lock size={16} style={{ position: "absolute", left: 12, top: 14, color: "#999" }} />
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          onKeyDown={(e) => e.key === "Enter" && (mode === "connexion" ? seConnecter() : inscrire())}
          style={{ width: "100%", padding: "12px 12px 12px 36px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
        />
      </div>

      {erreur && (
        <p style={{ color: COULEURS.rouge, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={14} /> {erreur}
        </p>
      )}

      <button
        onClick={mode === "connexion" ? seConnecter : inscrire}
        disabled={chargement}
        style={{
          width: "100%", background: COULEURS.vert, color: "white", border: "none",
          borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 15, marginTop: 8, cursor: "pointer",
        }}
      >
        {chargement ? "Patientez..." : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "#666", marginTop: 14 }}>
        {mode === "connexion" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <button
          onClick={() => { setMode(mode === "connexion" ? "inscription" : "connexion"); setErreur(""); }}
          style={{ background: "none", border: "none", color: COULEURS.vert, fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          {mode === "connexion" ? "Inscrivez-vous" : "Connectez-vous"}
        </button>
      </p>
    </div>
  );
}
