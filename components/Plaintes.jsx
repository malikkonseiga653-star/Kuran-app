"use client";

import { Phone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

const COULEURS = { vert: "#009E49" };

export function Plaintes() {
  const [liste, setListe] = useState([]);
  const [selection, setSelection] = useState(null);
  const [reponse, setReponse] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plaintes").select("*").order("created_at", { ascending: false });
      setListe(data || []);
    })();
  }, []);

  const envoyerReponse = async () => {
    if (!reponse.trim() || !selection) return;
    const { error } = await supabase
      .from("plaintes")
      .update({ reponse_admin: reponse.trim(), statut: "traite" })
      .eq("id", selection.id);

    if (!error) {
      setListe((prev) => prev.map((p) => (p.id === selection.id ? { ...p, reponse_admin: reponse.trim(), statut: "traite" } : p)));
      setReponse("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: selection ? "0 0 320px" : 1 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Plaintes</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {liste.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelection(p)}
              style={{
                textAlign: "left",
                background: selection?.id === p.id ? "#fdf1ec" : "white",
                border: selection?.id === p.id ? "1.5px solid #D97757" : "1px solid #eee",
                borderRadius: 12, padding: 12, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#999" }}>{p.numero_suivi_lie}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.statut === "traite" ? COULEURS.vert : "#D97757" }}>
                  {p.statut === "traite" ? "Traité" : p.statut === "lu" ? "Lu" : "Nouveau"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#333", marginTop: 6 }}>{p.contenu}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} /> {p.telephone_client}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selection && (
        <div style={{ flex: 1, background: "white", borderRadius: 14, border: "1px solid #eee", padding: 20 }}>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>{selection.numero_suivi_lie} {selection.telephone_client}</div>
          <p style={{ fontSize: 14, color: "#333", marginBottom: 16 }}>{selection.contenu}</p>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            placeholder="Votre réponse..."
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
          />
          <button
            onClick={envoyerReponse}
            style={{ marginTop: 10, background: COULEURS.vert, color: "white", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 600 }}
          >
            Envoyer la réponse
          </button>
        </div>
      )}
    </div>
  );
          }
