"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, HardHat, ClipboardList,
  AlertTriangle, Shield
} from "lucide-react";
import { Electriciens } from "./Electriciens";
import { Employes } from "./Employes";
import { Plaintes } from "./Plaintes";
import { Demandes } from "./Demandes";
import { Clients } from "./Clients";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00", rouge: "#EF3340", encre: "#161616" };

  resolu: { label: "Résolu", icon: CheckCircle2, color: "#16A34A" },
  annule: { label: "Annulé", icon: XCircle, color: "#6B7280" },
};

const ONGLETS = [
  { id: "apercu", label: "Aperçu", icon: LayoutDashboard },
  { id: "demandes", label: "Demandes", icon: ClipboardList },
  { id: "electriciens", label: "Électriciens", icon: HardHat },
  { id: "employes", label: "Employés", icon: Users },
  { id: "plaintes", label: "Plaintes", icon: AlertTriangle },
  { id: "clients", label: "Clients", icon: Users },
];

function useRoleCourant() {
  const [role, setRole] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setChargement(false);
        return;
      }
      const { data, error } = await supabase
        .from("employes")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setRole(null);
      } else {
        setRole(data.role);
      }
      setChargement(false);
    })();
  }, []);

  return { role, chargement };
}

export default function DashboardAdmin() {
  const { role, chargement } = useRoleCourant();
  const [ongletActif, setOngletActif] = useState("apercu");

  if (chargement) {
    return <p style={{ textAlign: "center", padding: 40, color: "#999" }}>Chargement...</p>;
  }

  if (!role) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#999", fontFamily: "system-ui, sans-serif" }}>
        <Shield size={28} style={{ marginBottom: 10 }} />
        <p>Accès refusé. Connectez-vous avec un compte administrateur ou employé.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7f7f5", minHeight: "100vh" }}>
      <Entete role={role} />
      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto" }}>
        <NavLaterale ongletActif={ongletActif} setOngletActif={setOngletActif} />
        <main style={{ flex: 1, padding: 24 }}>
          {ongletActif === "apercu" && <Apercu />}
          {ongletActif === "demandes" && <Demandes />}
          {ongletActif === "electriciens" && <Electriciens role={role} />}
          {ongletActif === "employes" && <Employes role={role} />}
          {ongletActif === "plaintes" && <Plaintes />}
          {ongletActif === "clients" && <Clients role={role} />}
        </main>
      </div>
    </div>
  );
}

function Entete({ role }) {
  return (
    <div style={{ background: COULEURS.encre, color: "white", padding: "14px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 6, height: 20, background: COULEURS.vert, borderRadius: 1 }} />
            <div style={{ width: 6, height: 20, background: COULEURS.jaune, borderRadius: 1 }} />
            <div style={{ width: 6, height: 20, background: COULEURS.rouge, borderRadius: 1 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Kuran-app Administration</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc" }}>
          <Shield size={14} />
          {role === "admin_principal" ? "Administrateur principal" : "Employé"}
        </div>
      </div>
    </div>
  );
}

function NavLaterale({ ongletActif, setOngletActif }) {
  return (
    <nav style={{ width: 200, padding: "24px 12px", flexShrink: 0 }}>
      {ONGLETS.map((o) => {
        const Icon = o.icon;
        const actif = ongletActif === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setOngletActif(o.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", marginBottom: 4, border: "none", borderRadius: 10,
              background: actif ? "white" : "transparent",
              color: actif ? COULEURS.encre : "#666",
              fontWeight: actif ? 600 : 500, fontSize: 14, cursor: "pointer",
              boxShadow: actif ? "0 1px 3px rgba(0,0,0,0.08)" : "none", textAlign: "left",
            }}
          >
            <Icon size={16} /> {o.label}
          </button>
        );
      })}
    </nav>
  );
}

function Apercu() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ count: demandesEnCours }, { count: electriciensActifs }, { count: plaintesNonTraitees }, { count: messagesNonLus }] =
        await Promise.all([
          supabase.from("pannes").select("*", { count: "exact", head: true }).eq("statut", "en_cours"),
          supabase.from("electriciens").select("*", { count: "exact", head: true }).eq("statut", "actif"),
          supabase.from("plaintes").select("*", { count: "exact", head: true }).neq("statut", "traite"),
          supabase.from("messages_suivi").select("*", { count: "exact", head: true }).eq("lu", false),
        ]);

      setStats({
        demandesEnCours: demandesEnCours || 0,
        electriciensActifs: electriciensActifs || 0,
        plaintesNonTraitees: plaintesNonTraitees || 0,
        messagesNonLus: messagesNonLus || 0,
      });
    })();
  }, []);

  if (!stats) return <p style={{ color: "#999" }}>Chargement...</p>;

  const cartes = [
    { label: "Demandes en cours", valeur: stats.demandesEnCours, couleur: "#3B82F6" },
    { label: "Électriciens actifs", valeur: stats.electriciensActifs, couleur: COULEURS.vert },
    { label: "Plaintes non traitées", valeur: stats.plaintesNonTraitees, couleur: COULEURS.rouge },
    { label: "Messages non lus", valeur: stats.messagesNonLus, couleur: "#D97757" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Aperçu</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {cartes.map((c) => (
          <div key={c.label} style={{ background: "white", borderRadius: 14, padding: 18, border: "1px solid #eee" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.couleur }}>{c.valeur}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

