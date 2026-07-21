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
  }, [messages]);

  return (
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
