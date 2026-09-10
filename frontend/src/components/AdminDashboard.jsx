import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'

export default function AdminDashboard({ open, onClose }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    loadData()
  }, [open])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [u, s] = await Promise.all([api.getAdminUsers(), api.getAdminStats()])
      setUsers(u)
      setStats(s)
    } catch (err) {
      setError(err.message || 'Failed to load admin metrics')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-panel border border-line rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-panel-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber px-2 py-0.5 rounded bg-amber/10 border border-amber/30 uppercase">
                Admin Console
              </span>
              <h2 className="font-display text-lg font-semibold text-text">Users & Token Usage Analytics</h2>
            </div>
            <p className="text-xs text-muted mt-1">Live visibility into all users, role privileges, and LLM tokens stored in PostgreSQL</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="text-xs font-mono text-amber hover:underline disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <button onClick={onClose} className="text-muted hover:text-text text-lg px-2">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="text-sm bg-red-950/40 border border-red-900 text-red-300 rounded-md p-3">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Total Users</div>
                <div className="text-xl font-display font-semibold text-text mt-1">{stats.total_users}</div>
              </div>
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Registered</div>
                <div className="text-xl font-display font-semibold text-cyan mt-1">{stats.registered_users}</div>
              </div>
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Guests</div>
                <div className="text-xl font-display font-semibold text-muted mt-1">{stats.guest_users}</div>
              </div>
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Active Docs</div>
                <div className="text-xl font-display font-semibold text-text mt-1">{stats.total_documents}</div>
              </div>
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Questions</div>
                <div className="text-xl font-display font-semibold text-amber mt-1">{stats.total_messages}</div>
              </div>
              <div className="bg-panel-2 border border-line rounded-lg p-3">
                <div className="text-[10px] font-mono text-muted uppercase">Tokens Consumed</div>
                <div className="text-xl font-display font-semibold text-violet-400 mt-1">
                  {stats.total_tokens_consumed.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, or role…"
              className="bg-panel-2 border border-line rounded-lg px-3 py-2 text-xs text-text w-72 focus:outline-none focus:border-amber transition-colors"
            />
            <div className="text-xs font-mono text-muted">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel-2 border-b border-line text-[10px] font-mono text-muted uppercase">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3">Total Tokens</th>
                  <th className="p-3">Prompt / Comp</th>
                  <th className="p-3">Docs / Sessions</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-panel-2/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-text">{u.username}</div>
                      <div className="text-[11px] font-mono text-muted">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        u.role === 'admin'
                          ? 'bg-amber/20 text-amber border border-amber/40'
                          : u.role === 'guest'
                          ? 'bg-panel-2 text-muted border border-line'
                          : 'bg-cyan/15 text-cyan border border-cyan/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {u.is_verified ? (
                        <span className="text-cyan">✓ Yes</span>
                      ) : u.is_guest ? (
                        <span className="text-muted">Guest</span>
                      ) : (
                        <span className="text-amber">Pending</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-medium text-text">
                      {u.total_tokens.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-muted text-[11px]">
                      {u.prompt_tokens.toLocaleString()} / {u.completion_tokens.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-muted">
                      {u.num_documents} / {u.num_chat_sessions}
                    </td>
                    <td className="p-3 font-mono text-muted text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted italic">
                      No users found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

