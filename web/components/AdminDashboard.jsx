'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * SafeScoring Admin Dashboard
 * ===========================
 * Interface pour gérer la queue de tâches, les claims et déclencher des actions.
 */

// Create Supabase client for browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AdminDashboard() {
  const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [claimStats, setClaimStats] = useState({ pending: 0, dns_verified: 0 });
  const [claims, setClaims] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Charger les stats
  const loadStats = useCallback(async () => {
    try {
      // Stats de la queue
      const { data: tasks } = await supabase
        .from('task_queue')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
      tasks?.forEach(t => {
        if (counts[t.status] !== undefined) {
          counts[t.status]++;
        }
      });
      setStats(counts);

      // Tâches récentes
      const { data: recent } = await supabase
        .from('task_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);

      setRecentTasks(recent || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [supabase]);

  // Charger les claims
  const loadClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/claims');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
        setClaimStats(data.stats || { pending: 0, dns_verified: 0 });
      }
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  }, []);

  // Gérer un claim
  const handleClaim = async (id, status, notes = '') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_notes: notes }),
      });

      if (res.ok) {
        showMessage(`Claim ${status} avec succès`);
        loadClaims();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Erreur', 'error');
      }
    } catch (error) {
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadClaims();
    const interval = setInterval(() => {
      loadStats();
      loadClaims();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadStats, loadClaims]);

  // Afficher un message temporaire
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Actions
  const triggerAction = async (action) => {
    setLoading(true);
    try {
      switch (action) {
        case 'recalculate_all': {
          const { data: products } = await supabase
            .from('products')
            .select('id')
            .eq('is_active', true);

          for (const p of products || []) {
            await supabase.from('task_queue').insert({
              task_type: 'calculate_score',
              target_id: p.id,
              target_type: 'product',
              priority: 5
            });
          }
          showMessage(`${products?.length || 0} tâches de recalcul ajoutées`);
          break;
        }

        case 'evaluate_all': {
          const { data: products } = await supabase
            .from('products')
            .select('id')
            .eq('is_active', true);

          for (const p of products || []) {
            await supabase.from('task_queue').insert({
              task_type: 'evaluate_product',
              target_id: p.id,
              target_type: 'product',
              priority: 4
            });
          }
          showMessage(`${products?.length || 0} tâches d'évaluation ajoutées`);
          break;
        }

        case 'scrape_norms': {
          const { data: norms } = await supabase
            .from('norms')
            .select('id, official_url')
            .not('official_url', 'is', null);

          for (const n of norms || []) {
            await supabase.from('task_queue').insert({
              task_type: 'scrape_norm',
              target_id: n.id,
              target_type: 'norm',
              priority: 3,
              payload: { url: n.official_url }
            });
          }
          showMessage(`${norms?.length || 0} normes à scraper`);
          break;
        }

        case 'retry_failed': {
          await supabase
            .from('task_queue')
            .update({ status: 'pending', retries: 0, error: null })
            .eq('status', 'failed');
          showMessage('Tâches échouées remises en queue');
          break;
        }

        case 'clear_failed': {
          await supabase.from('task_queue').delete().eq('status', 'failed');
          showMessage('Tâches échouées supprimées');
          break;
        }

        case 'clear_completed': {
          await supabase.from('task_queue').delete().eq('status', 'completed');
          showMessage('Tâches terminées supprimées');
          break;
        }
      }

      loadStats();
    } catch (error) {
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={() => { loadStats(); loadClaims(); }}
          className="btn btn-ghost btn-sm"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'tasks' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks Queue
        </button>
        <button
          className={`tab ${activeTab === 'claims' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Claims
          {(claimStats.pending + claimStats.dns_verified) > 0 && (
            <span className="badge badge-primary badge-sm ml-2">
              {claimStats.pending + claimStats.dns_verified}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tasks' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="En attente"
          value={stats.pending}
          color="warning"
          icon="⏳"
        />
        <StatCard
          label="En cours"
          value={stats.processing}
          color="info"
          icon="🔄"
        />
        <StatCard
          label="Terminées (24h)"
          value={stats.completed}
          color="success"
          icon="✅"
        />
        <StatCard
          label="Échouées"
          value={stats.failed}
          color="error"
          icon="❌"
        />
      </div>

      {/* Actions rapides */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Actions rapides</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => triggerAction('recalculate_all')}
              disabled={loading}
              className="btn btn-primary btn-sm"
            >
              🔄 Recalculer scores
            </button>
            <button
              onClick={() => triggerAction('evaluate_all')}
              disabled={loading}
              className="btn btn-secondary btn-sm"
            >
              🧮 Réévaluer produits
            </button>
            <button
              onClick={() => triggerAction('scrape_norms')}
              disabled={loading}
              className="btn btn-accent btn-sm"
            >
              📄 Scraper normes
            </button>
            <div className="divider divider-horizontal"></div>
            <button
              onClick={() => triggerAction('retry_failed')}
              disabled={loading}
              className="btn btn-warning btn-sm"
            >
              🔁 Réessayer échouées
            </button>
            <button
              onClick={() => triggerAction('clear_failed')}
              disabled={loading}
              className="btn btn-error btn-sm"
            >
              🗑️ Vider échouées
            </button>
            <button
              onClick={() => triggerAction('clear_completed')}
              disabled={loading}
              className="btn btn-ghost btn-sm"
            >
              🧹 Vider terminées
            </button>
          </div>
        </div>
      </div>

      {/* Formulaires d'ajout */}
      <div className="grid md:grid-cols-2 gap-4">
        <AddProductForm supabase={supabase} onAdd={loadStats} showMessage={showMessage} />
        <AddNormForm supabase={supabase} onAdd={loadStats} showMessage={showMessage} />
      </div>

      {/* Tâches récentes */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Tâches récentes</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Cible</th>
                  <th>Status</th>
                  <th>Créée</th>
                  <th>Erreur</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(task => (
                  <tr key={task.id} className="hover">
                    <td className="font-mono text-xs">{task.task_type}</td>
                    <td>{task.target_type} #{task.target_id}</td>
                    <td>
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="text-xs text-base-content/60">
                      {new Date(task.created_at).toLocaleTimeString()}
                    </td>
                    <td className="text-xs text-error max-w-xs truncate">
                      {task.error}
                    </td>
                  </tr>
                ))}
                {recentTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-base-content/50">
                      Aucune tâche récente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'claims' && (
        <div className="space-y-6">
          {/* Claims Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="En attente"
              value={claimStats.pending}
              color="warning"
              icon="📋"
            />
            <StatCard
              label="DNS Vérifié"
              value={claimStats.dns_verified}
              color="success"
              icon="✅"
            />
          </div>

          {/* Claims List */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg">Demandes de claim</h2>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Entreprise</th>
                      <th>Contact</th>
                      <th>Produit</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map(claim => (
                      <tr key={claim.id} className="hover">
                        <td>
                          <div className="font-medium">{claim.company_name}</div>
                          {claim.website && (
                            <a href={claim.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              {claim.website}
                            </a>
                          )}
                        </td>
                        <td>
                          <div>{claim.contact_name}</div>
                          <div className="text-xs text-base-content/60">{claim.email}</div>
                          <div className="text-xs text-base-content/50">{claim.role}</div>
                        </td>
                        <td>
                          {claim.products ? (
                            <span className="font-medium">{claim.products.name}</span>
                          ) : (
                            <span className="text-base-content/50">{claim.product_slug || 'N/A'}</span>
                          )}
                        </td>
                        <td>
                          <ClaimStatusBadge status={claim.status} dnsVerified={claim.dns_verified} domainMatch={claim.domain_match} />
                        </td>
                        <td className="text-xs text-base-content/60">
                          {new Date(claim.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {claim.status === 'pending' || claim.status === 'dns_verified' ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleClaim(claim.id, 'approved')}
                                disabled={loading}
                                className="btn btn-success btn-xs"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleClaim(claim.id, 'rejected')}
                                disabled={loading}
                                className="btn btn-error btn-xs"
                              >
                                Rejeter
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs ${claim.status === 'approved' ? 'text-success' : 'text-error'}`}>
                              {claim.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {claims.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-base-content/50">
                          Aucune demande de claim
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Composants utilitaires
// ============================================

function StatCard({ label, value, color, icon }) {
  const colorClasses = {
    warning: 'bg-warning/20 text-warning',
    info: 'bg-info/20 text-info',
    success: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
  };

  return (
    <div className={`card ${colorClasses[color]}`}>
      <div className="card-body p-4">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm flex items-center gap-2">
          <span>{icon}</span>
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'badge-warning',
    processing: 'badge-info',
    completed: 'badge-success',
    failed: 'badge-error',
  };

  return (
    <span className={`badge badge-sm ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

function ClaimStatusBadge({ status, dnsVerified, domainMatch }) {
  const statusConfig = {
    pending: { class: 'badge-warning', label: 'En attente' },
    dns_verified: { class: 'badge-info', label: 'DNS vérifié' },
    approved: { class: 'badge-success', label: 'Approuvé' },
    rejected: { class: 'badge-error', label: 'Rejeté' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex flex-col gap-1">
      <span className={`badge badge-sm ${config.class}`}>
        {config.label}
      </span>
      <div className="flex gap-1">
        {dnsVerified && (
          <span className="badge badge-xs badge-success" title="DNS vérifié">DNS</span>
        )}
        {domainMatch && (
          <span className="badge badge-xs badge-info" title="Email correspond au domaine">Email</span>
        )}
      </div>
    </div>
  );
}

function AddProductForm({ supabase, onAdd, showMessage }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Insert déclenche automatiquement les triggers!
      await supabase.from('products').insert({
        name: name.trim(),
        slug,
        urls: url.trim() ? [url.trim()] : [],
        is_active: true
      });

      setName('');
      setUrl('');
      showMessage(`Produit "${name}" ajouté! Traitement automatique lancé.`);
      onAdd();
    } catch (error) {
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-base">➕ Ajouter un produit</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du produit"
            className="input input-bordered input-sm w-full"
            required
          />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="URL officielle (optionnel)"
            className="input input-bordered input-sm w-full"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn btn-primary btn-sm w-full"
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddNormForm({ supabase, onAdd, showMessage }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [pillar, setPillar] = useState('Security');
  const [officialUrl, setOfficialUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return;

    setLoading(true);
    try {
      // Insert déclenche automatiquement scraping + évaluation!
      await supabase.from('norms').insert({
        code: code.trim().toUpperCase(),
        description: description.trim(),
        pillar,
        official_url: officialUrl.trim() || null
      });

      setCode('');
      setDescription('');
      setOfficialUrl('');
      showMessage(`Norme "${code}" ajoutée! Évaluation automatique lancée.`);
      onAdd();
    } catch (error) {
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-base">➕ Ajouter une norme</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Code (ex: SEC-042)"
              className="input input-bordered input-sm w-28"
              required
            />
            <select
              value={pillar}
              onChange={e => setPillar(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="Security">Security</option>
              <option value="Accessibility">Accessibility</option>
              <option value="Freedom">Freedom</option>
              <option value="Experience">Experience</option>
            </select>
          </div>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description de la norme"
            className="input input-bordered input-sm w-full"
            required
          />
          <input
            type="url"
            value={officialUrl}
            onChange={e => setOfficialUrl(e.target.value)}
            placeholder="URL doc officiel (optionnel)"
            className="input input-bordered input-sm w-full"
          />
          <button
            type="submit"
            disabled={loading || !code.trim() || !description.trim()}
            className="btn btn-success btn-sm w-full"
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}
