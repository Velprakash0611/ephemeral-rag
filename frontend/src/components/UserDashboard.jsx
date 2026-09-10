import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'

export default function UserDashboard({ open, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!open) {
      setConfirmDelete(false)
      return
    }
    loadProfile()
  }, [open])

  async function loadProfile() {
    setLoading(true)
    setError('')
    try {
      const res = await api.getUserDashboard()
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setError('')
    try {
      await api.deleteAccount()
      api.setToken(null)
      window.location.href = '/login'
    } catch (err) {
      setError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (!open) return null

  const user = data?.user

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-panel border border-line rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-panel-2">
          <div>
            <div className="font-mono text-[10px] text-amber uppercase tracking-wider">Account Metrics</div>
            <h2 className="font-display text-lg font-semibold text-text mt-0.5">My Profile & Usage</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-lg px-2">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="text-sm bg-red-950/40 border border-red-900 text-red-300 rounded-md p-3">
              {error}
            </div>
          )}

          {user && (
            <>
              {/* User identity */}
              <div className="bg-panel-2 border border-line rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-display font-medium text-text text-base">{user.username}</div>
                  <div className="font-mono text-xs text-muted mt-0.5">{user.email}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase ${
                    user.role === 'admin'
                      ? 'bg-amber/20 text-amber border border-amber/40'
                      : user.role === 'guest'
                      ? 'bg-panel text-muted border border-line'
                      : 'bg-cyan/15 text-cyan border border-cyan/30'
                  }`}>
                    {user.role}
                  </span>
                  <div className="text-[10px] font-mono text-muted mt-1">
                    {user.is_verified ? 'Verified' : user.is_guest ? 'Ephemeral Guest' : 'Pending Verification'}
                  </div>
                </div>
              </div>

              {/* Token Consumption */}
              <div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider mb-2">LLM Token Consumption</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-muted uppercase">Prompt</div>
                    <div className="text-sm font-mono font-semibold text-text mt-1">
                      {data.prompt_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-muted uppercase">Completion</div>
                    <div className="text-sm font-mono font-semibold text-text mt-1">
                      {data.completion_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-amber uppercase">Total Tokens</div>
                    <div className="text-sm font-mono font-semibold text-amber mt-1">
                      {data.total_tokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data & History Stats */}
              <div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider mb-2">History & Sessions</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-muted uppercase">Chat Sessions</div>
                    <div className="text-sm font-display font-semibold text-text mt-1">{data.num_chat_sessions}</div>
                  </div>
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-muted uppercase">Questions Asked</div>
                    <div className="text-sm font-display font-semibold text-text mt-1">{data.num_messages}</div>
                  </div>
                  <div className="bg-panel-2 border border-line rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-muted uppercase">Active Files</div>
                    <div className="text-sm font-display font-semibold text-cyan mt-1">{data.num_documents}</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-muted bg-panel-2/60 border border-line rounded-lg p-3">
                💡 <span className="text-text">Privacy & Storage Notice:</span> Conversation history is preserved in PostgreSQL.
                Uploaded files and vector embeddings are erased once you end your session to keep database storage free.
              </div>

              {/* Danger Zone: Permanent Account Deletion */}
              <div className="border border-red-900/40 bg-red-950/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider">
                      Danger Zone
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Permanently erase your account, chats, and all data.
                    </div>
                  </div>
                  {!confirmDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 rounded text-xs font-mono font-semibold text-red-400 border border-red-800/80 hover:bg-red-950/60 hover:text-red-300 transition cursor-pointer"
                    >
                      Delete Account
                    </button>
                  )}
                </div>

                {confirmDelete && (
                  <div className="pt-2 border-t border-red-900/40 space-y-2.5">
                    <div className="text-xs text-red-300">
                      ⚠️ <strong>Warning:</strong> This will permanently erase your account, all conversation history, chat sessions, and stored records from the database. This action cannot be undone.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDeleteAccount}
                        className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? 'Deleting Account...' : 'Yes, Permanently Delete'}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 rounded text-xs font-mono text-muted hover:text-text border border-line cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="bg-amber text-ink text-xs font-mono font-semibold px-4 py-2 rounded-md hover:brightness-110 transition"
              className="bg-amber text-ink text-xs font-mono font-semibold px-4 py-2 rounded-md hover:brightness-110 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

