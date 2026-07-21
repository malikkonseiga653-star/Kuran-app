import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, HardHat, ClipboardList, MessageSquare,
  AlertTriangle, Phone, GraduationCap, Search, Send,
  CheckCircle2, Clock, XCircle, AlertCircle, Shield, Star
} from "lucide-react";
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
    <div style={{ fontFamily: "system-ui
