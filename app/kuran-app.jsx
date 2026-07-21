"use client";

import { useState, useEffect } from "react";
import {
  Zap, MapPin, Clock, CheckCircle2, AlertTriangle, User, Wrench,
  ChevronRight, Loader2, Upload, ShieldCheck, XCircle, LogOut, ArrowLeft,
  Phone, Wallet, Hammer, X, ChevronLeft, PlugZap, BadgeCheck,
} from "lucide-react";
import {
  chargerPannes, chargerElectriciens, ajouterPanneDB, majPanneDB,
  ajouterElectricienDB, majElectricienDB, verifierMotDePasseAdmin, changerMotDePasseAdmin,
  connecterCompteAdmin, demanderCompteEmploye, chargerComptesAdmin, majStatutCompteAdmin,
  enregistrerAction, chargerJournal, feliciterElectricien, marquerFelicitationVueElectricien,
  feliciterEmploye, marquerFelicitationVueEmploye,
} from "../lib/supabase";

// Couleurs du drapeau burkinabè
const ROUGE = "#EF2B2D";
const VERT = "#009E49";
const JAUNE = "#FCD116";
const ENCRE = "#1A1A1A";

const NUMERO_ORANGE_MONEY = "+226 70 00 00 00"; // numéro à afficher aux usagers pour le paiement

// ATTENTION SÉCURITÉ : ces identifiants sont visibles par quiconque inspecte le code du site.
// Change ce mot de passe avant de partager le lien, et évite d'utiliser un mot de passe que tu utilises ailleurs.
// Le mot de passe admin est maintenant géré via la table Supabase "comptes_admin" (voir lib/supabase.js)

const STATUTS = {
  nouveau: { label: "Nouveau", color: ROUGE, bg: "#FDEBEB" },
  pris_en_charge: { label: "Pris en charge", color: "#B8860B", bg: "#FFF7DC" },
  en_attente_paiement: { label: "En attente de paiement", color: "#B8860B", bg: "#FFF7DC" },
  resolu: { label: "Résolu", color: VERT, bg: "#E6F5EC" },
};

const TAUX_COMMISSION = 0.15; // 15% pour la plateforme

const CATEGORIES = {
  panne: "panne",
  installation: "installation",
};

const TYPES_PANNE = [
  { label: "Coupure générale", prixMin: 3000, prixMax: 8000 },
  { label: "Compteur défaillant", prixMin: 5000, prixMax: 12000 },
  { label: "Fil / câble endommagé", prixMin: 4000, prixMax: 10000 },
  { label: "Poteau endommagé", prixMin: 10000, prixMax: 25000 },
  { label: "Court-circuit / étincelles", prixMin: 5000, prixMax: 15000 },
  { label: "Autre panne", prixMin: 2000, prixMax: 10000 },
];

const TYPES_INSTALLATION = [
  { label: "Installation logement neuf", prixMin: 25000, prixMax: 80000 },
  { label: "Extension / ajout de prises", prixMin: 5000, prixMax: 20000 },
  { label: "Pose de tableau électrique", prixMin: 15000, prixMax: 40000 },
  { label: "Éclairage extérieur / cour", prixMin: 8000, prixMax: 25000 },
  { label: "Climatisation / gros appareil", prixMin: 10000, prixMax: 30000 },
  { label: "Autre installation", prixMin: 5000, prixMax: 30000 },
];

function formatFCFA(n) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function libelleAction(action) {
  const libelles = {
    validation_electricien: "a validé l'électricien",
    refus_electricien: "a refusé l'électricien",
    paiement_confirme: "a confirmé un paiement pour",
    maj_panne: "a mis à jour la panne",
    validation_employe: "a validé l'employé",
    refus_employe: "a refusé l'employé",
    suspendu: "a suspendu le compte de",
    bloque: "a bloqué définitivement",
    reactive: "a réactivé le compte de",
  };
  return libelles[action] || action;
}

function libelleStatutPersonne(statut) {
  const libelles = {
    valide: "Validé", refuse: "Refusé", suspendu: "Suspendu", bloque: "Bloqué définitivement",
  };
  return libelles[statut] || statut;
}

function badgeStyleStatut(statut) {
  if (statut === "valide") return { color: VERT, background: "#E6F5EC" };
  if (statut === "suspendu") return { color: "#B8860B", background: "#FFF7DC" };
  if (statut === "bloque" || statut === "refuse") return { color: ROUGE, background: "#FDEBEB" };
  return { color: "#666", background: "#EEE" };
}

function BanniereFelicitation({ visible, onFermer }) {
  if (!visible) return null;
  return (
    <div style={{
      background: "#E6F5EC", border: `1px solid ${VERT}`, borderRadius: 12,
      padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
    }}>
      <BadgeCheck size={20} color={VERT} />
      <div style={{ flex: 1, fontSize: 14, color: "#1A1A1A" }}>
        <strong>Excellent boulot !</strong> L'administration est satisfaite de ton travail.
      </div>
      <button onClick={onFermer} style={{ background: "none", border: "none", cursor: "pointer" }}>
        <X size={16} color="#666" />
      </button>
    </div>
  );
}

function PulseDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 9, height: 9 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5, animation: "pulse-ring 1.8s ease-out infinite" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
    </span>
  );
}

