import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, API_BASE } from '../lib/api.js'
import Sidebar from '../components/Sidebar.jsx'
import MessageBubble from '../components/MessageBubble.jsx'
import RetrievalDebugPanel from '../components/RetrievalDebugPanel.jsx'
import AdminDashboard from '../components/AdminDashboard.jsx'
import UserDashboard from '../components/UserDashboard.jsx'

export default function Chat() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [debugSources, setDebugSources] = useState(null)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-20b')
  const [adminOpen, setAdminOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const bottomRef = useRef(null)

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.me()
      setUser(u)
    } catch (_) {
      navigate('/login')
    }
  }, [navigate])

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await api.listDocuments()
      setDocuments(docs)
    } catch (_) {}
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      const s = await api.listSessions()
      setSessions(s)
    } catch (_) {}
  }, [])

  useEffect(() => {
    refreshUser()
    refreshDocuments()
    refreshSessions()
    api.getModels().then(setModels).catch(() => {})
  }, [refreshUser, refreshDocuments, refreshSessions])

  // Setup beforeunload beacon to erase files or guest account on tab close
  useEffect(() => {
    function handleBeforeUnload() {
      const token = api.getToken()
      if (!token) return
      const headers = { type: 'application/json' }
      const blob = new Blob([JSON.stringify({})], headers)
      if (user?.is_guest) {
        navigator.sendBeacon(`${API_BASE}/auth/guest-cleanup`, blob)
      } else {
        navigator.sendBeacon(`${API_BASE}/documents/cleanup-session`, blob)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user])

  // Poll document statuses while any are still "processing"
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing')
    if (!hasProcessing) return
    const t = setInterval(refreshDocuments, 3000)
    return () => clearInterval(t)
  }, [documents, refreshDocuments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectSession(id) {
    setActiveSessionId(id)
    setDebugSources(null)
    try {
      const msgs = await api.getMessages(id)
      setMessages(msgs)
    } catch (_) {
      setMessages([])
    }
  }

  function newChat() {
    setActiveSessionId(null)
    setMessages([])
    setDebugSources(null)
  }

  async function deleteSession(id) {
    await api.deleteSession(id)
    if (activeSessionId === id) newChat()
    refreshSessions()
  }

  async function deleteDocument(id) {
    try {
      await api.deleteDocument(id)
      if (activeDocumentId === id) setActiveDocumentId(null)
      refreshDocuments()
    } catch (_) {}
  }

  async function handleEndSession() {
    if (confirm("End current session? All uploaded files and vector embeddings will be erased from PostgreSQL to save storage. Your chat history and question answers will be preserved.")) {
      try {
        await api.cleanupSessionFiles()
        setActiveDocumentId(null)
        refreshDocuments()
        alert("Session files cleared. Conversation history preserved.")
      } catch (err) {
        alert(err.message || "Failed to clear session files")
      }
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || sending) return
    setInput('')
    setSending(true)

    const optimisticUserMsg = { role: 'user', content: question, id: `tmp-${Date.now()}` }
    setMessages((m) => [...m, optimisticUserMsg])

    try {
      const res = await api.ask({
        session_id: activeSessionId,
        question,
        document_id: activeDocumentId,
        model: selectedModel,
      })
      setActiveSessionId(res.session_id)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.answer,
          document_name: res.document_name,
          tokens_used: res.tokens_used,
          sources: res.sources,
          id: `a-${Date.now()}`,
        },
      ])
      refreshSessions()
      refreshUser()
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message}`, id: `e-${Date.now()}` }])
    } finally {
      setSending(false)
    }
  }

  async function handleLogout() {
    await api.logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin' || user?.is_admin
  const isGuest = user?.is_guest
  const guestCount = user?.guest_query_count || 0

  return (
    <div className="flex h-screen bg-ink">
      <Sidebar
        documents={documents}
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeDocumentId={activeDocumentId}
        onUploaded={() => refreshDocuments()}
        onSelectSession={selectSession}
        onNewChat={newChat}
        onDeleteSession={deleteSession}
        onDeleteDocument={deleteDocument}
        onSelectDocumentFilter={setActiveDocumentId}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="border-b border-line px-6 py-2.5 flex items-center justify-between gap-4 bg-panel">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="font-display font-semibold text-text text-sm truncate">
                {activeDocumentId
                  ? documents.find((d) => d.id === activeDocumentId)?.filename || 'Chat'
                  : 'All documents'}
              </div>
              <div className="text-[10px] font-mono text-muted">
                Hybrid RAG · RRF (k=60) · BGE Reranker
              </div>
            </div>
          </div>

          {/* Model Selector & Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Model Dropdown */}
            <div className="flex items-center gap-1.5 bg-panel-2 border border-line rounded-lg px-2 py-1">
              <span className="text-[10px] font-mono text-muted uppercase">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs text-amber font-mono font-medium focus:outline-none cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-panel text-text">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Banner */}
            {isGuest && (
              <div className="flex items-center gap-1.5 bg-amber/10 border border-amber/30 rounded-lg px-2.5 py-1 text-xs font-mono text-amber">
                <span>Guest: {guestCount}/4 queries</span>
                <Link to="/register" className="underline font-semibold hover:brightness-110 ml-1">
                  Sign up
                </Link>
              </div>
            )}

            {/* Session Cleanup button (erase files from DB) */}
            {documents.length > 0 && (
              <button
                onClick={handleEndSession}
                className="text-[11px] font-mono text-muted hover:text-red-400 bg-panel-2 border border-line rounded-lg px-2.5 py-1 transition-colors"
                title="Erase uploaded files & vector embeddings from PostgreSQL to save storage quota. Conversations remain preserved."
              >
                Purge Files
              </button>
            )}

            {/* Profile / Tokens Dashboard Button */}
            <button
              onClick={() => setProfileOpen(true)}
              className="text-xs font-mono text-text bg-panel-2 border border-line hover:border-amber/50 rounded-lg px-2.5 py-1 transition-colors"
              title="View my token consumption and statistics"
            >
              Stats
            </button>

            {/* Admin Console Button */}
            {isAdmin && (
              <button
                onClick={() => setAdminOpen(true)}
                className="text-xs font-mono bg-amber/20 border border-amber text-amber font-medium rounded-lg px-2.5 py-1 hover:brightness-110 transition"
              >
                Admin Console
              </button>
            )}
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted">
              <div className="font-mono text-xs tracking-[0.3em] text-amber uppercase mb-2">ready</div>
              <h3 className="font-display text-lg font-medium text-text mb-1">Upload a Document & Ask Questions</h3>
              <p className="max-w-md text-xs leading-relaxed text-muted">
                Upload a PDF or DOCX to start. Every response displays exact BM25, Vector, RRF, and Cross-Encoder scores.
                When your session ends, vector embeddings are automatically deleted from PostgreSQL to maintain $0 free tier storage!
              </p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onInspect={setDebugSources} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-panel border border-line rounded-xl px-4 py-3 text-xs font-mono text-muted pulse-dot">
                retrieving · reranking · generating via {selectedModel}…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Question Input Form */}
        <form onSubmit={handleSend} className="border-t border-line p-4 flex gap-2 bg-panel">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your document…"
            className="flex-1 bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-amber transition-colors"
          />
          <button
            type="submit"
            disabled={sending || (isGuest && guestCount >= 4)}
            className="bg-amber text-ink text-sm font-medium rounded-lg px-5 py-2.5 hover:brightness-110 transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>

      <RetrievalDebugPanel
        sources={debugSources}
        open={!!debugSources}
        onClose={() => setDebugSources(null)}
      />

      {/* Admin Dashboard Modal */}
      <AdminDashboard open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* User Dashboard Modal */}
      <UserDashboard open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}

