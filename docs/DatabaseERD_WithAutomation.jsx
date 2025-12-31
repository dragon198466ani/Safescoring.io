import React, { useState } from 'react';
import { Database, Key, Link2, ArrowRight, ArrowDown, Zap, Users, Shield, Bell, CreditCard, Settings, FileText, AlertTriangle, Cloud, Cpu, Globe, RefreshCw, Bot, Code, Server } from 'lucide-react';

export default function DatabaseERDWithAutomation() {
  const [activeView, setActiveView] = useState('all');

  const views = [
    { id: 'all', label: '🗄️ Toutes les Tables', color: 'bg-slate-600' },
    { id: 'relations', label: '🔗 Relations', color: 'bg-blue-600' },
    { id: 'automation', label: '🤖 Pipeline Automatisation', color: 'bg-green-600' },
    { id: 'triggers', label: '⚡ Triggers', color: 'bg-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-teal-400 mb-2">
          🗄️ SAFESCORING.IO - Database ERD + Automatisation
        </h1>
        <p className="text-slate-400">Schéma complet avec pipeline IA gratuit</p>
        <div className="flex justify-center gap-4 mt-2 text-sm text-slate-500">
          <span>📊 195 produits</span>
          <span>•</span>
          <span>📋 911 normes</span>
          <span>•</span>
          <span>✅ 177K évaluations</span>
          <span>•</span>
          <span className="text-green-400">💰 0€/mois (gratuit)</span>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === view.id 
                ? `${view.color} text-white scale-105` 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* ============================================ */}
        {/* LÉGENDE */}
        {/* ============================================ */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-bold text-slate-400 mb-3">📋 LÉGENDE</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300">PK = Clé Primaire</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-teal-400" />
              <span className="text-slate-300">FK = Clé Étrangère</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">───▶</span>
              <span className="text-slate-300">1:N (One to Many)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">◀──▶</span>
              <span className="text-slate-300">N:M (Many to Many)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-600 rounded text-xs">JSONB</span>
              <span className="text-slate-300">Données structurées</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-orange-600 rounded text-xs">TRIGGER</span>
              <span className="text-slate-300">Automatique</span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* PIPELINE D'AUTOMATISATION GRATUIT */}
        {/* ============================================ */}
        {(activeView === 'all' || activeView === 'automation') && (
          <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 rounded-2xl p-6 border border-green-500/30">
            <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
              <Bot className="w-6 h-6" />
              🤖 PIPELINE D'AUTOMATISATION MENSUEL (100% GRATUIT)
            </h2>

            {/* Flow Diagram */}
            <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
                {/* Step 1: Sources */}
                <PipelineStep 
                  icon="🌐"
                  title="1. SCRAPING"
                  subtitle="Playwright"
                  items={["Sites fabricants", "Pages specs", "Prix actuels"]}
                  color="blue"
                  cost="0€"
                />
                
                <PipelineArrow />
                
                {/* Step 2: Extraction */}
                <PipelineStep 
                  icon="🔍"
                  title="2. EXTRACTION"
                  subtitle="Gemini API"
                  items={["Parse HTML→JSON", "1M tokens/jour", "60 req/min"]}
                  color="purple"
                  cost="0€"
                />
                
                <PipelineArrow />
                
                {/* Step 3: Evaluation */}
                <PipelineStep 
                  icon="🧮"
                  title="3. ÉVALUATION"
                  subtitle="Groq API"
                  items={["911 normes SAFE", "Llama 3.3 70B", "30 req/min"]}
                  color="orange"
                  cost="0€"
                />
                
                <PipelineArrow />
                
                {/* Step 4: Backup */}
                <PipelineStep 
                  icon="💾"
                  title="4. BACKUP"
                  subtitle="Ollama Local"
                  items={["100% offline", "Llama 3.2", "Illimité"]}
                  color="slate"
                  cost="0€"
                />
                
                <PipelineArrow />
                
                {/* Step 5: Database */}
                <PipelineStep 
                  icon="🗄️"
                  title="5. SUPABASE"
                  subtitle="PostgreSQL"
                  items={["Upsert evals", "Trigger scores", "500MB gratuit"]}
                  color="teal"
                  cost="0€"
                />
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <ServiceCard 
                name="Playwright"
                type="Scraping"
                limits="Illimité"
                speed="~2 sec/page"
                icon="🌐"
              />
              <ServiceCard 
                name="Gemini 1.5"
                type="Extraction"
                limits="1M tokens/jour"
                speed="~1 sec"
                icon="🔮"
              />
              <ServiceCard 
                name="Groq"
                type="Évaluation"
                limits="30 req/min"
                speed="500 tok/sec"
                icon="⚡"
              />
              <ServiceCard 
                name="Ollama"
                type="Backup local"
                limits="Illimité"
                speed="~30 tok/sec"
                icon="🖥️"
              />
              <ServiceCard 
                name="Supabase"
                type="Database"
                limits="500MB gratuit"
                speed="< 100ms"
                icon="🐘"
              />
            </div>

            {/* Calcul mensuel */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-teal-400 font-bold mb-3">📊 Calcul pour 195 produits/mois</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400">Scraping</p>
                  <p className="text-2xl font-bold text-white">195</p>
                  <p className="text-xs text-slate-500">pages (~6 min)</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400">Extraction</p>
                  <p className="text-2xl font-bold text-white">195</p>
                  <p className="text-xs text-slate-500">~500K tokens</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400">Évaluation</p>
                  <p className="text-2xl font-bold text-white">~4K</p>
                  <p className="text-xs text-slate-500">requêtes (~2h)</p>
                </div>
                <div className="bg-green-900/50 rounded-lg p-3 border border-green-500/30">
                  <p className="text-green-400">TOTAL</p>
                  <p className="text-2xl font-bold text-green-400">0€</p>
                  <p className="text-xs text-green-400/70">100% gratuit!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SCHÉMA ERD PRINCIPAL */}
        {/* ============================================ */}
        {(activeView === 'all' || activeView === 'relations') && (
          <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
              <Database className="w-6 h-6" />
              🗄️ SCHÉMA ENTITÉ-RELATION
            </h2>

            {/* ERD Grid */}
            <div className="grid grid-cols-4 gap-6 min-w-[1000px] overflow-x-auto">
              
              {/* Colonne 1: Auth & Plans */}
              <div className="space-y-4">
                <div className="text-center text-slate-500 text-xs font-bold pb-2 border-b border-slate-700">
                  👤 UTILISATEURS & PLANS
                </div>
                
                <TableCard
                  name="auth.users"
                  subtitle="Supabase Auth"
                  color="slate"
                  columns={[
                    { name: 'id', type: 'UUID', pk: true },
                    { name: 'email', type: 'VARCHAR' },
                    { name: 'created_at', type: 'TIMESTAMP' },
                  ]}
                />

                <TableCard
                  name="subscription_plans"
                  color="purple"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'code', type: 'VARCHAR', note: 'free/basic/pro' },
                    { name: 'max_setups', type: 'INT' },
                    { name: 'max_products', type: 'INT' },
                    { name: 'price_monthly', type: 'DECIMAL' },
                  ]}
                />

                <TableCard
                  name="subscriptions"
                  color="teal"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'user_id', type: 'UUID', fk: 'auth.users' },
                    { name: 'plan_id', type: 'INT', fk: 'subscription_plans' },
                    { name: 'stripe_id', type: 'VARCHAR' },
                    { name: 'status', type: 'VARCHAR' },
                  ]}
                />
              </div>

              {/* Colonne 2: Produits */}
              <div className="space-y-4">
                <div className="text-center text-slate-500 text-xs font-bold pb-2 border-b border-slate-700">
                  📦 PRODUITS
                </div>

                <TableCard
                  name="product_types"
                  color="blue"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'code', type: 'VARCHAR' },
                    { name: 'name_fr', type: 'VARCHAR' },
                    { name: 'category', type: 'VARCHAR' },
                  ]}
                />

                <TableCard
                  name="brands"
                  color="blue"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'name', type: 'VARCHAR' },
                    { name: 'logo_url', type: 'VARCHAR' },
                  ]}
                />

                <TableCard
                  name="products"
                  color="blue"
                  highlight
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'slug', type: 'VARCHAR' },
                    { name: 'name', type: 'VARCHAR' },
                    { name: 'type_id', type: 'INT', fk: 'product_types' },
                    { name: 'brand_id', type: 'INT', fk: 'brands' },
                    { name: 'specs', type: 'JSONB', note: 'Via Gemini' },
                    { name: 'scores', type: 'JSONB', note: 'Auto-calculé' },
                  ]}
                />
              </div>

              {/* Colonne 3: Normes & Évaluations */}
              <div className="space-y-4">
                <div className="text-center text-slate-500 text-xs font-bold pb-2 border-b border-slate-700">
                  📋 NORMES & ÉVALUATIONS
                </div>

                <TableCard
                  name="norms"
                  color="blue"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'code', type: 'VARCHAR' },
                    { name: 'pillar', type: 'CHAR(1)', note: 'S/A/F/E' },
                    { name: 'description', type: 'TEXT' },
                    { name: 'is_essential', type: 'BOOL' },
                  ]}
                />

                <TableCard
                  name="norm_applicability"
                  color="blue"
                  columns={[
                    { name: 'norm_id', type: 'INT', fk: 'norms', pk: true },
                    { name: 'type_id', type: 'INT', fk: 'product_types', pk: true },
                    { name: 'is_applicable', type: 'BOOL' },
                  ]}
                  note="Table pivot N:M"
                />

                <TableCard
                  name="evaluations"
                  color="green"
                  highlight
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'product_id', type: 'INT', fk: 'products' },
                    { name: 'norm_id', type: 'INT', fk: 'norms' },
                    { name: 'result', type: 'VARCHAR', note: 'YES/NO/N/A' },
                    { name: 'evaluated_by', type: 'VARCHAR', note: 'groq/gemini' },
                    { name: 'evaluated_at', type: 'TIMESTAMP' },
                  ]}
                  note="⚡ Via Groq API (gratuit)"
                />
              </div>

              {/* Colonne 4: Setups & Alertes */}
              <div className="space-y-4">
                <div className="text-center text-slate-500 text-xs font-bold pb-2 border-b border-slate-700">
                  🔧 SETUPS & ALERTES
                </div>

                <TableCard
                  name="user_setups"
                  color="teal"
                  highlight
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'user_id', type: 'UUID', fk: 'auth.users' },
                    { name: 'name', type: 'VARCHAR' },
                    { name: 'products', type: 'JSONB[]', note: '[{id,role}]' },
                    { name: 'combined_score', type: 'JSONB' },
                  ]}
                />

                <TableCard
                  name="security_alerts"
                  color="orange"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'cve_id', type: 'VARCHAR' },
                    { name: 'severity', type: 'VARCHAR' },
                    { name: 'affected_ids', type: 'INT[]', fk: 'products[]' },
                    { name: 'is_published', type: 'BOOL' },
                  ]}
                  note="Via NVD API (gratuit)"
                />

                <TableCard
                  name="alert_user_matches"
                  color="orange"
                  columns={[
                    { name: 'id', type: 'SERIAL', pk: true },
                    { name: 'alert_id', type: 'INT', fk: 'security_alerts' },
                    { name: 'user_id', type: 'UUID', fk: 'auth.users' },
                    { name: 'setup_id', type: 'INT', fk: 'user_setups' },
                    { name: 'notified_at', type: 'TIMESTAMP' },
                  ]}
                  note="Table pivot triple"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* RELATIONS DÉTAILLÉES */}
        {/* ============================================ */}
        {(activeView === 'all' || activeView === 'relations') && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-teal-400 mb-4">🔗 RELATIONS ENTRE TABLES</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MVP1 */}
              <div className="space-y-2">
                <h4 className="text-blue-400 font-bold text-sm">MVP1 - Data</h4>
                <RelationRow from="products.type_id" to="product_types.id" type="N:1" />
                <RelationRow from="products.brand_id" to="brands.id" type="N:1" />
                <RelationRow from="evaluations.product_id" to="products.id" type="N:1" />
                <RelationRow from="evaluations.norm_id" to="norms.id" type="N:1" />
                <RelationRow from="norm_applicability" to="norms ↔ types" type="N:M" />
              </div>
              
              {/* MVP2 */}
              <div className="space-y-2">
                <h4 className="text-teal-400 font-bold text-sm">MVP2 - Business</h4>
                <RelationRow from="subscriptions.user_id" to="auth.users.id" type="N:1" />
                <RelationRow from="subscriptions.plan_id" to="plans.id" type="N:1" />
                <RelationRow from="user_setups.user_id" to="auth.users.id" type="N:1" />
                <RelationRow from="user_setups.products[]" to="products.id" type="JSONB" special />
                <RelationRow from="alerts.affected_ids[]" to="products.id" type="INT[]" special />
                <RelationRow from="alert_user_matches" to="alert ↔ user ↔ setup" type="N:M:M" />
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TRIGGERS & AUTOMATISATIONS */}
        {/* ============================================ */}
        {(activeView === 'all' || activeView === 'triggers') && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-orange-500/30">
            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              ⚡ CHAÎNES DE TRIGGERS AUTOMATIQUES
            </h3>
            
            <div className="space-y-6">
              {/* Chaîne 1: Pipeline IA → Évaluations → Scores */}
              <TriggerChain
                title="CHAÎNE 1: Pipeline IA Mensuel → Scores Produits"
                color="green"
                steps={[
                  { icon: "🌐", label: "Playwright", desc: "Scrape pages" },
                  { icon: "🔮", label: "Gemini", desc: "Extract specs" },
                  { icon: "⚡", label: "Groq", desc: "Evaluate norms" },
                  { icon: "💾", label: "UPSERT", desc: "evaluations", trigger: true },
                  { icon: "🔄", label: "TRIGGER", desc: "recalc_scores()", trigger: true },
                  { icon: "📦", label: "products", desc: "scores JSONB" },
                ]}
              />
              
              {/* Chaîne 2: Scores Produits → Scores Setups */}
              <TriggerChain
                title="CHAÎNE 2: Scores Produits → Scores Setups Combinés"
                color="blue"
                steps={[
                  { icon: "📦", label: "products", desc: "scores UPDATE" },
                  { icon: "🔄", label: "TRIGGER", desc: "recalc_setups()", trigger: true },
                  { icon: "🔧", label: "user_setups", desc: "combined_score" },
                ]}
              />
              
              {/* Chaîne 3: Alerte CVE → Notifications */}
              <TriggerChain
                title="CHAÎNE 3: Alerte CVE → Match Users → Notifications"
                color="orange"
                steps={[
                  { icon: "🔒", label: "NVD API", desc: "Fetch CVEs" },
                  { icon: "🚨", label: "alerts", desc: "is_published=true" },
                  { icon: "🔄", label: "TRIGGER", desc: "match_alerts()", trigger: true },
                  { icon: "👥", label: "matches", desc: "INSERT" },
                  { icon: "🔄", label: "TRIGGER", desc: "send_notif()", trigger: true },
                  { icon: "📧", label: "Email", desc: "Resend" },
                ]}
              />
              
              {/* Chaîne 4: Création Setup → Vérification Limites */}
              <TriggerChain
                title="CHAÎNE 4: Création Setup → Vérification Plan → Score"
                color="purple"
                steps={[
                  { icon: "👤", label: "User", desc: "Create setup" },
                  { icon: "🔄", label: "BEFORE", desc: "check_limit()", trigger: true },
                  { icon: "⚖️", label: "Check", desc: "current < max?" },
                  { icon: "✅", label: "OK", desc: "→ calculate" },
                  { icon: "🧮", label: "TRIGGER", desc: "calc_score()", trigger: true },
                  { icon: "💾", label: "INSERT", desc: "with score" },
                ]}
              />
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TABLES AUTOMATISATION */}
        {/* ============================================ */}
        {(activeView === 'automation') && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-green-500/30">
            <h3 className="text-lg font-bold text-green-400 mb-4">📊 TABLES DE SUIVI AUTOMATISATION</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <TableCard
                name="automation_logs"
                color="green"
                columns={[
                  { name: 'id', type: 'SERIAL', pk: true },
                  { name: 'run_date', type: 'TIMESTAMP' },
                  { name: 'products_updated', type: 'INT' },
                  { name: 'evaluations_count', type: 'INT' },
                  { name: 'ai_service', type: 'VARCHAR', note: 'groq/gemini' },
                  { name: 'duration_sec', type: 'INT' },
                  { name: 'errors', type: 'JSONB' },
                ]}
              />
              
              <TableCard
                name="scrape_cache"
                color="green"
                columns={[
                  { name: 'id', type: 'SERIAL', pk: true },
                  { name: 'product_id', type: 'INT', fk: 'products' },
                  { name: 'url', type: 'VARCHAR' },
                  { name: 'content_hash', type: 'VARCHAR' },
                  { name: 'scraped_at', type: 'TIMESTAMP' },
                  { name: 'raw_specs', type: 'JSONB' },
                ]}
                note="Cache pour éviter re-scrape"
              />
              
              <TableCard
                name="ai_usage_stats"
                color="green"
                columns={[
                  { name: 'id', type: 'SERIAL', pk: true },
                  { name: 'date', type: 'DATE' },
                  { name: 'service', type: 'VARCHAR', note: 'groq/gemini/ollama' },
                  { name: 'requests', type: 'INT' },
                  { name: 'tokens_used', type: 'INT' },
                  { name: 'cost_usd', type: 'DECIMAL', note: 'Toujours 0!' },
                ]}
                note="Suivi des quotas gratuits"
              />
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SCHÉMA ASCII COMPLET */}
        {/* ============================================ */}
        {(activeView === 'all' || activeView === 'relations') && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 font-mono text-xs overflow-x-auto">
            <h3 className="text-lg font-bold text-yellow-400 mb-4 font-sans">📐 SCHÉMA RELATIONNEL COMPLET</h3>
            <pre className="text-slate-300 whitespace-pre">{`
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                        │
│   🤖 PIPELINE IA MENSUEL (GRATUIT)                                                                     │
│   ════════════════════════════════                                                                     │
│                                                                                                        │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                        │
│   │Playwright│───▶│ Gemini   │───▶│  Groq    │───▶│ Ollama   │───▶│ Supabase │                        │
│   │ Scraping │    │Extract AI│    │Eval SAFE │    │ Backup   │    │PostgreSQL│                        │
│   │   0€     │    │   0€     │    │   0€     │    │   0€     │    │   0€     │                        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘                        │
│                                                                        │                              │
│                                                                        ▼                              │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   🔐 auth.users                        📦 products                          🔧 user_setups             │
│   ┌─────────────┐                      ┌─────────────────┐                  ┌─────────────────┐        │
│   │ id (PK)     │◄─────────┐           │ id (PK)         │◄────────────┐    │ id (PK)         │        │
│   │ email       │          │           │ slug            │             │    │ user_id (FK)────┼───┐    │
│   └──────┬──────┘          │           │ type_id (FK)────┼───┐         │    │ products[] ─────┼───┼─┐  │
│          │                 │           │ brand_id (FK)───┼─┐ │         │    │ combined_score  │   │ │  │
│          │ 1:N             │           │ specs (JSONB)   │ │ │         │    └────────┬────────┘   │ │  │
│          │                 │           │ scores (JSONB)  │ │ │         │             │            │ │  │
│          │                 │           └────────┬────────┘ │ │         │             │ JSONB[]    │ │  │
│          │                 │                    │          │ │         │             │ [{id,role}]│ │  │
│   ┌──────▼──────┐          │                    │          │ │         │             ▼            │ │  │
│   │subscriptions│          │                    │ 1:N      │ │         │    ┌────────────────┐   │ │  │
│   │─────────────│          │                    │          │ │         └────│    products    │   │ │  │
│   │ user_id(FK) │          │                    ▼          │ │              │                │◄──┘ │  │
│   │ plan_id(FK)─┼───┐      │           ┌───────────────┐   │ │              └────────────────┘     │  │
│   └─────────────┘   │      │           │  evaluations  │   │ │                                     │  │
│                     │      │           │───────────────│   │ │                                     │  │
│   ┌─────────────┐   │      │           │ product_id(FK)│───┘ │              🔗 RELATIONS JSONB     │  │
│   │   plans     │◄──┘      │           │ norm_id (FK)──┼───┐ │              ═══════════════════    │  │
│   │─────────────│          │           │ result        │   │ │                                     │  │
│   │ code        │          │           │ evaluated_by  │   │ │      user_setups.products[]:       │  │
│   │ max_setups  │          │           │ (groq/gemini) │   │ │      ┌─────────────────────────┐   │  │
│   │ max_products│          │           └───────────────┘   │ │      │ [{                      │   │  │
│   └─────────────┘          │                    ▲          │ │      │   "product_id": 1,      │   │  │
│                            │                    │          │ │      │   "role": "primary"     │   │  │
│                            │           ┌────────┴───────┐  │ │      │ }, {                    │   │  │
│   🚨 security_alerts       │           │     norms      │  │ │      │   "product_id": 5,      │   │  │
│   ┌─────────────────┐      │           │────────────────│  │ │      │   "role": "backup"      │   │  │
│   │ id (PK)         │      │           │ id (PK)        │◄─┘ │      │ }]                      │   │  │
│   │ cve_id          │      │           │ code           │    │      └─────────────────────────┘   │  │
│   │ severity        │      │           │ pillar (S/A/F/E│    │                                     │  │
│   │ affected_ids[]──┼──────┼───────────│ description    │    │                                     │  │
│   │ is_published    │      │           └────────┬───────┘    │                                     │  │
│   └────────┬────────┘      │                    │            │                                     │  │
│            │               │                    │ N:M        │                                     │  │
│            │ 1:N           │                    ▼            │                                     │  │
│            ▼               │           ┌────────────────┐    │                                     │  │
│   ┌─────────────────┐      │           │norm_applicabil │    │                                     │  │
│   │alert_user_match │      │           │────────────────│    │                                     │  │
│   │─────────────────│      │           │ norm_id (PK/FK)│    │                                     │  │
│   │ alert_id (FK)───┼──────┤           │ type_id (PK/FK)│────┼──▶ product_types                    │  │
│   │ user_id (FK)────┼──────┘           │ is_applicable  │    │    ┌─────────────┐                  │  │
│   │ setup_id (FK)───┼──────────────────┼────────────────┘    │    │ id (PK)     │                  │  │
│   │ notified_at     │                  │                     └───▶│ code        │                  │  │
│   └─────────────────┘                  │                          │ name_fr     │                  │  │
│                                        │                          └─────────────┘                  │  │
│                                        │                                                           │  │
│                                        │                          brands                           │  │
│                                        │                          ┌─────────────┐                  │  │
│                                        └─────────────────────────▶│ id (PK)     │                  │  │
│                                                                   │ name        │                  │  │
│                                                                   │ logo_url    │                  │  │
│                                                                   └─────────────┘                  │  │
│                                                                                                    │  │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
                                                                                                        │
`}</pre>
          </div>
        )}

        {/* ============================================ */}
        {/* FOOTER */}
        {/* ============================================ */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <span>🏗️ Stack: <strong className="text-white">Supabase + PostgreSQL</strong></span>
            <span>🤖 IA: <strong className="text-green-400">Groq + Gemini (0€)</strong></span>
            <span>🌐 Scraping: <strong className="text-blue-400">Playwright</strong></span>
            <span>⚡ Triggers: <strong className="text-orange-400">7 automatiques</strong></span>
            <span>💰 Coût: <strong className="text-green-400">0€/mois</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANTS
// ============================================

function PipelineStep({ icon, title, subtitle, items, color, cost }) {
  const colors = {
    blue: 'border-blue-500/50 bg-blue-900/30',
    purple: 'border-purple-500/50 bg-purple-900/30',
    orange: 'border-orange-500/50 bg-orange-900/30',
    teal: 'border-teal-500/50 bg-teal-900/30',
    slate: 'border-slate-500/50 bg-slate-800/50',
    green: 'border-green-500/50 bg-green-900/30',
  };

  return (
    <div className={`min-w-[140px] rounded-xl p-4 border ${colors[color]}`}>
      <div className="text-3xl text-center mb-2">{icon}</div>
      <h4 className="font-bold text-white text-center text-sm">{title}</h4>
      <p className="text-xs text-slate-400 text-center mb-2">{subtitle}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <p key={i} className="text-xs text-slate-500 text-center">• {item}</p>
        ))}
      </div>
      <div className="mt-2 text-center">
        <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded">{cost}</span>
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex-shrink-0">
      <ArrowRight className="w-6 h-6 text-teal-500" />
    </div>
  );
}

