"use client";

// Illustrations SAFE - Grandes lettres avec éléments artistiques

// S - Security: Grande lettre S avec silhouette protégée
export const SecurityIllustration = ({ size = 120, color = "#22c55e" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grande lettre S en fond */}
    <text
      x="60"
      y="85"
      textAnchor="middle"
      fontSize="90"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
      opacity="0.15"
    >
      S
    </text>

    {/* Dôme de protection */}
    <path
      d="M25 75C25 45 40 20 60 20C80 20 95 45 95 75"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Lignes de chiffrement */}
    <g opacity="0.5" stroke={color} strokeWidth="1.5" strokeDasharray="6 3">
      <path d="M32 68C32 48 44 30 60 30C76 30 88 48 88 68" />
    </g>

    {/* Silhouette humaine protégée */}
    <g transform="translate(60, 50)">
      <ellipse cx="0" cy="0" rx="8" ry="9" fill={color} />
      <path d="M0 9C-8 11 -12 25 -10 42C-5 40 0 39 0 39C0 39 5 40 10 42C12 25 8 11 0 9Z" fill={color} opacity="0.9" />
    </g>

    {/* Cadenas */}
    <g transform="translate(75, 25)">
      <rect x="0" y="10" width="18" height="14" rx="2" fill={color} />
      <path d="M4 10V6C4 3 6 1 9 1C12 1 14 3 14 6V10" stroke={color} strokeWidth="2.5" fill="none" />
    </g>

    {/* Lettre S visible */}
    <text
      x="30"
      y="40"
      textAnchor="middle"
      fontSize="32"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
    >
      S
    </text>
  </svg>
);

// A - Adversity: Grande lettre A avec guerrier
export const AdversityIllustration = ({ size = 120, color = "#f59e0b" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grande lettre A en fond */}
    <text
      x="60"
      y="85"
      textAnchor="middle"
      fontSize="90"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
      opacity="0.15"
    >
      A
    </text>

    {/* Flèches/menaces qui arrivent */}
    <g stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
      <path d="M10 40L30 50" />
      <path d="M10 40L15 35M10 40L15 45" />
      <path d="M5 60L28 65" />
      <path d="M5 60L10 55M5 60L10 65" />
      <path d="M10 80L30 78" />
      <path d="M10 80L15 75M10 80L15 85" />
    </g>

    {/* Silhouette avec bouclier */}
    <g transform="translate(65, 30)">
      <ellipse cx="10" cy="5" rx="9" ry="10" fill={color} />
      <path d="M10 15C0 18 -4 35 -2 60C4 58 10 57 10 57C10 57 16 58 22 60C24 35 20 18 10 15Z" fill={color} opacity="0.9" />
      <path d="M5 30L-15 28" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </g>

    {/* Bouclier */}
    <path
      d="M38 50L28 55V75C28 85 38 92 38 92C38 92 48 85 48 75V55L38 50Z"
      fill={`${color}50`}
      stroke={color}
      strokeWidth="2"
    />

    {/* Lettre A visible */}
    <text
      x="95"
      y="35"
      textAnchor="middle"
      fontSize="32"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
    >
      A
    </text>
  </svg>
);

// F - Fidelity: Grande lettre F avec connexion humaine
export const FidelityIllustration = ({ size = 120, color = "#3b82f6" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grande lettre F en fond */}
    <text
      x="60"
      y="85"
      textAnchor="middle"
      fontSize="90"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
      opacity="0.15"
    >
      F
    </text>

    {/* Cercle de confiance */}
    <circle cx="60" cy="65" r="40" fill="none" stroke={color} strokeWidth="2" strokeDasharray="8 4" opacity="0.4" />

    {/* Silhouette gauche */}
    <g transform="translate(35, 40)">
      <ellipse cx="0" cy="3" rx="7" ry="8" fill={color} />
      <path d="M0 11C-7 13 -10 26 -8 45C-4 43 0 42 0 42C0 42 4 43 8 45C10 26 7 13 0 11Z" fill={color} opacity="0.85" />
      <path d="M6 24L22 28" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </g>

    {/* Silhouette droite */}
    <g transform="translate(85, 40)">
      <ellipse cx="0" cy="3" rx="7" ry="8" fill={color} />
      <path d="M0 11C-7 13 -10 26 -8 45C-4 43 0 42 0 42C0 42 4 43 8 45C10 26 7 13 0 11Z" fill={color} opacity="0.85" />
      <path d="M-6 24L-22 28" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </g>

    {/* Point de connexion */}
    <circle cx="60" cy="66" r="6" fill={color} />

    {/* Badge vérifié */}
    <g transform="translate(80, 15)">
      <circle cx="10" cy="10" r="10" fill={color} />
      <path d="M5 10L8 13L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Lettre F visible */}
    <text
      x="25"
      y="30"
      textAnchor="middle"
      fontSize="32"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
    >
      F
    </text>
  </svg>
);

