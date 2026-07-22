"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, HardHat, ClipboardList, MessageSquare,
  AlertTriangle, Phone, Search, Send,
  CheckCircle2, Clock, XCircle, AlertCircle, Shield
} from "lucide-react";
import { Electriciens } from "./Electriciens";
import { Employes } from "./Employes";
import { Plaintes } from "./Plaintes";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49", jaune: "#FFCE00", rouge: "#EF3340", encre: "#161616" };

const STATUTS = {
  nouveau: { label: "Nouveau", icon: AlertCircle, color: "#D97757" },
  en_cours: { label: "En cours", icon: Clock, color: "#3B82F6" },
  resolu: { label: "Résolu", icon: CheckCircle2, color: "#16A34A" },
  annule: { label: "Annulé", icon: XCircle, color: "#6B7280" },
};

const ONGLETS = [
  { id: "apercu", label: "Aperçu", icon: LayoutDashboard },
  { id: "demandes", label: "Demandes", icon: ClipboardList },
  { id: "electriciens", label: "Électriciens", icon: HardHat },
  { id: "employes", label: "Employés", icon: Users },
  { id: "plaintes", label: "Plaintes", icon: AlertTriangle },
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
            <div style={{ width: 6, height: 20, background: COULEURS.jaune, borderRadius: 1 }}