function ServiceCard({ name, type, limits, speed, icon }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-white text-sm">{name}</span>
      </div>
      <p className="text-xs text-slate-400">{type}</p>
      <p className="text-xs text-teal-400">{limits}</p>
      <p className="text-xs text-slate-500">{speed}</p>
    </div>
  );
}

function TableCard({ name, subtitle, color, columns, note, highlight }) {
  const colors = {
    slate: 'border-slate-500/50',
    blue: 'border-blue-500/50',
    teal: 'border-teal-500/50',
    purple: 'border-purple-500/50',
    orange: 'border-orange-500/50',
    green: 'border-green-500/50',
  };
  
  const headerColors = {
    slate: 'bg-slate-700',
    blue: 'bg-blue-700',
    teal: 'bg-teal-700',
    purple: 'bg-purple-700',
    orange: 'bg-orange-700',
    green: 'bg-green-700',
  };

  return (
    <div className={`rounded-lg border ${colors[color]} ${highlight ? 'ring-2 ring-green-500/50' : ''} overflow-hidden bg-slate-900/50`}>
      <div className={`${headerColors[color]} px-3 py-1.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3" />
          <span className="font-bold text-xs">{name}</span>
        </div>
        {subtitle && <span className="text-xs text-slate-300">{subtitle}</span>}
      </div>
      
      <div className="p-2 space-y-0.5">
        {columns.map((col, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            {col.pk && <Key className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
            {col.fk && !col.pk && <Link2 className="w-3 h-3 text-teal-400 flex-shrink-0" />}
            {!col.pk && !col.fk && <span className="w-3" />}
            <span className={`font-mono ${col.pk ? 'text-yellow-300' : col.fk ? 'text-teal-300' : 'text-slate-300'}`}>
              {col.name}
            </span>
            <span className="text-slate-600 flex-1 text-right">{col.type}</span>
            {col.note && <span className="text-slate-500 italic ml-1">{col.note}</span>}
          </div>
        ))}
      </div>
      
      {note && (
        <div className="px-2 pb-1.5 border-t border-slate-700">
          <span className="text-xs text-green-400">{note}</span>
        </div>
      )}
    </div>
  );
}

function RelationRow({ from, to, type, special }) {
  const typeColors = {
    '1:1': 'bg-green-600',
    '1:N': 'bg-blue-600',
    'N:1': 'bg-blue-600',
    'N:M': 'bg-purple-600',
    'N:M:M': 'bg-purple-600',
    'JSONB': 'bg-orange-600',
    'INT[]': 'bg-orange-600',
  };

  return (
    <div className={`flex items-center gap-2 p-1.5 rounded text-xs ${special ? 'bg-orange-900/20' : 'bg-slate-900/30'}`}>
      <span className={`${typeColors[type]} text-white font-bold px-1.5 py-0.5 rounded text-xs`}>{type}</span>
      <span className="text-teal-400 font-mono">{from}</span>
      <ArrowRight className="w-3 h-3 text-slate-500" />
      <span className="text-blue-400 font-mono">{to}</span>
    </div>
  );
}

function TriggerChain({ title, color, steps }) {
  const borderColors = {
    green: 'border-green-500/30',
    blue: 'border-blue-500/30',
    orange: 'border-orange-500/30',
    purple: 'border-purple-500/30',
  };

  return (
    <div className={`bg-slate-900/50 rounded-lg p-4 border ${borderColors[color]}`}>
      <h4 className="text-sm font-bold text-white mb-3">{title}</h4>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div className={`flex flex-col items-center min-w-[70px] p-2 rounded-lg ${
              step.trigger ? 'bg-orange-900/30 border border-orange-500/30' : 'bg-slate-800/50'
            }`}>
              <span className="text-lg">{step.icon}</span>
              <span className="text-xs text-white font-medium text-center">{step.label}</span>
              <span className="text-xs text-slate-500 text-center">{step.desc}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
