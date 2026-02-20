# Audit UX/UI - Page Map SafeScoring

## Date: 2026-01-08
## Version analysée: Screenshot localhost:3000/map

---

## 1. RAPPORT DE CONSTAT

### 1.1 TOP BAR (Header)

| Element | Constat | Critique | Priorité |
|---------|---------|----------|----------|
| Logo SafeScoring | OK - visible, identifiable | - | - |
| "2 online" | Chiffre faux (affiche 2 au lieu de la vraie valeur) | Manque de crédibilité | HIGH |
| Pills "Products: 511" | Redondant avec sidebar gauche | Surcharge cognitive | MEDIUM |
| Pills "Incidents: 94" | Redondant avec sidebar gauche | Surcharge cognitive | MEDIUM |
| Toggle 3D/2D | OK mais pas assez visible | Style flat trop discret | LOW |
| Bouton Fullscreen | Pas d'icône tooltip | UX incomplete | LOW |
| Bouton Refresh | Pas de feedback visuel | UX incomplete | LOW |

### 1.2 SIDEBAR GAUCHE (Layer Controls)

| Element | Constat | Critique | Priorité |
|---------|---------|----------|----------|
| "Blockchain Nodes 64 359" | Format nombre incorrect (espace au lieu de virgule) | Bug d'affichage | HIGH |
| Layer Cards | Toutes actives sauf Legislation | Pas d'indication visuelle ON/OFF claire | HIGH |
| Dot indicator | Trop petit (3px), pas assez visible | Accessibilité faible | MEDIUM |
| "Physical Attacks" emoji 💥 | Emoji ne transmet pas le danger | Mauvais choix sémantique | LOW |
| "Build Your Stack" | Coupé en bas de l'écran | Layout cassé | HIGH |
| Scroll sidebar | Pas de scrollbar visible | UX confuse | MEDIUM |

### 1.3 SIDEBAR DROITE (Info Panels)

| Element | Constat | Critique | Priorité |
|---------|---------|----------|----------|
| Boutons Catalog/Incidents/Laws | Trop petits, emojis pas alignés | Touch target insuffisant | HIGH |
| Product Catalog panel | Ouvert par défaut | Bloque la vue du globe | MEDIUM |
| Products sans score | Coinomi, KyberSwap, Upbit sans score visible | Data incomplète affichée | HIGH |
| D'CENT Wallet "71.1" | Score tronqué à droite | Overflow visible | HIGH |
| Scroll produits | Liste trop longue sans pagination | Performance UX | MEDIUM |
| Pas de tri | Impossible de trier par score/nom | Fonctionnalité manquante | HIGH |

### 1.4 GLOBE 3D (Centre)

| Element | Constat | Critique | Priorité |
|---------|---------|----------|----------|
| Globe tout noir | Texture earth-night trop sombre | Peu engageant visuellement | HIGH |
| Points bleus | Tous de même couleur | Pas de différenciation layers | HIGH |
| Nombres sur points (4,4,5) | Signification pas claire | Légende absente | HIGH |
| Interactivité click | Rien ne se passe au clic | Frustration utilisateur | CRITICAL |
| Zoom/Pan | Fonctionne mais pas documenté | Onboarding absent | MEDIUM |
| Animation rotation | Auto-rotate trop rapide | Distraction | LOW |

### 1.5 TIMELINE (Bottom)

| Element | Constat | Critique | Priorité |
|---------|---------|----------|----------|
| "10 attacks • 84 hacks" | Décalé à gauche, pas centré | Alignement incorrect | LOW |
| "All Time" label | Peu visible en cyan | Contraste faible | LOW |
| Boutons 1x 2x 3x | Fonction pas claire | UX confuse | MEDIUM |
| Slider années | OK mais trop petit | Touch target mobile | MEDIUM |
| Boutons play/forward | Design incohérent avec le reste | Style différent | LOW |

### 1.6 FONCTIONNALITÉS MANQUANTES CRITIQUES

| Fonctionnalité | Impact | Priorité |
|----------------|--------|----------|
| Community Stacks | Pas de visualisation des stacks des autres utilisateurs | CRITICAL |
| Click sur produit globe | Aucune action au clic | CRITICAL |
| Partage anonyme | Impossible de partager son setup anonymement | CRITICAL |
| Légende des couleurs | Utilisateur ne comprend pas les points | HIGH |
| Filtres par score | Impossible de filtrer les produits par score | HIGH |
| Export/Screenshot | Pas de fonction export de la vue | MEDIUM |

---

## 2. STRATÉGIE D'IMPLÉMENTATION

### Phase 1: Fixes Critiques (Jour 1)

