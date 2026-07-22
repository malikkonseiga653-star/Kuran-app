"use client";

import { Phone, GraduationCap, Star } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00" };

export function Electriciens({ role }) {
  const [liste, setListe] = useState([]);
  const estAdminPrincipal = role === "admin_principal";

  useEffect(() => {
    (async () => {
      if (estAdminPrincipal) {
        const { data } = await supabase.from("electriciens").select("*");
        setListe(data || []);
      } else {
        const { data } = await supabase.from("electriciens_avec_stats").select("*");
        setListe(data || []);
      }
    })();
  }, [estAdminPrincipal]);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Électriciens</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
        {estAdminPrincipal ? "Accès complet." : "Accès limité."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {liste.map((e) => (
          <div key={e.id} style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nom} {e.prenom || ""}</div>
                {e.note_moyenne !== undefined && (
                  <div style={{ fontSize: 13, color: "#666", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={13} fill={COULEURS.jaune} color={COULEURS.jaune} /> {e.note_moyenne} / 5 ({e.nombre_interventions || 0} interventions)
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                background: e.statut === "actif" ? "#e6f7ec" : "#f5f5f5",
                color: e.statut === "actif" ? COULEURS.vert : "#999",
              }}>
                {e.statut || "inconnu"}
              </span>
            </div>

            {estAdminPrincipal && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#444" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={13} /> {e.telephone}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={13} /> {e.niveau_etudes} {e.experience} ans d'expérience</div>
                <div style={{ fontSize: 12, color: "#999" }}>Secteur : {e.secteur}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
    }
