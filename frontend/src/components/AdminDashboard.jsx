import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { SearchIcon, RefreshIcon, CloseIcon, CheckIcon, ZapIcon } from './Icons.jsx'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                Admin Console
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                User Management & Token Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live observability of accounts, role privileges, and total tokens stored in Neon DB
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 cursor-pointer"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl p-3 font-medium">
              {error}
            </div>
          )}

          {/* System Metric KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Users</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.total_users}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {stats.registered_users} registered • {stats.guest_users} guests
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Conversations</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.total_sessions}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {stats.total_messages} Q&A messages logged
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Documents</div>
                <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
                  {stats.total_documents}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Purged on session exit for $0 storage
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total LLM Tokens</div>
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {stats.total_tokens_used?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Captured across all Groq models
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, email, or role…"
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <SearchIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Prompt Tokens</th>
                  <th className="px-4 py-3 text-right">Completion Tokens</th>
                  <th className="px-4 py-3 text-right">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{u.username}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : u.role === 'guest'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {u.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckIcon className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : u.is_guest ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <ZapIcon className="w-3 h-3" />
                          <span>Ephemeral</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px]">
                      {u.prompt_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px]">
                      {u.completion_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {u.total_tokens?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No users match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  )
}
