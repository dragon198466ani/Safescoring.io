"use client";

import Link from "next/link";

/**
 * SetupVigilance - Combined security alerts and setup weaknesses
 * - Security alerts for products (recent incidents)
 * - Setup weaknesses (weak pillars, identified risks)
 */

const WEAKNESS_ICONS = {
  weak_pillar: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  no_hardware: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  single_exchange: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  custody_risk: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  ),
};

const SEVERITY_STYLES = {
  critical: "bg-red-500/15 border-red-500/30 text-red-400",
  high: "bg-orange-500/15 border-orange-500/30 text-orange-400",
  medium: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  low: "bg-blue-500/15 border-blue-500/30 text-blue-400",
};

function SecurityAlert({ incident }) {
  const severity = incident.severity || 'medium';
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;

  return (
    <div className={`p-3 rounded-lg border ${styles}`}>
      <div className="flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{incident.product_name || 'Product'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded uppercase font-medium ${styles}`}>
              {severity}
            </span>
          </div>
          <p className="text-xs text-base-content/70 line-clamp-2">{incident.title || incident.description}</p>
          {incident.date && (
            <p className="text-xs text-base-content/40 mt-1">
              {new Date(incident.date).toLocaleDateString('en-US')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WeaknessItem({ weakness }) {
  const icon = WEAKNESS_ICONS[weakness.type] || WEAKNESS_ICONS.weak_pillar;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-base-300/50 border border-base-content/5">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{weakness.title || weakness.type}</p>
        <p className="text-xs text-base-content/60 mt-0.5">{weakness.recommendation}</p>
      </div>
    </div>
  );
}

export default function SetupVigilance({ incidents = [], weaknesses = [], isPaid = false, onUpgradeClick }) {
  const hasAlerts = incidents.length > 0;
  const hasWeaknesses = weaknesses.length > 0;
  // Free users see summary only, paid see all details
  const visibleIncidents = isPaid ? incidents : incidents.slice(0, 1);
  const visibleWeaknesses = isPaid ? weaknesses : weaknesses.slice(0, 1);
  const hiddenCount = (incidents.length - visibleIncidents.length) + (weaknesses.length - visibleWeaknesses.length);

  if (!hasAlerts && !hasWeaknesses) {
    return (
      <div className="bg-base-200 rounded-xl p-5 border border-base-300">
        <div className="flex items-center gap-3 text-green-400">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">No alerts</p>
            <p className="text-xs text-base-content/50">Your setup has no identified risks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Attention Points
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
          {incidents.length + weaknesses.length}
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Security incidents */}
        {hasAlerts && (
          <div>
            <h4 className="text-xs font-medium text-base-content/50 uppercase tracking-wide mb-2">
              Security Alerts
            </h4>
            <div className="space-y-2">
              {visibleIncidents.map((incident, idx) => (
                <SecurityAlert key={incident.id || idx} incident={incident} />
              ))}
            </div>
          </div>
        )}

        {/* Setup weaknesses */}
        {hasWeaknesses && (
          <div>
            <h4 className="text-xs font-medium text-base-content/50 uppercase tracking-wide mb-2">
              Setup Weaknesses
            </h4>
            <div className="space-y-2">
              {visibleWeaknesses.map((weakness, idx) => (
                <WeaknessItem key={idx} weakness={weakness} />
              ))}
            </div>
          </div>
        )}

        {/* Pro upgrade teaser for hidden content */}
        {hiddenCount > 0 && (
          <button
            onClick={onUpgradeClick}
            className="w-full p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="text-sm font-medium">+{hiddenCount} hidden alerts</span>
              <span className="badge badge-xs bg-purple-500 text-white border-0">Pro</span>
            </div>
            <p className="text-xs text-purple-400/60 mt-1">Unlock full analysis</p>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 flex items-center justify-between">
        <Link href="/incidents" className="text-xs text-primary hover:underline">
          View all incidents →
        </Link>
        {!isPaid && (
          <span className="badge badge-xs bg-purple-500/20 text-purple-400 border-0">Pro for details</span>
        )}
      </div>
    </div>
  );
}
