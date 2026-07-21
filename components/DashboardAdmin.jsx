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
// ============================================================
// DEMANDES — pannes + installations réelles, avec chat prix
// ============================================================
function Demandes() {
  const [demandes, setDemandes] = useState([]);
  const [selection, setSelection] = useState(null);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: pannes }, { data: installations }] = await Promise.all([
        supabase.from("pannes").select("*").order("created_at", { ascending: false }),
        supabase.from("installations").select("*").order("created_at", { ascending: false }),
      ]);

      const fusion = [
        ...(pannes || []).map((p) => ({ ...p, type: "Panne" })),
        ...(installations || []).map((i) => ({ ...i, type: "Installation" })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setDemandes(fusion);
    })();
  }, []);

  const filtrees = demandes.filter(
    (d) =>
      d.numero_suivi?.toLowerCase().includes(recherche.toLowerCase()) ||
      d.telephone_client?.includes(recherche)
  );

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: selection ? "0 0 320px" : 1 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Demandes clients</h1>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#999" }} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro ou téléphone..."
            style={{ width: "100%", padding: "9px 10px 9px 32px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrees.map((d) => {
            const s = STATUTS[d.statut] || STATUTS.nouveau;
            const Icon = s.icon;
            return (
              <button
                key={d.numero_suivi}
                onClick={() => setSelection(d)}
                style={{
                  textAlign: "left",
                  background: selection?.numero_suivi === d.numero_suivi ? "#eef8f1" : "white",
                  border: selection?.numero_suivi === d.numero_suivi ? `1.5px solid ${COULEURS.vert}` : "1px solid #eee",
                  borderRadius: 12, padding: 12, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{d.numero_suivi}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: s.color, fontSize: 12, fontWeight: 600 }}>
                    <Icon size={13} /> {s.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{d.description}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Phone size={11} /> {d.telephone_client}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selection && <ChatPrix demande={selection} onFermer={() => setSelection(null)} />}
    </div>
  );
}

function ChatPrix({ demande, onFermer }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const finChat = useRef(null);

  const chargerMessages = async () => {
    const { data } = await supabase
      .from("messages_suivi")
      .select("*")
      .eq("numero_suivi", demande.numero_suivi)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    chargerMessages();

    const canal = supabase
      .channel(`admin_messages_${demande.numero_suivi}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_suivi", filter: `numero_suivi=eq.${demande.numero_suivi}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, [demande]);

  useEffect(() => { finChat.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const envoyer = async () => {
    if (!texte.trim()) return;
    const { error } = await supabase.from("messages_suivi").insert({
      numero_suivi: demande.numero_suivi,
      auteur: "admin",
      contenu: texte.trim(),
    });
    if (!error) setTexte("");
  };

  return (
