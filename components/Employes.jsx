"use client";

import { Phone, Shield } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

export function Employes({ role }) {
  const [liste, setListe] = useState([]);

  useEffect(() => {
    if (role !== "admin_principal") return;
    (async () => {
      const { data } = await supabase.from("employes").select("*");
      setListe(data || []);
    })();
  }, [role]);

  if (role !== "admin_principal") {
    return (
      <div style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #eee", textAlign: "center", color: "#999" }}>
        <Shield size={24} style={{ marginBottom: 8 }} />
        <p>Section réservée à l'administrateur principal.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Employés</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {liste.map((e) => (
          <div key={e.id} style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nom}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={13} /> {e.telephone}
              </div>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
              background: e.role === "admin_principal" ? "#fdf1ec" : "#eef2ff",
              color: e.role === "admin_principal" ? "#D97757" : "#3B82F6",
            }}>
              {e.role === "admin_principal" ? "Administrateur principal" : "Employé"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
            }
