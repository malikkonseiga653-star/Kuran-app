"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, HardHat, ClipboardList, MessageSquare,
  AlertTriangle, Phone, GraduationCap, Search, Send,
  CheckCircle2, Clock, XCircle, AlertCircle, Shield, Star
} from "lucide-react";
import { Electriciens, Employes, Plaintes } from './DashboardAdminOnglets';
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
    <div style={{ flex: 1, background: "white", borderRadius: 14, border: "1px solid #eee", display: "flex", flexDirection: "column", height: 520 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{demande.numero_suivi}</div>
          <div style={{ fontSize: 12, color: "#999" }}>{demande.telephone_client}</div>
        </div>
        <button onClick={onFermer} style={{ border: "none", background: "none", color: "#999", cursor: "pointer", fontSize: 13 }}>Fermer</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.auteur === "admin" ? "flex-end" : "flex-start", maxWidth: "78%" }}>
            <div style={{
              background: m.auteur === "admin" ? COULEURS.vert : "#f0f0f0",
              color: m.auteur === "admin" ? "white" : "#1a1a1a",
              padding: "8px 12px", borderRadius: 12, fontSize: 14,
            }}>
              {m.contenu}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2, textAlign: m.auteur === "admin" ? "right" : "left" }}>
              {m.auteur === "admin" ? "Vous" : "Client"} · {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        <div ref={finChat} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #eee" }}>
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && envoyer()}
          placeholder="Répondre au client"
          style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }}
        />
        <button onClick={envoyer} style={{ background: COULEURS.vert, border: "none", borderRadius: 10, padding: "0 14px", color: "white", cursor: "pointer" }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

    