1. **Ajouter section "Community Stacks"**
   - Nouveau layer dans sidebar gauche
   - API pour récupérer les stacks publics/anonymes
   - Points sur le globe pour les stacks partagés

2. **Fix click globe**
   - onPointClick handler
   - Popup/modal avec détails produit
   - Animation fly-to sur le point

3. **Fix format nombres**
   - Utiliser toLocaleString() partout
   - "64,359" au lieu de "64 359"

### Phase 2: UX Improvements (Jour 2)

4. **Améliorer Layer Cards**
   - Toggle switch visible au lieu du dot
   - Animation ON/OFF plus claire
   - Tooltip sur hover

5. **Fix Product Catalog**
   - Ajouter tri (Score, Nom, Type)
   - Pagination ou virtual scroll
   - Fix overflow score badge

6. **Globe visuel**
   - Texture plus claire (earth-blue-marble)
   - Points avec couleurs différentes par layer
   - Légende des couleurs

### Phase 3: Features Anonymes (Jour 3)

7. **Système de partage anonyme**
   - Toggle "Share my stack" dans settings
   - Hash anonyme pour identifier les stacks
   - Visualisation sur la map sans données personnelles

8. **Interactivité avancée**
   - Click sur stack communautaire → voir composition
   - Comparer avec son propre stack
   - "Similar stacks" suggestions

---

## 3. IMPLEMENTATION DÉTAILLÉE

### 3.1 Community Stacks Layer

```javascript
// Nouveau state
const [publicStacks, setPublicStacks] = useState([]);
const [showCommunityStacks, setShowCommunityStacks] = useState(true);

// Fetch public stacks
useEffect(() => {
  fetch('/api/community/stacks?anonymous=true')
    .then(r => r.json())
    .then(data => setPublicStacks(data.stacks));
}, []);
```

### 3.2 Globe Click Handler

```javascript
// Dans Globe3D props
onPointClick={(point) => {
  setSelectedProduct(point.product);
  setShowProductModal(true);
  // Fly to point
  globeRef.current?.pointOfView({
    lat: point.lat,
    lng: point.lng,
    altitude: 1.5
  }, 1000);
}}
```

### 3.3 Anonymous Stack Sharing

```javascript
// API endpoint /api/community/stacks
// - GET: récupère stacks publics (hash uniquement, pas d'email)
// - POST: partage son stack anonymement
// Structure:
{
  hash: "abc123", // SHA256(user_id + timestamp)
  products: [1, 2, 3], // IDs produits seulement
  country: "XX", // Anonymisé ou opt-in
  created_at: "2024-01-01"
}
```

---

## 4. MOCKUP NOUVEAU LAYOUT

```
┌──────────────────────────────────────────────────────────────────┐
│ [S] SafeScoring          [Stats Bar]        [3D] [2D] [⛶] [↻]   │
├─────────────┬────────────────────────────────┬───────────────────┤
│             │                                │                   │
│ LAYERS      │                                │ INFO PANEL        │
│ ─────────── │                                │ ───────────────   │
│ ⬜ Nodes    │                                │ [Catalog][Stacks] │
│ ⬜ Products │         🌍 GLOBE 3D            │ [Incidents][Laws] │
│ ⬜ Attacks  │                                │                   │
│ ⬜ Hacks    │      (Points interactifs)      │ ┌───────────────┐ │
│ ⬜ Laws     │                                │ │ Selected Item │ │
│ ⬜ Community│     [Click = open modal]       │ │ or List View  │ │
│             │                                │ └───────────────┘ │
│ ─────────── │                                │                   │
│ MY STACK    │                                │ COMMUNITY STACKS  │
│ [Filter]    │                                │ 🔵 Stack #a1b2    │
│             │                                │ 🔵 Stack #c3d4    │
├─────────────┴────────────────────────────────┴───────────────────┤
│              [Timeline: 2009 ════════════════════ 2026]          │
│                        "10 attacks • 84 hacks"                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. PRIORITÉS FINALES

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix click globe → modal produit | 2h | CRITICAL |
| 2 | Add Community Stacks layer | 4h | CRITICAL |
| 3 | Implement anonymous sharing | 3h | CRITICAL |
| 4 | Fix number formatting | 30min | HIGH |
| 5 | Fix product scores display | 1h | HIGH |
| 6 | Add product sorting | 1h | HIGH |
| 7 | Improve layer toggles UX | 2h | MEDIUM |
| 8 | Add color legend | 1h | MEDIUM |
| 9 | Globe texture improvement | 30min | MEDIUM |

**Total estimé: ~15h de développement**
