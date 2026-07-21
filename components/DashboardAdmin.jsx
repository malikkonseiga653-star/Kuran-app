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
// ============================================================
// ÉLECTRICIENS — accès complet réservé à admin_principal
// employe voit electriciens_avec_stats (note moyenne, volume,
// sans téléphone/diplôme/localisation)
// ============================================================
function Electriciens({ role }) {
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
        {estAdminPrincipal ? "Accès complet (informations personnelles visibles)." : "Accès limité — informations personnelles masquées."}
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={13} /> {e.niveau_etudes} — {e.experience} ans d'expérience</div>
                <div style={{ fontSize: 12, color: "#999" }}>Secteur : {e.secteur}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYÉS — visible et gérable uniquement par admin_principal
// ============================================================
function Employes({ role }) {
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

// ============================================================
// PLAINTES — liées au numero_suivi_lie
// ============================================================
function Plaintes() {
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
          <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>{selection.numero_suivi_lie} · {selection.telephone_client}</div>
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
