import { useState, useEffect } from 'react'
import { api } from '../lib/api.js'
import { CloseIcon, AlertCircleIcon } from './Icons.jsx'

export default function UserDashboard({ open, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Account Overview
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              My Profile & Usage
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
            title="Close dialog"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl p-3 font-medium flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 text-sm text-slate-400">
              Loading metrics…
            </div>
          )}

          {user && (
            <>
              {/* User Identity Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center uppercase shadow-sm">
                    {user.username[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">
                      {user.username}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : user.role === 'guest'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {user.role}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {user.is_verified ? 'Verified Account' : user.is_guest ? 'Ephemeral Guest' : 'Unverified'}
                  </div>
                </div>
              </div>

              {/* Token Metrics */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  LLM Token Consumption
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Prompt</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {data.prompt_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Completion</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {data.completion_tokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">Total</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {data.total_tokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* History Stats */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  History & Sessions
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Sessions</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {data.num_chat_sessions}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Questions</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {data.num_messages}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 text-center">
                    <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase">Active Files</div>
                    <div className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-1">
                      {data.num_documents}
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl p-3.5 leading-relaxed">
                <strong className="text-slate-700 dark:text-slate-300">Privacy Notice:</strong> Your conversation history is permanently preserved in PostgreSQL. File vector embeddings are erased when you end your session to keep database storage free.
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Danger Zone
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Permanently erase your account and all records.
                    </div>
                  </div>
                  {!confirmDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer"
                    >
                      Delete Account
                    </button>
                  )}
                </div>

                {confirmDelete && (
                  <div className="pt-2 border-t border-red-200 dark:border-red-900/50 space-y-2.5">
                    <div className="text-xs text-red-600 dark:text-red-300 leading-relaxed flex items-start gap-1.5">
                      <AlertCircleIcon className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <span><strong>Warning:</strong> This will immediately and permanently erase your account, all chat sessions, question histories, and stored data. This action is irreversible.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDeleteAccount}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {deleting ? 'Deleting Account…' : 'Yes, Permanently Delete'}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
              type="button"
              onClick={onClose}
              className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
