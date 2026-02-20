"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * ChurnDashboard Component
 * Admin dashboard for anti-churn analytics
 */
export default function ChurnDashboard() {
  const [period, setPeriod] = useState(30);

  const { data, error, isLoading } = useSWR(
    `/api/admin/analytics/churn?days=${period}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load analytics: {error.message}</span>
      </div>
    );
  }

  const { metrics, actionItems, usersNeedingIntervention } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Churn Prevention Dashboard</h2>
        <select
          className="select select-bordered"
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current MRR"
          value={`$${metrics?.currentMRR?.toLocaleString() || 0}`}
          change={metrics?.mrrGrowth}
          changeLabel="vs last month"
          color="primary"
        />
        <MetricCard
          title="Churn Rate"
          value={`${metrics?.churnRate || 0}%`}
          change={null}
          target="< 5%"
          color={metrics?.churnRate > 5 ? "error" : "success"}
        />
        <MetricCard
          title="Net Revenue Retention"
          value={`${metrics?.netRevenueRetention || 100}%`}
          target="> 100%"
          color={metrics?.netRevenueRetention >= 100 ? "success" : "warning"}
        />
        <MetricCard
          title="Save Rate"
          value={`${metrics?.cancellationSaveRate || 0}%`}
          subtext={`${metrics?.cancellationTotal || 0} attempts`}
          color="info"
        />
      </div>

      {/* Action Items */}
      {actionItems?.length > 0 && (
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="text-warning">Action Required</span>
            <span className="badge badge-warning">{actionItems.length}</span>
          </h3>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.priority === "critical"
                    ? "bg-error/10 border border-error"
                    : item.priority === "high"
                    ? "bg-warning/10 border border-warning"
                    : "bg-base-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={item.priority} />
                  <div>
                    <p className="font-medium">{item.message}</p>
                    <p className="text-sm text-base-content/60">
                      {item.count} users affected
                    </p>
                  </div>
                </div>
                <button className="btn btn-sm btn-primary">{item.action}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-4">User Health Distribution</h3>
          <div className="space-y-3">
            <HealthBar
              label="Healthy"
              count={metrics?.healthDistribution?.healthy || 0}
              total={
                Object.values(metrics?.healthDistribution || {}).reduce(
                  (a, b) => a + b,
                  0
                ) || 1
              }
              color="success"
            />
            <HealthBar
              label="At Risk"
              count={metrics?.healthDistribution?.at_risk || 0}
              total={
                Object.values(metrics?.healthDistribution || {}).reduce(
                  (a, b) => a + b,
                  0
                ) || 1
              }
              color="warning"
            />
            <HealthBar
              label="Danger"
              count={metrics?.healthDistribution?.danger || 0}
              total={
                Object.values(metrics?.healthDistribution || {}).reduce(
                  (a, b) => a + b,
                  0
                ) || 1
              }
              color="orange"
            />
            <HealthBar
              label="Critical"
              count={metrics?.healthDistribution?.critical || 0}
              total={
                Object.values(metrics?.healthDistribution || {}).reduce(
                  (a, b) => a + b,
                  0
                ) || 1
              }
              color="error"
            />
          </div>
          <p className="text-sm text-base-content/60 mt-3">
            Average health score: {metrics?.averageHealthScore || 0}/100
          </p>
        </div>

        {/* Top Cancel Reasons */}
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-4">Top Cancellation Reasons</h3>
          {metrics?.topCancelReasons?.length > 0 ? (
            <div className="space-y-2">
              {metrics.topCancelReasons.map((reason, i) => (
                <div
                  key={reason.reason}
                  className="flex items-center justify-between p-2 bg-base-100 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/60">{i + 1}.</span>
                    <span>{reason.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reason.count}</span>
                    <span className="text-sm text-base-content/60">
                      ({reason.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/60">No cancellations in this period</p>
          )}
        </div>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Dunning Recovery</h3>
          <div className="text-3xl font-bold text-primary mb-1">
            {metrics?.dunningRecoveryRate || 0}%
          </div>
          <p className="text-sm text-base-content/60">
            {metrics?.dunningActive || 0} active sequences
          </p>
          <div className="mt-3">
            <div className="text-sm">
              Target: 60-80%{" "}
              {metrics?.dunningRecoveryRate >= 60 ? (
                <span className="text-success">On track</span>
              ) : (
                <span className="text-warning">Below target</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Upsell Performance</h3>
          <div className="text-3xl font-bold text-primary mb-1">
            {metrics?.upsellConversionRate || 0}%
          </div>
          <p className="text-sm text-base-content/60">
            ${metrics?.upsellRevenueGenerated?.toLocaleString() || 0} generated
          </p>
          <div className="mt-3 text-sm">
            {metrics?.topUpsellTriggers?.[0] && (
              <span>
                Top trigger: {metrics.topUpsellTriggers[0].trigger}
              </span>
            )}
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <h3 className="font-bold mb-3">Win-Back Campaigns</h3>
          <div className="text-3xl font-bold text-primary mb-1">
            {metrics?.winbackConversionRate || 0}%
          </div>
          <p className="text-sm text-base-content/60">
            {metrics?.winbackActive || 0} active campaigns
          </p>
          <div className="mt-3">
            <div className="text-sm">
              Target: 5-15%{" "}
              {metrics?.winbackConversionRate >= 5 ? (
                <span className="text-success">On track</span>
              ) : (
                <span className="text-warning">Below target</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Needing Attention */}
      <div className="bg-base-200 rounded-lg p-4">
        <h3 className="font-bold mb-4">Users Needing Immediate Attention</h3>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Status</th>
                <th>User</th>
                <th>Plan</th>
                <th>Health Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersNeedingIntervention?.critical?.map((user) => (
                <UserRow key={user.user_id} user={user} status="critical" />
              ))}
              {usersNeedingIntervention?.danger?.map((user) => (
                <UserRow key={user.user_id} user={user} status="danger" />
              ))}
              {usersNeedingIntervention?.atRisk?.slice(0, 5).map((user) => (
                <UserRow key={user.user_id} user={user} status="at_risk" />
              ))}
              {(!usersNeedingIntervention?.critical?.length &&
                !usersNeedingIntervention?.danger?.length &&
                !usersNeedingIntervention?.atRisk?.length) && (
                <tr>
                  <td colSpan={5} className="text-center text-base-content/60">
                    No users need immediate attention
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Impact */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
        <h3 className="font-bold mb-2">Revenue Saved This Period</h3>
        <div className="text-4xl font-bold">
          ${(metrics?.cancellationRevenueSaved || 0).toLocaleString()}
        </div>
        <p className="text-sm text-base-content/60 mt-1">
          Through retention offers and save flows
        </p>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, change, changeLabel, target, subtext, color }) {
  return (
    <div className="bg-base-200 rounded-lg p-4">
      <p className="text-sm text-base-content/60 mb-1">{title}</p>
      <p className={`text-2xl font-bold text-${color}`}>{value}</p>
      {change !== null && change !== undefined && (
        <p
          className={`text-sm ${
            change >= 0 ? "text-success" : "text-error"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change}% {changeLabel}
        </p>
      )}
      {target && (
        <p className="text-sm text-base-content/60">Target: {target}</p>
      )}
      {subtext && <p className="text-sm text-base-content/60">{subtext}</p>}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    critical: "badge-error",
    high: "badge-warning",
    medium: "badge-info",
    low: "badge-ghost",
  };
  return (
    <span className={`badge ${colors[priority] || "badge-ghost"} badge-sm`}>
      {priority}
    </span>
  );
}

function HealthBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    success: "bg-success",
    warning: "bg-warning",
    orange: "bg-orange-500",
    error: "bg-error",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-base-300 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function UserRow({ user, status }) {
  const statusColors = {
    critical: "text-error",
    danger: "text-orange-500",
    at_risk: "text-warning",
  };

  return (
    <tr>
      <td>
        <span className={`font-medium ${statusColors[status]}`}>
          {status.replace("_", " ").toUpperCase()}
        </span>
      </td>
      <td>
        <div>
          <p className="font-medium">{user.users?.name || "Unknown"}</p>
          <p className="text-sm text-base-content/60">{user.users?.email}</p>
        </div>
      </td>
      <td className="capitalize">{user.users?.plan_type || "free"}</td>
      <td>
        <span className={statusColors[status]}>{user.health_score}/100</span>
      </td>
      <td>
        <button className="btn btn-xs btn-primary">Take Action</button>
      </td>
    </tr>
  );
}