// Illustration originale (SVG) d'un électricien en intervention, aux couleurs du drapeau
function IllustrationElectricien({ size = 220 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 280 224" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="140" cy="204" rx="110" ry="12" fill="#F2F2F2" />
      {/* poteau */}
      <rect x="222" y="40" width="10" height="150" rx="3" fill="#8A5A2E" />
      <rect x="196" y="52" width="62" height="8" rx="4" fill="#8A5A2E" />
      <circle cx="200" cy="52" r="5" fill={JAUNE} />
      <circle cx="254" cy="52" r="5" fill={JAUNE} />
      <path d="M200 52 Q227 68 254 52" stroke={ENCRE} strokeWidth="2" fill="none" opacity="0.35" />
      {/* échelle */}
      <line x1="150" y1="204" x2="196" y2="70" stroke="#B8860B" strokeWidth="6" strokeLinecap="round" />
      <line x1="164" y1="204" x2="210" y2="70" stroke="#B8860B" strokeWidth="6" strokeLinecap="round" />
      {[0,1,2,3,4,5].map((i) => (
        <line key={i} x1={150 + i*2.5} y1={200 - i*24} x2={166 + i*2.5} y2={200 - i*24} stroke="#B8860B" strokeWidth="4" />
      ))}
      {/* corps électricien */}
      <g transform="translate(178,60)">
        <circle cx="20" cy="10" r="12" fill="#4A2E1D" />
        {/* casque */}
        <path d="M6 6 A14 14 0 0 1 34 6 L34 8 L6 8 Z" fill={JAUNE} stroke={ENCRE} strokeWidth="1" />
        {/* corps / gilet */}
        <rect x="6" y="20" width="28" height="34" rx="6" fill={VERT} />
        <rect x="10" y="24" width="20" height="6" rx="2" fill={JAUNE} opacity="0.85" />
        {/* bras levé vers le fil */}
        <path d="M32 28 Q46 20 52 6" stroke="#4A2E1D" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="52" cy="6" r="5" fill="#2E2E2E" />
        {/* bras bas */}
        <path d="M8 30 Q0 42 6 52" stroke="#4A2E1D" strokeWidth="7" strokeLinecap="round" fill="none" />
        {/* jambes */}
        <rect x="10" y="52" width="8" height="26" rx="3" fill="#2E2E2E" />
        <rect x="22" y="52" width="8" height="26" rx="3" fill="#2E2E2E" />
      </g>
      {/* étincelle */}
      <path d="M234 44 L238 52 L233 52 L237 60" stroke={ROUGE} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* petite maison */}
      <g transform="translate(28,150)">
        <rect x="0" y="24" width="70" height="42" fill="#FDF6EC" stroke="#E5DCC8" strokeWidth="1.5" />
        <path d="M-6 24 L35 -2 L76 24 Z" fill={ROUGE} />
        <rect x="14" y="38" width="16" height="16" fill="#CFE8FF" stroke="#8A5A2E" strokeWidth="1.5" />
        <rect x="42" y="38" width="14" height="28" fill="#8A5A2E" />
      </g>
      <line x1="222" y1="60" x2="98" y2="150" stroke={ENCRE} strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

export default function SonabelPannes() {
  const [vue, setVue] = useState("accueil");
  const [pannes, setPannes] = useState([]);
  const [electriciens, setElectriciens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [electricienConnecte, setElectricienConnecte] = useState(null);
  const [compteAdmin, setCompteAdmin] = useState(null); // { id, identifiant, nom, prenom, role }
  const [afficherIntro, setAfficherIntro] = useState(null); // null = pas encore décidé

  async function chargerTout() {
    const [p, e] = await Promise.all([chargerPannes(), chargerElectriciens()]);
    setPannes(p);
    setElectriciens(e);
    setLoading(false);
  }

  useEffect(() => {
    chargerTout();
    const t = setInterval(chargerTout, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const vu = typeof window !== "undefined" && window.localStorage.getItem("kuran-intro-vue");
    setAfficherIntro(!vu);
  }, []);

  function terminerIntro() {
    window.localStorage.setItem("kuran-intro-vue", "1");
    setAfficherIntro(false);
  }

  async function ajouterPanne(panne) {
    const ok = await ajouterPanneDB(panne);
    if (ok) setPannes((prev) => [panne, ...prev]);
    else { setErreur("L'envoi a échoué. Vérifie ta connexion et réessaie."); throw new Error("echec ajout panne"); }
  }

  async function changerStatutPanne(id, nouveauStatut, prixFinal) {
    let champs = { statut: nouveauStatut, maj_le: Date.now() };
    let commission = null;
    if (nouveauStatut === "en_attente_paiement" && prixFinal) {
      commission = Math.round(prixFinal * TAUX_COMMISSION);
      champs = { ...champs, prix_final: prixFinal, commission };
    }
    const ok = await majPanneDB(id, champs);
    if (ok) {
      setPannes((prev) => prev.map((p) => {
        if (p.id !== id) return p;
        if (nouveauStatut === "en_attente_paiement" && prixFinal) {
          return { ...p, statut: nouveauStatut, majLe: champs.maj_le, prixFinal, commission };
        }
        return { ...p, statut: nouveauStatut, majLe: champs.maj_le };
      }));
    } else {
      setErreur("La mise à jour a échoué. Réessaie.");
    }
  }

  async function inscrireElectricien(candidat) {
    const ok = await ajouterElectricienDB(candidat);
    if (ok) setElectriciens((prev) => [candidat, ...prev]);
    else setErreur("L'inscription a échoué. Vérifie ta connexion et réessaie.");
    return ok;
  }

  async function changerStatutElectricien(id, nouveauStatut) {
    const ok = await majElectricienDB(id, nouveauStatut);
    if (ok) setElectriciens((prev) => prev.map((e) => (e.id === id ? { ...e, statut: nouveauStatut } : e)));
    else setErreur("La mise à jour a échoué. Réessaie.");
  }

  if (afficherIntro === null) {
    return <div style={styles.app} />;
  }

  if (afficherIntro) {
    return <Intro onTerminer={terminerIntro} />;
  }

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder, textarea::placeholder { color: #A8A8A8; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.brand} onClick={() => setVue("accueil")}>
          <div style={styles.brandIcon}><Zap size={18} color="#fff" strokeWidth={2.5} /></div>
          <div>
            <div style={styles.brandName}>Kuran</div>
            <div style={styles.brandSub}>signalement de pannes SONABEL</div>
          </div>
        </div>
        {vue !== "accueil" && (
          <button style={styles.navBtn} onClick={() => setVue("accueil")}>
            <ArrowLeft size={14} /> Accueil
          </button>
        )}
      </header>

      {vue === "accueil" && (
        <Accueil setVue={setVue} pannesActives={pannes.filter((p) => p.statut !== "resolu").length} />
      )}
      {vue === "usager" && <VueUsager onAjouter={ajouterPanne} mesPannes={pannes} />}
      {vue === "inscription" && (
        <Inscription onInscrire={inscrireElectricien} setVue={setVue} />
      )}
      {vue === "connexion" && (
        <Connexion
          electriciens={electriciens}
          onConnecte={(e) => { setElectricienConnecte(e); setVue("electricien"); }}
          setVue={setVue}
        />
      )}
      {vue === "electricien" && electricienConnecte && (
        <VueElectricien
          pannes={pannes}
          onChangerStatut={changerStatutPanne}
          loading={loading}
          electricien={electricienConnecte}
          onDeconnexion={() => { setElectricienConnecte(null); setVue("accueil"); }}
        />
      )}
      {vue === "admin" && !compteAdmin && (
        <ConnexionAdmin
          onConnecte={(compte) => setCompteAdmin(compte)}
          setVue={setVue}
        />
      )}
      {vue === "admin" && compteAdmin && (
        <VueAdmin
          electriciens={electriciens}
          onChangerStatut={changerStatutElectricien}
          pannes={pannes}
          onChangerStatutPanne={changerStatutPanne}
          onDeconnexion={() => { setCompteAdmin(null); setVue("accueil"); }}
          compteAdmin={compteAdmin}
        />
      )}

      {erreur && <div style={styles.toastErreur}>{erreur}</div>}
    </div>
  );
}

// ---------------- INTRO / TUTORIEL ----------------

function Intro({ onTerminer }) {
  const [page, setPage] = useState(0);

  const pages = [
    {
      icone: <IllustrationElectricien size={200} />,
      titre: "Bienvenue sur Kuran",
      texte: "L'application qui met en relation les usagers SONABEL avec des électriciens vérifiés, près de chez toi.",
    },
    {
      icone: <div style={styles.introIconWrap}><Zap size={54} color={ROUGE} /></div>,
      titre: "1. Signale ton besoin",
      texte: "Une panne électrique ou une nouvelle installation ? Décris ton besoin, ta position, en moins d'une minute.",
    },
    {
      icone: <div style={styles.introIconWrap}><Wrench size={54} color={VERT} /></div>,
      titre: "2. Un électricien intervient",
      texte: "Un électricien vérifié de ton secteur prend en charge la demande et se déplace chez toi.",
    },
    {
      icone: <div style={styles.introIconWrap}><Wallet size={54} color={JAUNE === "#FCD116" ? "#B8860B" : JAUNE} /></div>,
      titre: "3. Le paiement passe par Kuran",
      texte: "Une fois le travail terminé, tu payes le montant convenu par Orange Money au numéro affiché. Kuran confirme le paiement à l'électricien.",
    },
  ];

  const p = pages[page];
  const derniere = page === pages.length - 1;

  return (
    <div style={styles.introWrap}>
      <div style={styles.introTop}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}><Zap size={18} color="#fff" strokeWidth={2.5} /></div>
          <div style={styles.brandName}>Kuran</div>
        </div>
        {!derniere && (
          <button style={styles.linkBtnMuted} onClick={onTerminer}>Passer</button>
        )}
      </div>

      <div style={styles.introBody}>
        <div style={styles.introIllu}>{p.icone}</div>
        <h1 style={styles.introTitre}>{p.titre}</h1>
        <p style={styles.introTexte}>{p.texte}</p>
      </div>

      <div style={styles.introDots}>
        {pages.map((_, i) => (
          <span key={i} style={{ ...styles.introDot, background: i === page ? ROUGE : "#E5E5E5", width: i === page ? 22 : 8 }} />
        ))}
      </div>

      <div style={styles.introActions}>
        {page > 0 && (
          <button style={styles.introBtnSecondaire} onClick={() => setPage((n) => n - 1)}>
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          style={styles.introBtnPrincipal}
          onClick={() => (derniere ? onTerminer() : setPage((n) => n + 1))}
        >
          {derniere ? "C'est parti" : "Suivant"}
        </button>
      </div>
    </div>
  );
}

function Accueil({ setVue, pannesActives }) {
  return (
    <div style={styles.accueilWrap}>
      <div style={styles.heroIllu}><IllustrationElectricien size={190} /></div>
      <div style={styles.heroTag}>
        <PulseDot color={ROUGE} />
        <span>{pannesActives} demande{pannesActives !== 1 ? "s" : ""} active{pannesActives !== 1 ? "s" : ""} en ce moment</span>
      </div>
      <h1 style={styles.heroTitle}>Le courant coupé ?<br />On envoie quelqu'un.</h1>
      <p style={styles.heroDesc}>
        Signale une panne ou demande une installation en 15 secondes. Ta position est envoyée
        directement à l'électricien le plus proche.
      </p>

      <div style={styles.cardsRow}>
        <button style={styles.choiceCard} onClick={() => setVue("usager")}>
          <div style={{ ...styles.choiceIcon, background: "#FDEBEB" }}><User size={22} color={ROUGE} /></div>
          <div style={{ flex: 1 }}>
            <div style={styles.choiceLabel}>Je fais une demande</div>
            <div style={styles.choiceDesc}>Panne ou nouvelle installation</div>
          </div>
          <ChevronRight size={18} color="#B8B8B8" />
        </button>

        <button style={styles.choiceCard} onClick={() => setVue("connexion")}>
          <div style={{ ...styles.choiceIcon, background: "#E6F5EC" }}><Wrench size={22} color={VERT} /></div>
          <div style={{ flex: 1 }}>
            <div style={styles.choiceLabel}>Je reçois les commandes</div>
            <div style={styles.choiceDesc}>Électricien SONABEL — connexion requise</div>
          </div>
          <ChevronRight size={18} color="#B8B8B8" />
        </button>
      </div>

      <div style={styles.footerLinks}>
        <button style={styles.linkBtn} onClick={() => setVue("inscription")}>
          Devenir électricien partenaire →
        </button>
        <button style={styles.linkBtnMuted} onClick={() => setVue("admin")}>
          Espace administrateur
        </button>
      </div>
    </div>
  );
}

// ---------------- USAGER ----------------

function VueUsager({ onAjouter, mesPannes }) {
  const [etape, setEtape] = useState("form");
  const [categorie, setCategorie] = useState(CATEGORIES.panne);
  const listeTypes = categorie === CATEGORIES.panne ? TYPES_PANNE : TYPES_INSTALLATION;
  const [type, setType] = useState(TYPES_PANNE[0].label);
  const [description, setDescription] = useState("");
  const [secteur, setSecteur] = useState("");
  const [position, setPosition] = useState(null);
  const [erreurGeo, setErreurGeo] = useState(null);
  const [derniereId, setDerniereId] = useState(null);

  function changerCategorie(cat) {
    setCategorie(cat);
    const types = cat === CATEGORIES.panne ? TYPES_PANNE : TYPES_INSTALLATION;
    setType(types[0].label);
  }

  function obtenirPosition() {
    setEtape("localisation");
    setErreurGeo(null);
    if (!navigator.geolocation) {
      setErreurGeo("La géolocalisation n'est pas disponible sur cet appareil.");
      setEtape("form");
      return;
    }
    const finDeSecours = setTimeout(() => {
      setErreurGeo("Position non reçue (délai dépassé). Tu peux envoyer avec juste ton secteur.");
      setEtape("form");
    }, 9000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(finDeSecours); setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setEtape("form"); },
      () => { clearTimeout(finDeSecours); setErreurGeo("Position refusée. Autorise la localisation dans les réglages, ou envoie avec juste ton secteur."); setEtape("form"); },
      { timeout: 8000 }
    );
  }

  async function envoyer(e) {
    e.preventDefault();
    setEtape("envoi");
    setErreurGeo(null);
    const id = "p" + Date.now() + Math.floor(Math.random() * 1000);
    const infosType = listeTypes.find((t) => t.label === type);
    const panne = {
      id, categorie, type, description: description.trim(), secteur: secteur.trim() || "Non précisé", position,
      statut: "nouveau", creeLe: Date.now(), majLe: Date.now(),
      prixMin: infosType.prixMin, prixMax: infosType.prixMax,
      prixFinal: null, commission: null,
    };
    try {
      await onAjouter(panne);
      setDerniereId(id);
      setEtape("confirme");
    } catch {
      setErreurGeo("L'envoi a échoué. Réessaie.");
      setEtape("form");
    }
  }

  const maPanne = mesPannes.find((p) => p.id === derniereId);

  if (etape === "confirme" && maPanne) {
    const s = STATUTS[maPanne.statut];
    return (
      <div style={styles.pageWrap}>
        <div style={styles.confirmCard}>
          <CheckCircle2 size={40} color={VERT} />
          <h2 style={styles.confirmTitle}>Demande envoyée</h2>
          <p style={styles.confirmDesc}>Un électricien va voir ta demande apparaître dans sa liste de commandes.</p>
          <div style={styles.statutLive}>
            <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
              {maPanne.statut !== "resolu" && <PulseDot color={s.color} />} {s.label}
            </span>
            <span style={styles.statutSub}>Cette page se met à jour automatiquement</span>
          </div>

          {maPanne.statut === "en_attente_paiement" && (
            <div style={styles.paiementBox}>
              <Wallet size={20} color="#B8860B" />
              <div style={styles.paiementTexte}>
                <div style={styles.paiementMontant}>Montant à payer : {formatFCFA(maPanne.prixFinal)}</div>
                <div style={styles.paiementInfo}>Envoie ce montant par Orange Money au</div>
                <div style={styles.paiementNumero}>{NUMERO_ORANGE_MONEY}</div>
                <div style={styles.paiementNote}>Ton paiement sera confirmé par Kuran dès réception.</div>
              </div>
            </div>
          )}

          {maPanne.statut === "resolu" && (
            <div style={styles.paiementConfirme}>
              <CheckCircle2 size={16} color={VERT} /> Paiement confirmé, merci !
            </div>
          )}

          <button style={styles.secondaryBtn} onClick={() => { setEtape("form"); setDescription(""); setSecteur(""); setPosition(null); setDerniereId(null); }}>
            Faire une autre demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>Faire une demande</h2>
      <div style={styles.categorieRow}>
        <button
          type="button"
          style={{ ...styles.categorieBtn, ...(categorie === CATEGORIES.panne ? styles.categorieBtnActive : {}) }}
          onClick={() => changerCategorie(CATEGORIES.panne)}
        >
          <Zap size={16} /> Panne électrique
        </button>
        <button
          type="button"
          style={{ ...styles.categorieBtn, ...(categorie === CATEGORIES.installation ? styles.categorieBtnActiveVert : {}) }}
          onClick={() => changerCategorie(CATEGORIES.installation)}
        >
          <PlugZap size={16} /> Nouvelle installation
        </button>
      </div>

      <form onSubmit={envoyer} style={styles.form}>
        <label style={styles.label}>{categorie === CATEGORIES.panne ? "Type de panne" : "Type d'installation"}</label>
        <div style={styles.chipsRow}>
          {listeTypes.map((t) => (
            <button
              type="button"
              key={t.label}
              onClick={() => setType(t.label)}
              style={{ ...styles.chip, ...(type === t.label ? (categorie === CATEGORIES.panne ? styles.chipActive : styles.chipActiveVert) : {}) }}
            >{t.label}</button>
          ))}
        </div>
        <div style={styles.prixEstime}>
          Coût estimé : {formatFCFA(listeTypes.find((t) => t.label === type).prixMin)} – {formatFCFA(listeTypes.find((t) => t.label === type).prixMax)}
          <span style={styles.prixNote}> (prix final fixé avec l'électricien)</span>
        </div>

        <label style={styles.label}>Secteur / repère</label>
        <input style={styles.input} placeholder="Ex : Secteur 15, près du marché" value={secteur} onChange={(e) => setSecteur(e.target.value)} />

        <label style={styles.label}>Description (facultatif)</label>
        <textarea style={styles.textarea} placeholder="Détails utiles pour l'électricien..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

        <label style={styles.label}>Position GPS</label>
        {!position ? (
          <button type="button" style={styles.geoBtn} onClick={obtenirPosition} disabled={etape === "localisation"}>
            {etape === "localisation" ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Localisation en cours...</> : <><MapPin size={16} /> Utiliser ma position actuelle</>}
          </button>
        ) : (
          <div style={styles.geoConfirmed}><MapPin size={16} color={VERT} /> Position enregistrée ({position.lat.toFixed(4)}, {position.lng.toFixed(4)})</div>
        )}
        {erreurGeo && <div style={styles.warnText}><AlertTriangle size={13} /> {erreurGeo}</div>}

        <button type="submit" style={styles.submitBtn} disabled={etape === "envoi"}>
          {etape === "envoi" ? "Envoi en cours..." : "Envoyer la demande"}
        </button>
      </form>
    </div>
  );
}

// ---------------- INSCRIPTION ÉLECTRICIEN ----------------

function Inscription({ onInscrire, setVue }) {
  const [champs, setChamps] = useState({
    nom: "", prenom: "", age: "", secteur: "", experience: "", niveauEtudes: "", telephone: "", motDePasse: "",
  });
  const [cnibNom, setCnibNom] = useState(null);
  const [etape, setEtape] = useState("form");
  const [erreur, setErreur] = useState(null);

  function maj(champ, valeur) {
    setChamps((c) => ({ ...c, [champ]: valeur }));
  }

  function gererFichier(e) {
    const f = e.target.files?.[0];
    if (f) setCnibNom(f.name);
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    if (!champs.nom || !champs.prenom || !champs.telephone || !champs.motDePasse) {
      setErreur("Merci de remplir au moins le nom, prénom, téléphone et un mot de passe.");
      return;
    }
    if (!cnibNom) {
      setErreur("La photo de la CNIB est obligatoire pour la vérification.");
      return;
    }
    setEtape("envoi");
    const candidat = {
      id: "e" + Date.now(),
      ...champs,
      cnibNomFichier: cnibNom,
      statut: "en_attente", // en_attente | valide | refuse
      inscritLe: Date.now(),
    };
    await onInscrire(candidat);
    setEtape("confirme");
  }

  if (etape === "confirme") {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.confirmCard}>
          <ShieldCheck size={40} color={VERT} />
          <h2 style={styles.confirmTitle}>Dossier envoyé</h2>
          <p style={styles.confirmDesc}>
            Ton inscription est en attente de vérification par un administrateur.
            Tu pourras te connecter une fois ton compte validé.
          </p>
          <button style={styles.secondaryBtn} onClick={() => setVue("accueil")}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>Devenir électricien partenaire</h2>
      <p style={{ ...styles.heroDesc, marginBottom: 20, fontSize: 13.5 }}>
        Ces informations servent à vérifier ton identité avant de te donner accès aux commandes.
      </p>
      <form onSubmit={soumettre} style={styles.form}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Nom</label>
            <input style={styles.input} value={champs.nom} onChange={(e) => maj("nom", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Prénom</label>
            <input style={styles.input} value={champs.prenom} onChange={(e) => maj("prenom", e.target.value)} />
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Âge</label>
            <input style={styles.input} type="number" value={champs.age} onChange={(e) => maj("age", e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Années d'expérience</label>
            <input style={styles.input} type="number" value={champs.experience} onChange={(e) => maj("experience", e.target.value)} />
          </div>
        </div>

        <label style={styles.label}>Secteur d'intervention</label>
        <input style={styles.input} placeholder="Ex : Secteur 15, Bobo-Dioulasso" value={champs.secteur} onChange={(e) => maj("secteur", e.target.value)} />

        <label style={styles.label}>Niveau d'études</label>
        <input style={styles.input} placeholder="Ex : BEP électrotechnique" value={champs.niveauEtudes} onChange={(e) => maj("niveauEtudes", e.target.value)} />

        <label style={styles.label}>Numéro de téléphone</label>
        <input style={styles.input} type="tel" placeholder="+226 ..." value={champs.telephone} onChange={(e) => maj("telephone", e.target.value)} />

        <label style={styles.label}>Mot de passe (pour te connecter ensuite)</label>
        <input style={styles.input} type="password" value={champs.motDePasse} onChange={(e) => maj("motDePasse", e.target.value)} />

        <label style={styles.label}>Photo de la CNIB</label>
        <label style={styles.uploadBox}>
          <Upload size={16} color={champs.nom ? VERT : "#888"} />
          {cnibNom ? cnibNom : "Choisir un fichier..."}
          <input type="file" accept="image/*" onChange={gererFichier} style={{ display: "none" }} />
        </label>

        {erreur && <div style={styles.warnText}><AlertTriangle size={13} /> {erreur}</div>}

        <button type="submit" style={styles.submitBtn} disabled={etape === "envoi"}>
          {etape === "envoi" ? "Envoi en cours..." : "Envoyer mon dossier"}
        </button>
      </form>
    </div>
  );
}

// ---------------- CONNEXION ÉLECTRICIEN ----------------

function Connexion({ electriciens, onConnecte, setVue }) {
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);

  function seConnecter(e) {
    e.preventDefault();
    const trouve = electriciens.find((el) => el.telephone === telephone && el.motDePasse === motDePasse);
    if (!trouve) {
      setErreur("Numéro ou mot de passe incorrect.");
      return;
    }
    if (trouve.statut === "en_attente") {
      setErreur("Ton compte est encore en attente de validation par un administrateur.");
      return;
    }
    if (trouve.statut === "refuse") {
      setErreur("Ton inscription a été refusée. Contacte l'administration pour plus d'informations.");
      return;
    }
    if (trouve.statut === "suspendu") {
      setErreur("Ton compte a été suspendu par l'administration. Contacte-la pour plus d'informations.");
      return;
    }
    if (trouve.statut === "bloque") {
      setErreur("Ton compte a été définitivement bloqué.");
      return;
    }
    onConnecte(trouve);
  }

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>Connexion électricien</h2>
      <form onSubmit={seConnecter} style={styles.form}>
        <label style={styles.label}>Numéro de téléphone</label>
        <input style={styles.input} type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+226 ..." />
        <label style={styles.label}>Mot de passe</label>
        <input style={styles.input} type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        {erreur && <div style={styles.warnText}><AlertTriangle size={13} /> {erreur}</div>}
        <button type="submit" style={styles.submitBtn}>Se connecter</button>
      </form>
      <button style={{ ...styles.linkBtn, marginTop: 18 }} onClick={() => setVue("inscription")}>
        Pas encore inscrit ? Créer un dossier →
      </button>
    </div>
  );
}

// ---------------- CONNEXION ADMIN ----------------

function ConnexionAdmin({ onConnecte, setVue }) {
  const [mode, setMode] = useState("connexion"); // "connexion" ou "demande"
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [verification, setVerification] = useState(false);

  // Champs pour la demande d'accès employé
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nouvelIdentifiant, setNouvelIdentifiant] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setErreur(null);
    setVerification(true);
    const compte = await connecterCompteAdmin(identifiant.trim(), motDePasse);
    setVerification(false);
    if (!compte) {
      setErreur("Identifiant ou mot de passe incorrect.");
      return;
    }
    if (compte.statut === "en_attente") {
      setErreur("Ta demande d'accès est encore en attente de validation.");
      return;
    }
    if (compte.statut === "refuse") {
      setErreur("Ta demande d'accès a été refusée. Contacte l'administrateur principal.");
      return;
    }
    if (compte.statut === "suspendu") {
      setErreur("Ton accès a été suspendu par l'administrateur principal.");
      return;
    }
    if (compte.statut === "bloque") {
      setErreur("Ton accès a été définitivement bloqué.");
      return;
    }
    onConnecte(compte);
  }

  async function envoyerDemande(e) {
    e.preventDefault();
    setErreur(null);
    if (!nom.trim() || !prenom.trim() || !nouvelIdentifiant.trim() || nouveauMdp.length < 6) {
      setErreur("Remplis tous les champs (mot de passe : 6 caractères minimum).");
      return;
    }
    setVerification(true);
    const ok = await demanderCompteEmploye({
      id: `emp-${Date.now()}`,
      identifiant: nouvelIdentifiant.trim(),
      motDePasse: nouveauMdp,
      nom: nom.trim(),
      prenom: prenom.trim(),
      creeLe: Date.now(),
    });
    setVerification(false);
    if (ok) {
      setDemandeEnvoyee(true);
    } else {
      setErreur("Cet identifiant est peut-être déjà pris, ou une erreur est survenue.");
    }
  }

  if (demandeEnvoyee) {
    return (
      <div style={styles.pageWrap}>
        <h2 style={styles.pageTitle}>Demande envoyée</h2>
        <p style={{ ...styles.heroDesc, marginLeft: 0, marginRight: 0 }}>
          Ta demande d'accès a bien été transmise à l'administrateur principal. Tu pourras te connecter une fois qu'elle sera validée.
        </p>
        <button style={{ ...styles.linkBtn, marginTop: 18 }} onClick={() => setVue("accueil")}>
          ← Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>Connexion administrateur</h2>
      <p style={{ ...styles.heroDesc, marginBottom: 20, fontSize: 13.5, marginLeft: 0, marginRight: 0 }}>
        Accès réservé aux administrateurs et employés Kuran.
      </p>

      <div style={styles.filtreRow}>
        <button style={{ ...styles.filtreBtn, ...(mode === "connexion" ? styles.filtreBtnActive : {}) }} onClick={() => { setMode("connexion"); setErreur(null); }}>
          Se connecter
        </button>
        <button style={{ ...styles.filtreBtn, ...(mode === "demande" ? styles.filtreBtnActive : {}) }} onClick={() => { setMode("demande"); setErreur(null); }}>
          Demander un accès
        </button>
      </div>

      {mode === "connexion" && (
        <form onSubmit={seConnecter} style={styles.form}>
          <label style={styles.label}>Identifiant</label>
          <input style={styles.input} value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoFocus />
          <label style={styles.label}>Mot de passe</label>
          <input style={styles.input} type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          {erreur && <div style={styles.warnText}><AlertTriangle size={13} /> {erreur}</div>}
          <button type="submit" style={styles.submitBtn} disabled={verification}>
            {verification ? "Vérification..." : "Se connecter"}
          </button>
        </form>
      )}

      {mode === "demande" && (
        <form onSubmit={envoyerDemande} style={styles.form}>
          <label style={styles.label}>Prénom</label>
          <input style={styles.input} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          <label style={styles.label}>Nom</label>
          <input style={styles.input} value={nom} onChange={(e) => setNom(e.target.value)} />
          <label style={styles.label}>Identifiant souhaité</label>
          <input style={styles.input} value={nouvelIdentifiant} onChange={(e) => setNouvelIdentifiant(e.target.value)} />
          <label style={styles.label}>Mot de passe (6 caractères min.)</label>
          <input style={styles.input} type="password" value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} />
          {erreur && <div style={styles.warnText}><AlertTriangle size={13} /> {erreur}</div>}
          <button type="submit" style={styles.submitBtn} disabled={verification}>
            {verification ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>
      )}

      <button style={{ ...styles.linkBtn, marginTop: 18 }} onClick={() => setVue("accueil")}>
        ← Retour à l'accueil
      </button>
    </div>
  );
}

// ---------------- VUE ÉLECTRICIEN (COMMANDES) ----------------

function VueElectricien({ pannes, onChangerStatut, loading, electricien, onDeconnexion }) {
  const [filtre, setFiltre] = useState("actives");
  const [felicitationVisible, setFelicitationVisible] = useState(!electricien.felicitationVue);
  const liste = filtre === "actives" ? pannes.filter((p) => p.statut !== "resolu") : pannes;

  const pannesResolues = pannes.filter((p) => p.statut === "resolu" && p.prixFinal);
  const totalGagne = pannesResolues.reduce((acc, p) => acc + (p.prixFinal - p.commission), 0);

  function fermerFelicitation() {
    setFelicitationVisible(false);
    marquerFelicitationVueElectricien(electricien.id);
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.electricienHead}>
        <div>
          <h2 style={{ ...styles.pageTitle, marginBottom: 2 }}>Commandes</h2>
          <div style={styles.electricienNom}>{electricien.prenom} {electricien.nom} · {electricien.secteur}</div>
        </div>
        <button style={styles.logoutBtn} onClick={onDeconnexion}><LogOut size={14} /></button>
      </div>

      <BanniereFelicitation visible={felicitationVisible} onFermer={fermerFelicitation} />

      <div style={styles.gainsCard}>
        <div style={styles.gainsBloc}>
          <div style={styles.gainsLabel}>Tes gains nets</div>
          <div style={styles.gainsValeur}>{formatFCFA(totalGagne)}</div>
        </div>
        <div style={styles.gainsSep} />
        <div style={styles.gainsBloc}>
          <div style={styles.gainsLabel}>Interventions terminées</div>
          <div style={styles.gainsValeurMini}>{pannesResolues.length}</div>
        </div>
      </div>

      <div style={styles.filtreRow}>
        <button style={{ ...styles.filtreBtn, ...(filtre === "actives" ? styles.filtreBtnActive : {}) }} onClick={() => setFiltre("actives")}>
          Actives ({pannes.filter((p) => p.statut !== "resolu").length})
        </button>
        <button style={{ ...styles.filtreBtn, ...(filtre === "toutes" ? styles.filtreBtnActive : {}) }} onClick={() => setFiltre("toutes")}>
          Toutes ({pannes.length})
        </button>
      </div>

      {loading ? (
        <div style={styles.emptyState}>Chargement...</div>
      ) : liste.length === 0 ? (
        <div style={styles.emptyState}><Wrench size={28} color="#C8C8C8" /><div>Aucune commande pour l'instant</div></div>
      ) : (
        <div style={styles.listeCommandes}>
          {liste.map((p) => <CommandeCard key={p.id} panne={p} onChangerStatut={onChangerStatut} />)}
        </div>
      )}
    </div>
  );
}

function CommandeCard({ panne, onChangerStatut }) {
  const s = STATUTS[panne.statut];
  const [saisiePrix, setSaisiePrix] = useState(false);
  const [prix, setPrix] = useState(panne.prixMin || "");

  function confirmerPrix() {
    const montant = parseInt(prix, 10);
    if (!montant || montant <= 0) return;
    onChangerStatut(panne.id, "en_attente_paiement", montant);
    setSaisiePrix(false);
  }

  const commissionApercu = prix ? Math.round(parseInt(prix, 10) * TAUX_COMMISSION) : 0;
  const estInstallation = panne.categorie === CATEGORIES.installation;

  return (
    <div style={{ ...styles.commandeCard, borderLeftColor: s.color }}>
      <div style={styles.commandeTop}>
        <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
          {panne.statut !== "resolu" && <PulseDot color={s.color} />} {s.label}
        </span>
        <span style={styles.commandeTime}><Clock size={12} /> {timeAgo(panne.creeLe)}</span>
      </div>
      {estInstallation && (
        <span style={styles.categorieBadge}><PlugZap size={11} /> Installation</span>
      )}
      <div style={styles.commandeType}>{panne.type}</div>
      <div style={styles.commandeSecteur}><MapPin size={13} /> {panne.secteur}</div>
      {panne.description && <div style={styles.commandeDesc}>{panne.description}</div>}
      {(panne.prixMin || panne.prixMax) && panne.statut === "nouveau" && (
        <div style={styles.prixEstimeCard}>Estimation client : {formatFCFA(panne.prixMin)} – {formatFCFA(panne.prixMax)}</div>
      )}
      {panne.position && (
        <a href={`https://www.google.com/maps?q=${panne.position.lat},${panne.position.lng}`} target="_blank" rel="noopener noreferrer" style={styles.geoLink}>
          Voir sur la carte →
        </a>
      )}

      {(panne.statut === "en_attente_paiement" || panne.statut === "resolu") && panne.prixFinal && (
        <div style={styles.resumeGain}>
          <div style={styles.resumeGainLigne}><span>Prix convenu avec le client</span><span>{formatFCFA(panne.prixFinal)}</span></div>
          <div style={styles.resumeGainLigne}><span>Commission plateforme (15%)</span><span>-{formatFCFA(panne.commission)}</span></div>
          <div style={{ ...styles.resumeGainLigne, ...styles.resumeGainNet }}><span>Toi tu gardes</span><span>{formatFCFA(panne.prixFinal - panne.commission)}</span></div>
        </div>
      )}

      <div style={styles.commandeActions}>
        {panne.statut === "nouveau" && <button style={styles.actionBtnPrimary} onClick={() => onChangerStatut(panne.id, "pris_en_charge")}>Prendre en charge</button>}

        {panne.statut === "pris_en_charge" && !saisiePrix && (
          <button style={styles.actionBtnResolu} onClick={() => setSaisiePrix(true)}>Travail terminé, indiquer le prix</button>
        )}

        {panne.statut === "pris_en_charge" && saisiePrix && (
          <div style={styles.saisiePrixBox}>
            <label style={styles.label}>Prix convenu avec le client (FCFA)</label>
            <input
              type="number"
              style={styles.input}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              autoFocus
            />
            {prix > 0 && (
              <div style={styles.commissionApercu}>
                Commission plateforme (15%) : {formatFCFA(commissionApercu)} · Tu gardes {formatFCFA(parseInt(prix, 10) - commissionApercu)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={styles.actionBtnResolu} onClick={confirmerPrix}>Envoyer le prix</button>
              <button style={styles.secondaryBtn} onClick={() => setSaisiePrix(false)}>Annuler</button>
            </div>
          </div>
        )}

        {panne.statut === "en_attente_paiement" && (
          <div style={styles.attentePaiement}>
            <Loader2 size={14} style={{ animation: "spin 1.6s linear infinite" }} color="#B8860B" />
            En attente du paiement du client — Kuran te préviendra ici
          </div>
        )}

        {panne.statut === "resolu" && (
          <div style={styles.resoluText}><CheckCircle2 size={14} color={VERT} /> Paiement reçu — intervention terminée</div>
        )}
      </div>
    </div>
  );
}

// ---------------- ADMIN ----------------

function VueAdmin({ electriciens, onChangerStatut, pannes, onChangerStatutPanne, onDeconnexion, compteAdmin }) {
  const estPrincipal = compteAdmin?.role === "admin_principal";
  const [onglet, setOnglet] = useState("toutes");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [messageMdp, setMessageMdp] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [comptesAdmin, setComptesAdmin] = useState([]);
  const [journal, setJournal] = useState([]);
  const enAttente = electriciens.filter((e) => e.statut === "en_attente");
  const traites = electriciens.filter((e) => e.statut !== "en_attente");
  const enAttentePaiement = pannes.filter((p) => p.statut === "en_attente_paiement");
  const totalCommissions = pannes.filter((p) => p.statut === "resolu" && p.commission).reduce((acc, p) => acc + p.commission, 0);
  const pannesTriees = [...pannes].sort((a, b) => b.creeLe - a.creeLe);
  const employesEnAttente = comptesAdmin.filter((c) => c.role === "employe" && c.statut === "en_attente");
  const employesTraites = comptesAdmin.filter((c) => c.role === "employe" && c.statut !== "en_attente");
  const [felicitationVisible, setFelicitationVisible] = useState(compteAdmin && !compteAdmin.felicitationVue);

  function fermerFelicitation() {
    setFelicitationVisible(false);
    marquerFelicitationVueEmploye(compteAdmin.id);
  }

  useEffect(() => {
    if (estPrincipal && (onglet === "employes" || onglet === "journal")) {
      chargerComptesAdmin().then(setComptesAdmin);
      chargerJournal().then(setJournal);
    }
  }, [onglet, estPrincipal]);

  async function validerEmploye(id, statut) {
    const ok = await majStatutCompteAdmin(id, statut);
    if (ok) {
      setComptesAdmin((prev) => prev.map((c) => (c.id === id ? { ...c, statut } : c)));
      const cible = comptesAdmin.find((c) => c.id === id);
      const nomCible = cible ? `${cible.prenom} ${cible.nom}` : id;
      const actionsMap = { valide: "validation_employe", refuse: "refus_employe", suspendu: "suspendu", bloque: "bloque" };
      await enregistrerAction(compteAdmin, actionsMap[statut] || statut, nomCible);
    }
  }

  async function changerStatutPanneAvecJournal(id, statut, prixFinal) {
    await onChangerStatutPanne(id, statut, prixFinal);
    const cible = pannes.find((p) => p.id === id);
    await enregistrerAction(compteAdmin, statut === "resolu" ? "paiement_confirme" : "maj_panne", cible ? cible.type : id);
  }

  async function changerStatutElectricienAvecJournal(id, statut) {
    await onChangerStatut(id, statut);
    const cible = electriciens.find((e) => e.id === id);
    const nomCible = cible ? `${cible.prenom} ${cible.nom}` : id;
    const actionsMap = { valide: "validation_electricien", refuse: "refus_electricien", suspendu: "suspendu", bloque: "bloque" };
    await enregistrerAction(compteAdmin, actionsMap[statut] || statut, nomCible);
  }

  async function soumettreMdp(e) {
    e.preventDefault();
    setMessageMdp(null);
    if (nouveauMdp.length < 6) {
      setMessageMdp({ type: "erreur", texte: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (nouveauMdp !== confirmMdp) {
      setMessageMdp({ type: "erreur", texte: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setEnregistrement(true);
    const ok = await changerMotDePasseAdmin(nouveauMdp);
    setEnregistrement(false);
    if (ok) {
      setMessageMdp({ type: "succes", texte: "Mot de passe mis à jour avec succès." });
      setNouveauMdp("");
      setConfirmMdp("");
    } else {
      setMessageMdp({ type: "erreur", texte: "Échec de la mise à jour. Réessaie." });
    }
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.electricienHead}>
        <h2 style={{ ...styles.pageTitle, marginBottom: 2 }}>Espace administrateur</h2>
        <button style={styles.logoutBtn} onClick={onDeconnexion}><LogOut size={14} /></button>
      </div>

      <BanniereFelicitation visible={felicitationVisible} onFermer={fermerFelicitation} />

      <div style={styles.filtreRow}>
        <button style={{ ...styles.filtreBtn, ...(onglet === "toutes" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("toutes")}>
          Toutes les pannes ({pannes.length})
        </button>
        <button style={{ ...styles.filtreBtn, ...(onglet === "paiements" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("paiements")}>
          Paiements ({enAttentePaiement.length})
        </button>
        <button style={{ ...styles.filtreBtn, ...(onglet === "electriciens" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("electriciens")}>
          Électriciens {enAttente.length > 0 ? `(${enAttente.length})` : ""}
        </button>
        <button style={{ ...styles.filtreBtn, ...(onglet === "compte" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("compte")}>
          Compte
        </button>
        {estPrincipal && (
          <button style={{ ...styles.filtreBtn, ...(onglet === "employes" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("employes")}>
            Employés {employesEnAttente.length > 0 ? `(${employesEnAttente.length})` : ""}
          </button>
        )}
        {estPrincipal && (
          <button style={{ ...styles.filtreBtn, ...(onglet === "journal" ? styles.filtreBtnActive : {}) }} onClick={() => setOnglet("journal")}>
            Journal
          </button>
        )}
      </div>

      {onglet === "toutes" && (
        <>
          {pannesTriees.length === 0 ? (
            <div style={styles.emptyState}><Wallet size={28} color="#C8C8C8" /><div>Aucune panne signalée pour l'instant</div></div>
          ) : (
            <div style={styles.listeCommandes}>
              {pannesTriees.map((p) => (
                <div key={p.id} style={styles.paiementCard}>
                  <div style={styles.commandeTop}>
                    <span style={styles.commandeType}>{p.type}</span>
                    <span style={{ ...styles.badge, color: STATUTS[p.statut]?.color, background: STATUTS[p.statut]?.bg }}>
                      {STATUTS[p.statut]?.label || p.statut}
                    </span>
                  </div>
                  <div style={styles.commandeSecteur}><MapPin size={13} /> {p.secteur}</div>
                  {p.description && <div style={{ ...styles.commandeSecteur, marginTop: 2 }}>{p.description}</div>}
                  <div style={styles.commandeTime}><Clock size={12} /> {timeAgo(p.creeLe)}</div>
                  {p.prixFinal && (
                    <div style={{ ...styles.commandeSecteur, marginTop: 4 }}>
                      Prix convenu : {formatFCFA(p.prixFinal)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {onglet === "paiements" && (
        <>
          {estPrincipal && (
            <div style={styles.gainsCard}>
              <div style={styles.gainsBloc}>
                <div style={styles.gainsLabel}>Commissions perçues (total)</div>
                <div style={styles.gainsValeur}>{formatFCFA(totalCommissions)}</div>
              </div>
            </div>
          )}
          {enAttentePaiement.length === 0 ? (
            <div style={styles.emptyState}><Wallet size={28} color="#C8C8C8" /><div>Aucun paiement en attente</div></div>
          ) : (
            <div style={styles.listeCommandes}>
              {enAttentePaiement.map((p) => (
                <div key={p.id} style={styles.paiementCard}>
                  <div style={styles.commandeTop}>
                    <span style={styles.commandeType}>{p.type}</span>
                    <span style={styles.commandeTime}><Clock size={12} /> {timeAgo(p.majLe)}</span>
                  </div>
                  <div style={styles.commandeSecteur}><MapPin size={13} /> {p.secteur}</div>
                  <div style={styles.resumeGain}>
                    <div style={styles.resumeGainLigne}><span>Montant à recevoir</span><span>{formatFCFA(p.prixFinal)}</span></div>
                    {estPrincipal && (
                      <div style={styles.resumeGainLigne}><span>Commission Kuran (15%)</span><span>{formatFCFA(p.commission)}</span></div>
                    )}
                  </div>
                  <button style={styles.actionBtnResolu} onClick={() => changerStatutPanneAvecJournal(p.id, "resolu")}>
                    <CheckCircle2 size={14} /> Paiement reçu — prévenir l'électricien
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {onglet === "electriciens" && (
        <>
          {electriciens.length === 0 && <div style={styles.emptyState}>Aucune inscription pour l'instant</div>}

          {enAttente.length > 0 && (
            <>
              <div style={styles.adminSection}>En attente ({enAttente.length})</div>
              <div style={styles.listeCommandes}>
                {enAttente.map((e) => (
                  <div key={e.id} style={styles.candidatCard}>
                    <div style={styles.candidatNom}>{e.prenom} {e.nom}</div>
                    <div style={styles.candidatDetail}>{e.age} ans · {e.secteur} · {e.experience} ans d'expérience</div>
                    <div style={styles.candidatDetail}>{e.niveauEtudes}</div>
                    <div style={styles.candidatDetail}>{e.telephone}</div>
                    <div style={styles.candidatDetail}>CNIB : {e.cnibNomFichier}</div>
                    <div style={styles.commandeActions}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={styles.actionBtnResolu} onClick={() => changerStatutElectricienAvecJournal(e.id, "valide")}>
                          <CheckCircle2 size={14} /> Valider
                        </button>
                        <button style={styles.actionBtnRefuser} onClick={() => changerStatutElectricienAvecJournal(e.id, "refuse")}>
                          <XCircle size={14} /> Refuser
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {traites.length > 0 && (
            <>
              <div style={{ ...styles.adminSection, marginTop: 28 }}>Traités ({traites.length})</div>
              <div style={styles.listeCommandes}>
                {traites.map((e) => (
                  <div key={e.id} style={styles.candidatCardTraite}>
                    <div style={styles.candidatNom}>{e.prenom} {e.nom}</div>
                    <span style={{ ...styles.badge, ...badgeStyleStatut(e.statut) }}>
                      {libelleStatutPersonne(e.statut)}
                    </span>
                    {(e.statut === "valide" || e.statut === "suspendu") && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button style={styles.actionBtnResolu} onClick={() => { feliciterElectricien(e.id); }}>
                          <BadgeCheck size={13} /> Excellent boulot
                        </button>
                        {e.statut === "valide" && (
                          <button style={styles.actionBtnRefuser} onClick={() => changerStatutElectricienAvecJournal(e.id, "suspendu")}>
                            Suspendre
                          </button>
                        )}
                        {e.statut === "suspendu" && (
                          <button style={styles.actionBtnResolu} onClick={() => changerStatutElectricienAvecJournal(e.id, "valide")}>
                            Réactiver
                          </button>
                        )}
                        <button style={styles.actionBtnRefuser} onClick={() => changerStatutElectricienAvecJournal(e.id, "bloque")}>
                          <XCircle size={13} /> Bloquer définitivement
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {onglet === "compte" && (
        <div style={{ maxWidth: 420 }}>
          <div style={{ ...styles.adminSection, marginBottom: 12 }}>Changer le mot de passe</div>
          <form onSubmit={soumettreMdp} style={styles.form}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <input
              style={styles.input}
              type="password"
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              placeholder="Au moins 6 caractères"
            />
            <label style={styles.label}>Confirmer le mot de passe</label>
            <input
              style={styles.input}
              type="password"
              value={confirmMdp}
              onChange={(e) => setConfirmMdp(e.target.value)}
            />
            {messageMdp && (
              <div style={messageMdp.type === "erreur" ? styles.warnText : styles.resoluText}>
                {messageMdp.type === "erreur" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                {" "}{messageMdp.texte}
              </div>
            )}
            <button type="submit" style={styles.submitBtn} disabled={enregistrement}>
              {enregistrement ? "Enregistrement..." : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </div>
      )}

      {onglet === "employes" && estPrincipal && (
        <>
          {comptesAdmin.length === 0 && <div style={styles.emptyState}>Aucune demande pour l'instant</div>}

          {employesEnAttente.length > 0 && (
            <>
              <div style={styles.adminSection}>Demandes en attente ({employesEnAttente.length})</div>
              <div style={styles.listeCommandes}>
                {employesEnAttente.map((c) => (
                  <div key={c.id} style={styles.candidatCard}>
                    <div style={styles.candidatNom}>{c.prenom} {c.nom}</div>
                    <div style={styles.candidatDetail}>Identifiant : {c.identifiant}</div>
                    <div style={styles.commandeActions}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={styles.actionBtnResolu} onClick={() => validerEmploye(c.id, "valide")}>
                          <CheckCircle2 size={14} /> Valider
                        </button>
                        <button style={styles.actionBtnRefuser} onClick={() => validerEmploye(c.id, "refuse")}>
                          <XCircle size={14} /> Refuser
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {employesTraites.length > 0 && (
            <>
              <div style={{ ...styles.adminSection, marginTop: 28 }}>Comptes employés ({employesTraites.length})</div>
              <div style={styles.listeCommandes}>
                {employesTraites.map((c) => (
                  <div key={c.id} style={styles.candidatCardTraite}>
                    <div style={styles.candidatNom}>{c.prenom} {c.nom} <span style={{ color: "#999", fontWeight: 400 }}>({c.identifiant})</span></div>
                    <span style={{ ...styles.badge, ...badgeStyleStatut(c.statut) }}>
                      {c.statut === "valide" ? "Actif" : libelleStatutPersonne(c.statut)}
                    </span>
                    {(c.statut === "valide" || c.statut === "suspendu") && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button style={styles.actionBtnResolu} onClick={() => feliciterEmploye(c.id)}>
                          <BadgeCheck size={13} /> Excellent boulot
                        </button>
                        {c.statut === "valide" && (
                          <button style={styles.actionBtnRefuser} onClick={() => validerEmploye(c.id, "suspendu")}>
                            Suspendre
                          </button>
                        )}
                        {c.statut === "suspendu" && (
                          <button style={styles.actionBtnResolu} onClick={() => validerEmploye(c.id, "valide")}>
                            Réactiver
                          </button>
                        )}
                        <button style={styles.actionBtnRefuser} onClick={() => validerEmploye(c.id, "bloque")}>
                          <XCircle size={13} /> Bloquer définitivement
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {onglet === "journal" && estPrincipal && (
        <>
          {journal.length === 0 ? (
            <div style={styles.emptyState}>Aucune action enregistrée pour l'instant</div>
          ) : (
            <div style={styles.listeCommandes}>
              {journal.map((j) => (
                <div key={j.id} style={styles.candidatCardTraite}>
                  <div style={styles.candidatNom}>{j.auteurNom}</div>
                  <div style={styles.candidatDetail}>{libelleAction(j.action)}{j.cible ? ` — ${j.cible}` : ""}</div>
                  <div style={styles.commandeTime}><Clock size={12} /> {timeAgo(j.horodatage)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#FFFFFF", color: ENCRE, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #EEEEEE", position: "sticky", top: 0, background: "#FFFFFFee", backdropFilter: "blur(8px)", zIndex: 10 },
  brand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  brandIcon: { width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${ROUGE}, ${VERT})`, display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" },
  brandSub: { fontSize: 11, color: "#8A8A8A" },
  navBtn: { display: "flex", alignItems: "center", gap: 6, background: "#F7F7F7", border: "1px solid #E5E5E5", color: "#444", padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  accueilWrap: { maxWidth: 640, margin: "0 auto", padding: "32px 24px 40px", textAlign: "center" },
  heroIllu: { display: "flex", justifyContent: "center", marginBottom: 8 },
  heroTag: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#555", background: "#F7F7F7", border: "1px solid #EEEEEE", padding: "6px 12px", borderRadius: 20, marginBottom: 22 },
  heroTitle: { fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 16px" },
  heroDesc: { fontSize: 15.5, color: "#666", lineHeight: 1.6, maxWidth: 480, marginBottom: 32, marginLeft: "auto", marginRight: "auto" },
  cardsRow: { display: "flex", flexDirection: "column", gap: 12, textAlign: "left" },
  choiceCard: { display: "flex", alignItems: "center", gap: 14, textAlign: "left", background: "#FFFFFF", border: "1px solid #EAEAEA", borderRadius: 14, padding: "18px", cursor: "pointer", color: ENCRE, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  choiceIcon: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  choiceLabel: { fontWeight: 700, fontSize: 15.5 },
  choiceDesc: { fontSize: 12.5, color: "#8A8A8A", marginTop: 2 },
  footerLinks: { display: "flex", flexDirection: "column", gap: 10, marginTop: 28, alignItems: "center" },
  linkBtn: { background: "none", border: "none", color: VERT, fontWeight: 600, fontSize: 13.5, cursor: "pointer", padding: 0 },
  linkBtnMuted: { background: "none", border: "none", color: "#AAAAAA", fontSize: 12.5, cursor: "pointer", padding: 0 },
  pageWrap: { maxWidth: 560, margin: "0 auto", padding: "32px 20px 60px" },
  pageTitle: { fontSize: 21, fontWeight: 800, margin: "0 0 20px" },
  form: { display: "flex", flexDirection: "column", gap: 6 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { fontSize: 12.5, fontWeight: 600, marginTop: 14, marginBottom: 4, color: "#666" },
  chipsRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { background: "#F7F7F7", border: "1px solid #E5E5E5", color: "#444", padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer" },
  chipActive: { background: "#FDEBEB", borderColor: ROUGE, color: ROUGE, fontWeight: 600 },
  chipActiveVert: { background: "#E6F5EC", borderColor: VERT, color: VERT, fontWeight: 600 },
  categorieRow: { display: "flex", gap: 8, marginBottom: 22 },
  categorieBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#F7F7F7", border: "1px solid #E5E5E5", color: "#666", padding: "12px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  categorieBtnActive: { background: "#FDEBEB", borderColor: ROUGE, color: ROUGE },
  categorieBtnActiveVert: { background: "#E6F5EC", borderColor: VERT, color: VERT },
  categorieBadge: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: VERT, background: "#E6F5EC", padding: "3px 8px", borderRadius: 10, marginBottom: 6 },
  input: { background: "#FAFAFA", border: "1px solid #E5E5E5", color: ENCRE, padding: "12px 14px", borderRadius: 10, fontSize: 14.5, outline: "none" },
  textarea: { background: "#FAFAFA", border: "1px solid #E5E5E5", color: ENCRE, padding: "12px 14px", borderRadius: 10, fontSize: 14.5, outline: "none", fontFamily: "inherit", resize: "vertical" },
  uploadBox: { display: "flex", alignItems: "center", gap: 8, background: "#FAFAFA", border: "1px dashed #CCCCCC", color: "#666", padding: "12px 14px", borderRadius: 10, fontSize: 13.5, cursor: "pointer" },
  geoBtn: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#FAFAFA", border: "1px dashed #CCCCCC", color: "#444", padding: "13px 14px", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  geoConfirmed: { display: "flex", alignItems: "center", gap: 8, background: "#E6F5EC", border: "1px solid #BFE6CD", color: "#0C6B32", padding: "12px 14px", borderRadius: 10, fontSize: 13 },
  warnText: { display: "flex", alignItems: "center", gap: 6, color: "#B8860B", fontSize: 12.5, marginTop: 8 },
  submitBtn: { marginTop: 22, background: ROUGE, color: "#fff", border: "none", padding: "15px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  confirmCard: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "#FAFAFA", border: "1px solid #EEEEEE", borderRadius: 16, padding: "40px 28px" },
  confirmTitle: { fontSize: 20, fontWeight: 800, margin: "16px 0 8px" },
  confirmDesc: { fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 20 },
  statutLive: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 12 },
  statutSub: { fontSize: 11.5, color: "#AAAAAA" },
  secondaryBtn: { background: "#fff", border: "1px solid #DDDDDD", color: "#444", padding: "11px 20px", borderRadius: 10, fontSize: 13.5, cursor: "pointer", marginTop: 16 },
  badge: { display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 700 },
  electricienHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  electricienNom: { fontSize: 12.5, color: "#8A8A8A" },
  logoutBtn: { background: "#F7F7F7", border: "1px solid #E5E5E5", color: "#666", padding: "9px 11px", borderRadius: 8, cursor: "pointer" },
  filtreRow: { display: "flex", gap: 8, marginBottom: 20, marginTop: 18 },
  filtreBtn: { background: "#F7F7F7", border: "1px solid #E5E5E5", color: "#666", padding: "7px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" },
  filtreBtnActive: { background: ENCRE, color: "#fff", borderColor: ENCRE },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#AAAAAA", fontSize: 13.5, padding: "60px 0" },
  listeCommandes: { display: "flex", flexDirection: "column", gap: 12 },
  commandeCard: { background: "#FFFFFF", border: "1px solid #EAEAEA", borderLeft: "3px solid", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  commandeTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  commandeTime: { display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#AAAAAA" },
  commandeType: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  commandeSecteur: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666", marginBottom: 6 },
  commandeDesc: { fontSize: 13, color: "#444", lineHeight: 1.5, marginBottom: 8 },
  geoLink: { fontSize: 12.5, color: VERT, textDecoration: "none", fontWeight: 600 },
  commandeActions: { marginTop: 14 },
  actionBtnPrimary: { width: "100%", background: ROUGE, color: "#fff", border: "none", padding: "11px", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  actionBtnResolu: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: VERT, color: "#fff", border: "none", padding: "11px", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  actionBtnRefuser: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "#fff", color: ROUGE, border: `1px solid ${ROUGE}`, padding: "11px", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  resoluText: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8A8A8A" },
  attentePaiement: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#B8860B", background: "#FFF7DC", padding: "10px 12px", borderRadius: 8 },
  adminSection: { fontSize: 12.5, fontWeight: 700, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 },
  candidatCard: { background: "#FFFDF5", border: `1px solid ${JAUNE}`, borderRadius: 12, padding: "16px 18px" },
  candidatCardTraite: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFAFA", border: "1px solid #EEEEEE", borderRadius: 12, padding: "12px 16px" },
  candidatNom: { fontWeight: 700, fontSize: 14.5, marginBottom: 4 },
  candidatDetail: { fontSize: 12.5, color: "#666", marginBottom: 2 },
  toastErreur: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#FDEBEB", border: `1px solid ${ROUGE}`, color: "#7A1010", padding: "10px 18px", borderRadius: 10, fontSize: 13 },
  prixEstime: { marginTop: 12, fontSize: 13, color: "#444", background: "#F7F7F7", padding: "10px 12px", borderRadius: 10 },
  prixNote: { color: "#AAAAAA", fontSize: 11.5 },
  prixEstimeCard: { fontSize: 12, color: "#8A8A8A", marginBottom: 8 },
  gainsCard: { display: "flex", alignItems: "center", background: `linear-gradient(135deg, ${VERT}, #007A38)`, borderRadius: 14, padding: "18px 20px", marginTop: 16, marginBottom: 4, color: "#fff" },
  gainsBloc: { flex: 1 },
  gainsSep: { width: 1, height: 32, background: "rgba(255,255,255,0.3)", margin: "0 16px" },
  gainsLabel: { fontSize: 11.5, opacity: 0.85, marginBottom: 4 },
  gainsValeur: { fontSize: 22, fontWeight: 800 },
  gainsValeurMini: { fontSize: 20, fontWeight: 800 },
  saisiePrixBox: { background: "#FAFAFA", border: "1px solid #E5E5E5", borderRadius: 10, padding: 14, marginTop: 4 },
  commissionApercu: { fontSize: 12, color: "#666", marginTop: 8, background: "#FFF7DC", padding: "8px 10px", borderRadius: 8 },
  resumeGain: { background: "#F7F7F7", borderRadius: 10, padding: "12px 14px", marginBottom: 10, marginTop: 6 },
  resumeGainLigne: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#666", marginBottom: 4 },
  resumeGainNet: { fontWeight: 800, color: ENCRE, fontSize: 13.5, marginTop: 4, paddingTop: 6, borderTop: "1px solid #E5E5E5" },
  paiementBox: { display: "flex", gap: 12, alignItems: "flex-start", background: "#FFF7DC", border: `1px solid ${JAUNE}`, borderRadius: 12, padding: "16px", marginBottom: 4, textAlign: "left", width: "100%" },
  paiementTexte: { flex: 1 },
  paiementMontant: { fontWeight: 800, fontSize: 15, marginBottom: 4 },
  paiementInfo: { fontSize: 12.5, color: "#666" },
  paiementNumero: { fontWeight: 800, fontSize: 17, color: "#B8860B", margin: "4px 0" },
  paiementNote: { fontSize: 11.5, color: "#8A8A8A" },
  paiementConfirme: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: VERT, fontWeight: 700, background: "#E6F5EC", padding: "10px 14px", borderRadius: 10 },
  paiementCard: { background: "#FFFDF5", border: `1px solid ${JAUNE}`, borderRadius: 12, padding: "16px 18px" },
  introWrap: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFFFF", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  introTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" },
  introBody: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" },
  introIllu: { marginBottom: 24 },
  introIconWrap: { width: 96, height: 96, borderRadius: "50%", background: "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  introTitre: { fontSize: 24, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" },
  introTexte: { fontSize: 14.5, color: "#666", lineHeight: 1.6, maxWidth: 340 },
  introDots: { display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 },
  introDot: { height: 8, borderRadius: 4, transition: "width 0.2s" },
  introActions: { display: "flex", gap: 10, padding: "0 24px 40px" },
  introBtnPrincipal: { flex: 1, background: ROUGE, color: "#fff", border: "none", padding: "16px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  introBtnSecondaire: { display: "flex", alignItems: "center", justifyContent: "center", width: 52, background: "#F7F7F7", border: "1px solid #E5E5E5", borderRadius: 12, cursor: "pointer", color: "#444" },
};
