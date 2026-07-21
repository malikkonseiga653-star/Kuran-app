"use client";

import { useState, useEffect } from "react";
import DashboardAdmin from "../../components/DashboardAdmin";
import { supabase } from "../../lib/supabase";

export default function PageAdmin() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurConnexion, setErreurConnexion] = useState("");
  const [connexionEnCours, setConnexionEnCours] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: ecouteur } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => ecouteur.subscription.unsubscribe();
  }, []);

  const seConnecter = async () => {
    setErreurConnexion("");
    setConnexionEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) setErreurConnexion("Email ou mot de passe incorrect.");
    setConnexionEnCours(false);
  };

  if (session === undefined) {
    return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Chargement...</p>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>
          Connexion administration
        </h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid #ddd", fontSize: 15, marginBottom: 10, boxSizing: "border-box" }}
        />
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          onKeyDown={(e) => e.key === "Enter" && seConnecter()}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid #ddd", fontSize: 15, marginBottom: 10, boxSizing: "border-box" }}
        />
        {erreurConnexion && <p style={{ color: "#EF3340", fontSize: 13, marginBottom: 10 }}>{erreurConnexion}</p>}
        <button
          onClick={seConnecter}
          disabled={connexionEnCours}
          style={{ width: "100%", background: "#009E49", color: "white", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 15, cursor: "pointer" }}
        >
          {connexionEnCours ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    );
  }

  return <DashboardAdmin />;
      }
