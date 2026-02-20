# 📱 Guide de Test Mobile en Temps Réel

## 🚀 Démarrage Rapide

### 1. Lancer le serveur en mode réseau local

```bash
# Dans le dossier web/
npm run dev -- --hostname 0.0.0.0
```

### 2. Trouver votre IP locale

```bash
# Windows
ipconfig
# Cherchez "Adresse IPv4" sous votre connexion WiFi

# Mac/Linux
ifconfig | grep inet
```

### 3. Accéder depuis votre téléphone

1. **Connectez votre téléphone au même WiFi**
2. **Ouvrez votre navigateur mobile**
3. **Tapez:** `http://[VOTRE-IP]:3000`
   - Exemple: `http://192.168.1.42:3000`

## 🔧 Configuration Chrome DevTools Remote

### Sur votre PC (Chrome)

1. Ouvrez Chrome
2. Allez sur `chrome://inspect`
3. Cochez "Discover network targets"
4. Configurez le port: `localhost:9229`

### Sur votre téléphone Android

1. Activez le mode développeur
2. Activez le débogage USB
3. Connectez via USB
4. Acceptez l'autorisation de débogage

### Inspection en temps réel

1. Votre téléphone apparaît dans `chrome://inspect`
2. Cliquez sur "inspect" sous votre page
3. Vous avez maintenant les DevTools pour votre téléphone !

## 📊 Points de Test Critiques

### ✅ Navigation Mobile

- [ ] **Menu burger s'ouvre/ferme correctement**
- [ ] **Pas de scroll horizontal**
- [ ] **Navigation fluide entre pages**
- [ ] **Retour arrière fonctionne**
- [ ] **Liens touchables (44x44px minimum)**

### ✅ Performance

- [ ] **Temps de chargement < 3s sur 4G**
- [ ] **Animations fluides (60fps)**
- [ ] **Pas de lag au scroll**
- [ ] **Images chargent progressivement**
- [ ] **Pas de flash de contenu (CLS)**

### ✅ Interactions Tactiles

- [ ] **Zones de clic assez grandes**
- [ ] **Feedback visuel sur tap**
- [ ] **Swipe gestes fonctionnent**
- [ ] **Pinch-to-zoom désactivé où nécessaire**
- [ ] **Pas de double-tap accidentel**

### ✅ Formulaires

- [ ] **Clavier approprié (email, number, etc.)**
- [ ] **Autocomplete fonctionne**
- [ ] **Validation en temps réel**
- [ ] **Messages d'erreur visibles**
- [ ] **Submit button accessible**

### ✅ Responsive Design

- [ ] **Texte lisible sans zoom**
- [ ] **Images adaptées à l'écran**
- [ ] **Modals/popups centrées**
- [ ] **Tables scrollables horizontalement**
- [ ] **Vidéos responsive**

## 🐛 Debug en Temps Réel

### Console Mobile

Ajoutez ce script pour voir les logs sur mobile :

```javascript
// components/MobileDebug.js
export default function MobileDebug() {
  if (process.env.NODE_ENV !== 'development') return null;

  useEffect(() => {
    // Override console.log
    const originalLog = console.log;
    const logs = [];

    console.log = (...args) => {
      originalLog(...args);
      logs.push(args.join(' '));
      if (logs.length > 10) logs.shift();

      // Display on screen
      const debugDiv = document.getElementById('mobile-debug');
      if (debugDiv) {
        debugDiv.innerHTML = logs.map(log =>
          `<div class="text-xs">${log}</div>`
        ).join('');
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  return (
    <div
      id="mobile-debug"
      className="fixed bottom-0 left-0 right-0 bg-black/80 text-white p-2 text-xs max-h-32 overflow-y-auto z-50"
    />
  );
}
```

### Performance Monitor

```javascript
// components/PerfMonitor.js
export default function PerfMonitor() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const checkFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round(frames * 1000 / (currentTime - lastTime)));
        frames = 0;
        lastTime = currentTime;
      }

      // Memory usage
      if (performance.memory) {
        setMemory(Math.round(performance.memory.usedJSHeapSize / 1048576));
      }

      requestAnimationFrame(checkFPS);
    };

    checkFPS();
  }, []);

  return (
    <div className="fixed top-20 right-2 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>FPS: {fps}</div>
      <div>Memory: {memory}MB</div>
    </div>
  );
}
```