// E - Efficiency: Grande lettre E avec mouvement
export const EfficiencyIllustration = ({ size = 120, color = "#8b5cf6" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grande lettre E en fond */}
    <text
      x="60"
      y="85"
      textAnchor="middle"
      fontSize="90"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
      opacity="0.15"
    >
      E
    </text>

    {/* Cercle de performance */}
    <circle cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />

    {/* Silhouette en mouvement */}
    <g transform="translate(45, 30)">
      <ellipse cx="18" cy="5" rx="9" ry="10" fill={color} />
      <path d="M18 15C8 18 5 32 7 52L18 48L29 52C31 32 28 18 18 15Z" fill={color} opacity="0.9" />
      <path d="M10 48L-8 65" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M26 48L42 62" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </g>

    {/* Lignes de vitesse */}
    <g stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6">
      <path d="M12 45H28" />
      <path d="M8 55H24" />
      <path d="M12 65H28" />
    </g>

    {/* Éclair */}
    <path
      d="M88 25L78 42H85L80 60L95 38H86L88 25Z"
      fill={color}
    />

    {/* Lettre E visible */}
    <text
      x="25"
      y="30"
      textAnchor="middle"
      fontSize="32"
      fontWeight="900"
      fill={color}
      fontFamily="system-ui, sans-serif"
    >
      E
    </text>
  </svg>
);

// Mini-icônes d'exemples pour chaque pilier
export const ExampleIcons = {
  // Security examples
  encryption: ({ size = 24, color = "#22c55e" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="12" rx="2" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <path d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="15" r="2" fill={color} />
    </svg>
  ),
  key: ({ size = 24, color = "#22c55e" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="15" r="5" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <path d="M12 12L20 4M18 4H20V6M16 8L18 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  signature: ({ size = 24, color = "#22c55e" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 18C8 14 10 16 14 12C18 8 16 6 20 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 20H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // Adversity examples
  shield: ({ size = 24, color = "#f59e0b" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L20 7V12C20 16.4 16.4 20.4 12 21C7.6 20.4 4 16.4 4 12V7L12 3Z" fill={`${color}30`} stroke={color} strokeWidth="2" />
    </svg>
  ),
  hidden: ({ size = 24, color = "#f59e0b" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 12S5 5 12 5C19 5 22 12 22 12S19 19 12 19C5 19 2 12 2 12Z" stroke={color} strokeWidth="2" />
      <path d="M4 20L20 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  duress: ({ size = 24, color = "#f59e0b" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <path d="M12 7V12L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 3L4 6M16 3L20 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // Fidelity examples
  audit: ({ size = 24, color = "#3b82f6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="12" height="16" rx="2" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <circle cx="16" cy="17" r="5" stroke={color} strokeWidth="2" />
      <path d="M19 20L22 23" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bug: ({ size = 24, color = "#3b82f6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="14" rx="6" ry="7" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <circle cx="12" cy="8" r="3" stroke={color} strokeWidth="2" />
      <path d="M3 10H6M18 10H21M3 16H6M18 16H21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  update: ({ size = 24, color = "#3b82f6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12C4 7.58 7.58 4 12 4C15.37 4 18.24 6.11 19.42 9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12C20 16.42 16.42 20 12 20C8.63 20 5.76 17.89 4.58 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 9H20V5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 15H4V19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Efficiency examples
  speed: ({ size = 24, color = "#8b5cf6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" fill={`${color}30`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  multichain: ({ size = 24, color = "#8b5cf6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={color} />
      <circle cx="4" cy="6" r="2" fill={`${color}60`} stroke={color} />
      <circle cx="20" cy="6" r="2" fill={`${color}60`} stroke={color} />
      <circle cx="4" cy="18" r="2" fill={`${color}60`} stroke={color} />
      <circle cx="20" cy="18" r="2" fill={`${color}60`} stroke={color} />
      <path d="M9 10L5 7M15 10L19 7M9 14L5 17M15 14L19 17" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  mobile: ({ size = 24, color = "#8b5cf6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2" fill={`${color}30`} stroke={color} strokeWidth="2" />
      <circle cx="12" cy="18" r="1.5" fill={color} />
      <line x1="9" y1="5" x2="15" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// Composant qui affiche toutes les illustrations
const PillarIllustrations = {
  S: SecurityIllustration,
  A: AdversityIllustration,
  F: FidelityIllustration,
  E: EfficiencyIllustration,
};

export default PillarIllustrations;
