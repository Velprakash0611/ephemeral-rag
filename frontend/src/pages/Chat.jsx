import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, API_BASE } from '../lib/api.js'
import Sidebar from '../components/Sidebar.jsx'
import MessageBubble from '../components/MessageBubble.jsx'
import RetrievalDebugPanel from '../components/RetrievalDebugPanel.jsx'
import AdminDashboard from '../components/AdminDashboard.jsx'
import UserDashboard from '../components/UserDashboard.jsx'
import { ThemeToggle } from '../lib/theme.jsx'
import {
  FileTextIcon,
  FolderIcon,
  CpuIcon,
  ShieldIcon,
  BarChartIcon,
  LogoIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  CloseIcon,
  AlertCircleIcon,
} from '../components/Icons.jsx'

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
    api.getModels().then((m) => {
      setModels(m)
      if (m && m.length > 0 && !m.some((x) => x.id === selectedModel)) {
        setSelectedModel(m[0].id)
      }
    }).catch(() => {})
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
    if (confirm("End current session? All uploaded files and vector embeddings will be erased from PostgreSQL to preserve free storage. Your conversation questions and answers will remain safely saved in history.")) {
      try {
        await api.cleanupSessionFiles()
        setActiveDocumentId(null)
        refreshDocuments()
      } catch (err) {
        alert(err.message || "Failed to purge session files")
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
      setMessages((m) => [...m, { role: 'assistant', content: err.message || 'An error occurred during retrieval.', id: `e-${Date.now()}` }])
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
  const activeDoc = activeDocumentId ? documents.find((d) => d.id === activeDocumentId) : null

  const starterPrompts = [
    "Summarize the key findings and executive summary",
    "Extract all quantitative metrics, numbers, and tables",
    "What are the main conclusions and recommendations?",
    "List the critical action items and next steps",
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
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

      <main className="flex-1 flex flex-col min-w-0 h-screen bg-slate-50/50 dark:bg-[#080c14] relative">
        {/* Top Header Bar */}
        <header className="border-b border-slate-200 dark:border-slate-800/80 px-6 py-3 flex items-center justify-between gap-4 bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            {activeDoc ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 max-w-sm">
                <FileTextIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                  {activeDoc.filename}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDocumentId(null)}
                  title="Remove document filter (query all)"
                  className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 ml-1 p-0.5"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <FolderIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>All Documents</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                  Hybrid RRF (k=60) + BGE Reranker
                </span>
              </div>
            )}
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <CpuIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Counter Badge */}
            {isGuest && (
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Guest: {guestCount}/4 queries</span>
                <Link to="/register" className="font-bold underline hover:brightness-110 ml-1">
                  Sign up
                </Link>
              </div>
            )}

            {/* Purge Files Button */}
            {documents.length > 0 && (
              <button
                type="button"
                onClick={handleEndSession}
                title="Erase uploaded files and vector chunks from PostgreSQL to save storage. Questions and answers are preserved."
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
              >
                <ShieldIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Purge Files</span>
              </button>
            )}

            {/* User Profile Stats Button */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="View your token analytics and profile"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              <BarChartIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Usage</span>
            </button>

            {/* Admin Console Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:brightness-105 transition cursor-pointer shadow-2xs"
              >
                Admin
              </button>
            )}

            {/* Theme Toggle Button (Light/Dark) */}
            <ThemeToggle />
          </div>
        </header>

        {/* Message Conversation Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4">
                <LogoIcon className="w-6 h-6 text-white" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                How can I assist your document research?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Upload a document in the sidebar, or select a starter prompt below. Every response highlights exact chunk sources, BM25 scores, cosine similarity, and BGE rerank rankings.
              </p>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-8 text-left">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-400 dark:hover:border-indigo-600/70 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-xs text-slate-700 dark:text-slate-300 transition duration-150 cursor-pointer shadow-2xs flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onInspect={setDebugSources} />
          ))}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <LogoIcon className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-xs">
                <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Retrieving, reranking, and generating via <strong>{selectedModel}</strong>…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeDoc ? `Ask a question about ${activeDoc.filename}…` : "Ask a question about your uploaded documents…"}
              disabled={isGuest && guestCount >= 4}
              className="w-full pl-4 pr-24 py-3.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-inner"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || (isGuest && guestCount >= 4)}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition duration-150 shadow-sm shadow-indigo-600/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
            >
              <span>Send</span>
              <ArrowUpIcon className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="max-w-4xl mx-auto mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
            <span>Press <strong>Enter</strong> to send • Ephemeral RAG</span>
            <span>Fast Groq Inference • Free pgvector</span>
          </div>
        </div>
      </main>

      {/* Retrieval Debug Panel Drawer */}
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