## 📱 Tests par Appareil

### iPhone (Safari)

```javascript
// Détection iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Fixes spécifiques iOS
if (isIOS) {
  // Empêcher le bounce
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';

  // Fix pour le clavier
  window.scrollTo(0, 1);

  // Safe areas pour notch
  document.documentElement.style.setProperty(
    '--safe-area-inset-top',
    'env(safe-area-inset-top)'
  );
}
```

### Android (Chrome)

```javascript
// Détection Android
const isAndroid = /Android/.test(navigator.userAgent);

// Optimisations Android
if (isAndroid) {
  // Activer l'accélération hardware
  document.body.style.transform = 'translateZ(0)';

  // Pull-to-refresh custom
  let startY = 0;
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].pageY;
  });

  document.addEventListener('touchmove', (e) => {
    const y = e.touches[0].pageY;
    if (document.scrollingElement.scrollTop === 0 && y > startY) {
      e.preventDefault();
    }
  });
}
```

## 🎯 Outils de Test Recommandés

### 1. **BrowserStack** (Test sur vrais appareils)
- URL: https://www.browserstack.com
- Test sur 3000+ vrais appareils
- Gratuit pour open source

### 2. **Responsively App** (Multi-viewport)
- URL: https://responsively.app
- Voir plusieurs tailles d'écran simultanément
- Synchronisation du scroll

### 3. **ngrok** (Tunnel sécurisé)
```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel
ngrok http 3000

# Vous obtenez une URL publique comme:
# https://abc123.ngrok.io
```

### 4. **Chrome Lighthouse** (Audit mobile)
```bash
# Audit mobile complet
lighthouse http://localhost:3000 \
  --emulated-form-factor=mobile \
  --throttling-method=simulate \
  --throttling.cpuSlowdownMultiplier=4 \
  --view
```

## 🔄 Hot Reload Mobile

Pour voir les changements instantanément sur mobile :

1. **Fast Refresh activé** (par défaut avec Next.js)
2. **WebSocket connection** maintenue
3. **Même réseau WiFi** obligatoire

Si le hot reload ne fonctionne pas :

```javascript
// next.config.js
module.exports = {
  webSocketServer: 'ws',
  env: {
    WEBSOCKET_URL: process.env.NODE_ENV === 'development'
      ? `ws://${YOUR_LOCAL_IP}:3000`
      : undefined
  }
}
```

## 📝 Checklist Finale

### Avant de déployer

- [ ] Testé sur iPhone (Safari)
- [ ] Testé sur Android (Chrome)
- [ ] Testé sur tablette
- [ ] Score Lighthouse Mobile > 90
- [ ] Pas d'erreurs dans la console
- [ ] Navigation fluide
- [ ] Formulaires fonctionnels
- [ ] Images optimisées
- [ ] Offline mode testé
- [ ] Performance sur 3G

### Commandes Utiles

```bash
# Analyser le bundle
npm run build:analyze

# Test Lighthouse local
npm run lighthouse:mobile

# Vérifier l'accessibilité
npx pa11y http://localhost:3000

# Test de performance
npx sitespeed.io http://localhost:3000 -b chrome --mobile
```

## 🚨 Problèmes Courants

### "Connexion refusée" sur mobile

1. Vérifiez que vous utilisez `0.0.0.0` pas `localhost`
2. Désactivez le firewall temporairement
3. Vérifiez que vous êtes sur le même réseau

### Animations saccadées

1. Utilisez `transform` au lieu de `left/top`
2. Ajoutez `will-change` aux éléments animés
3. Utilisez `transform: translateZ(0)` pour GPU

### Clavier cache le contenu

```css
/* Fix pour le viewport avec clavier */
.keyboard-open {
  height: calc(100vh - 260px); /* Hauteur approximative du clavier */
}
```

```javascript
// Détection du clavier
const input = document.querySelector('input');
input.addEventListener('focus', () => {
  document.body.classList.add('keyboard-open');
});
input.addEventListener('blur', () => {
  document.body.classList.remove('keyboard-open');
});
```