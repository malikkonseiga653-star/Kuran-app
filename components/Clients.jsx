"use client";

import { Phone, Shield, ClipboardList } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

export function Clients({ role }) {
  const [liste, setListe] = useState([]);
  const [demandesParClient, setDemandesParClient] = useState({});

  useEffect(() => {
    if (role !== "admin_principal") return;
    (async () => {
      const { data: clients } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setListe(clients || []);

      const { data: pannes } = await supabase.from("pannes").select("client_id, numero_suivi");
      const { data: installations } = await supabase.from("installations").select("client_id, numero_suivi");

      const compte = {};
      [...(pannes || []), ...(installations || [])].forEach((d) => {
        if (!d.client_id) return;
        compte[d.client_id] = (compte[d.client_id] || 0) + 1;
      });
      setDemandesParClient(compte);
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
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Clients</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {liste.map((c) => (
          <div key={c.id} style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Phone size={14} color="#666" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.telephone}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#999" }}>
              <ClipboardList size={13} /> {demandesParClient[c.id] || 0} demande(s)
            </div>
          </div>
        ))}
        {liste.length === 0 && (
          <p style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 20 }}>Aucun client inscrit pour l'instant.</p>
        )}
      </div>
    </div>
  );
     }
        
