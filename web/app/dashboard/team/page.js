"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Team Dashboard Page
 *
 * Manage team members, shared setups, and team settings.
 * Key B2B lock-in feature.
 */
export default function TeamDashboard() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [error, setError] = useState(null);

  // Fetch teams
  useEffect(() => {
    if (!session?.user) return;

    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          setTeams(data.teams || []);
          if (data.teams?.length > 0 && !selectedTeam) {
            setSelectedTeam(data.teams[0]);
          }
        }
      } catch (err) {
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [session?.user]);

  // Create team
  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newTeamName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setTeams([...teams, { ...data.team, isOwner: true, role: "admin" }]);
      setSelectedTeam(data.team);
      setShowCreateModal(false);
      setNewTeamName("");
    } catch (err) {
      setError("Failed to create team");
    }
  };

  // Invite member
  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) return;

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          teamId: selectedTeam.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      // Show invite link
      alert(`Invite sent! Link: ${data.invite.inviteLink}`);
      setShowInviteModal(false);
      setInviteEmail("");
    } catch (err) {
      setError("Failed to send invite");
    }
  };

  // Leave team
  const leaveTeam = async (teamId) => {
    if (!confirm("Are you sure you want to leave this team?")) return;

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", teamId }),
      });

      if (res.ok) {
        setTeams(teams.filter(t => t.id !== teamId));
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(teams[0] || null);
        }
      }
    } catch (err) {
      setError("Failed to leave team");
    }
  };

  // Delete team
  const deleteTeam = async (teamId) => {
    if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/teams?id=${teamId}`, { method: "DELETE" });

      if (res.ok) {
        setTeams(teams.filter(t => t.id !== teamId));
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(teams[0] || null);
        }
      }
    } catch (err) {
      setError("Failed to delete team");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to access team features.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Team Workspaces</h1>
            <p className="text-base-content/60 mt-1">
              Collaborate with your team on security setups
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Team
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* No teams state */}
        {teams.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body items-center text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">No Teams Yet</h2>
              <p className="text-base-content/60 mb-4">
                Create a team to collaborate with colleagues on security setups
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Team
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team List */}
            <div className="lg:col-span-1">
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title text-lg mb-4">Your Teams</h2>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedTeam?.id === team.id
                            ? "bg-primary text-primary-content"
                            : "bg-base-100 hover:bg-base-300"
                        }`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-10">
                              <span>{team.name.charAt(0).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{team.name}</p>
                            <p className="text-xs opacity-70">
                              {team.isOwner ? "Owner" : team.role}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Details */}
            <div className="lg:col-span-2">
              {selectedTeam ? (
                <div className="space-y-6">
                  {/* Team Info Card */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                          <p className="text-sm opacity-60">
                            Created {new Date(selectedTeam.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {selectedTeam.role === "admin" && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setShowInviteModal(true)}
                            >
                              Invite Member
                            </button>
                          )}
                          {selectedTeam.isOwner ? (
                            <button
                              className="btn btn-sm btn-error btn-outline"
                              onClick={() => deleteTeam(selectedTeam.id)}
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => leaveTeam(selectedTeam.id)}
                            >
                              Leave
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="divider"></div>

                      {/* Stats */}
                      <div className="stats stats-vertical lg:stats-horizontal bg-base-100">
                        <div className="stat">
                          <div className="stat-title">Plan</div>
                          <div className="stat-value text-lg capitalize">
                            {selectedTeam.plan || "Team"}
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">Your Role</div>
                          <div className="stat-value text-lg capitalize">
                            {selectedTeam.isOwner ? "Owner" : selectedTeam.role}
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">Joined</div>
                          <div className="stat-value text-lg">
                            {selectedTeam.joinedAt
                              ? new Date(selectedTeam.joinedAt).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Team Setups */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title">Team Setups</h3>
                      <p className="text-sm opacity-60">
                        Shared security configurations for your team
                      </p>
                      <div className="mt-4">
                        <a
                          href={`/dashboard/team/${selectedTeam.id}/setups`}
                          className="btn btn-outline btn-block"
                        >
                          View Team Setups
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card bg-base-200">
                  <div className="card-body items-center py-12">
                    <p className="opacity-60">Select a team to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Create Team</h3>
              <div className="py-4">
                <label className="label">
                  <span className="label-text">Team Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., Security Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={createTeam}>
                  Create
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Invite Team Member</h3>
              <div className="py-4 space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Email Address</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Role</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="member">Member - Can view and edit setups</option>
                    <option value="viewer">Viewer - Can only view setups</option>
                    <option value="admin">Admin - Full access including invites</option>
                  </select>
                </div>
              </div>
              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={inviteMember}>
                  Send Invite
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}></div>
          </div>
        )}
      </div>
    </div>
  );
}
