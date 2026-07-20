export const metadata = {
  title: "Kuran — Signalement de pannes SONABEL",
  description: "Mets en relation les usagers SONABEL avec des électriciens vérifiés.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#EF2B2D" />
        <script
          dangerouslySetInnerHTML={{
            __html: "if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }",
          }}
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
    }
