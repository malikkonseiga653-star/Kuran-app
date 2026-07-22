"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Search, Send, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

const COULEURS = { vert: "#009E49" };

const STATUTS = {
  nouveau: { label: "Nouveau", icon: AlertCircle, color: "#D97757" },
  en_cours: { label: "En cours", icon: Clock, color: "#3B82F6" },
  resolu: { label: "Résolu", icon: CheckCircle2, color: "#16A34A" },
  annule: { label: "Annulé", icon: XCircle, color: "#6B7280" },
};

export function Demandes() {
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

                  
