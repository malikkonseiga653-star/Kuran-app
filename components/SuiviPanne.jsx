"use client"
import { useState, useEffect, useRef } from "react";
import { Search, Phone, CheckCircle2, Clock, AlertCircle, XCircle, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

const STATUTS = {
  nouveau: { label: "Nouveau", icon: AlertCircle, color: "#D97757" },
  en_cours: { label: "En cours", icon: Clock, color: "#3B82F6" },
  resolu: { label: "Résolu", icon: CheckCircle2, color: "#16A34A" },
  annule: { label: "Annulé", icon: XCircle, color: "#6B7280" },
};

export default function SuiviPanne() {
  const [numeroSuivi, setNumeroSuivi] = useState("");
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const finChat = useRef(null);

  const rechercher = async () => {
    setErreur("");
    setResultat(null);
    setMessages([]);

    const numeroPropre = numeroSuivi.trim().toUpperCase();
    if (!numeroPropre) {
      setErreur("Merci d'entrer votre numéro de suivi.");
      return;
    }

    setChargement(true);
    try {
      const { data: panne, error: erreurPanne } = await supabase
        .from("pannes")
        .select("*")
        .eq("numero_suivi", numeroPropre)
        .maybeSingle();

      if (erreurPanne) throw erreurPanne;

      let trouve = panne;
      if (!trouve) {
        const { data: installation, error: erreurInstallation } = await supabase
          .from("installations")
          .select("*")
          .eq("numero_suivi", numeroPropre)
          .maybeSingle();
        if (erreurInstallation) throw erreurInstallation;
        trouve = installation;
      }

      if (!trouve) {
        setErreur("Aucune demande trouvée avec ce numéro de suivi.");
        return;
      }

      setResultat(trouve);
      await chargerMessages(numeroPropre);
    } catch (e) {
      console.error(e);
      setErreur("Erreur lors de la recherche. Réessayez.");
    } finally {
      setChargement(false);
    }
  };

  const chargerMessages = async (numero) => {
    const { data, error } = await supabase
      .from("messages_suivi")
      .select("*")
      .eq("numero_suivi", numero)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    setMessages(data || []);
  };

  const envoyerMessage = async () => {
    if (!nouveauMessage.trim() || !resultat) return;
    setEnvoiEnCours(true);
    try {
      const { error } = await supabase.from("messages_suivi").insert({
        numero_suivi: resultat.numero_suivi,
        auteur: "client",
        contenu: nouveauMessage.trim(),
      });
      if (error) throw error;

      await chargerMessages(resultat.numero_suivi);
      setNouveauMessage("");
    } catch (e) {
      console.error(e);
      setErreur("Message non envoyé. Réessayez dans quelques instants.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  useEffect(() => {
    if (!resultat) return;
    const canal = supabase
      .channel(`messages_suivi_${resultat.numero_suivi}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_suivi", filter: `numero_suivi=eq.${resultat.numero_suivi}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [resultat]);

  useEffect(() => {
    finChat.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
          <div style={{ width: 32, height: 8, background: "#009E49", borderRadius: 2 }} />
          <div style={{ width: 32, height: 8, background: "#FFCE00", borderRadius: 2 }} />
          <div style={{ width: 32, height: 8, background: "#EF3340", borderRadius: 2 }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          Suivre ma demande
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
          Entrez le numéro reçu lors de votre déclaration
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={numeroSuivi}
          onChange={(e) => setNumeroSuivi(e.target.value)}
          placeholder="PANNE-2026-000123"
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1.5px solid #ddd",
            fontSize: 15,
            outline: "none",
          }}
          onKeyDown={(e) => e.key === "Enter" && rechercher()}
        />
        <button
          onClick={rechercher}
          disabled={chargement}
          style={{
            background: "#009E49",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Search size={18} />
        </button>
      </div>

      {erreur && (
        <p style={{ color: "#EF3340", fontSize: 14, textAlign: "center" }}>{erreur}</p>
      )}

      {resultat && (
        <>
          <div
            style={{
              border: "1.5px solid #eee",
              borderRadius: 14,
              padding: 18,
              marginTop: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{resultat.numero_suivi}</span>
              {(() => {
                const s = STATUTS[resultat.statut] || STATUTS.nouveau;
                const Icon = s.icon;
                return (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: s.color,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    <Icon size={16} /> {s.label}
                  </span>
                );
              })()}
            </div>
            <p style={{ fontSize: 14, color: "#444", marginTop: 10 }}>{resultat.description}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "#888", fontSize: 13 }}>
              <Phone size={14} /> {resultat.telephone_client}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              border: "1.5px solid #eee",
              borderRadius: 14,
              overflow: "hidden",
              background: "white",
            }}
          >
            <div
              style={{
                background: "#1a1a1a",
                color: "white",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Discussion avec l'équipe Kuran-app
            </div>

            <div style={{ maxHeight: 260, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 && (
                <p style={{ color: "#999", fontSize: 13, textAlign: "center", margin: "20px 0" }}>
                  Aucun message pour l'instant.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.auteur === "client" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}
                >
                  <div
                    style={{
                      background: m.auteur === "client" ? "#009E49" : "#f0f0f0",
                      color: m.auteur === "client" ? "white" : "#1a1a1a",
                      padding: "8px 12px",
                      borderRadius: 12,
                      fontSize: 14,
                      lineHeight: 1.4,
                    }}
                  >
                    {m.contenu}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2, textAlign: m.auteur === "client" ? "right" : "left" }}>
                    {m.auteur === "client" ? "Vous" : "Admin"} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              <div ref={finChat} />
            </div>

            <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #eee" }}>
              <input
                type="text"
                value={nouveauMessage}
                onChange={(e) => setNouveauMessage(e.target.value)}
                placeholder="Votre message..."
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #ddd",
                  fontSize: 14,
                  outline: "none",
                }}
                onKeyDown={(e) => e.key === "Enter" && envoyerMessage()}
              />
              <button
                onClick={envoyerMessage}
                disabled={envoiEnCours || !nouveauMessage.trim()}
                style={{
                  background: "#009E49",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: !nouveauMessage.trim() ? 0.5 : 1,
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
                                                                                                 }
