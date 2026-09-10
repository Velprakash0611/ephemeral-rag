import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { ThemeToggle } from '../lib/theme.jsx'
import { LogoIcon, ShieldIcon, CpuIcon, ZapIcon, SearchIcon, ArrowRightIcon } from '../components/Icons.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [emailTouched, setEmailTouched] = useState(false)
  const isEmailValid = !email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address format (e.g. name@example.com)')
      return
    }

    setLoading(true)
    try {
      const data = await api.login({ email: trimmedEmail, password })
      api.setToken(data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuestLogin() {
    setError('')
    setLoading(true)
    try {
      const data = await api.startGuest()
      api.setToken(data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to start guest session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow -top-40 -left-40 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-600/15" />
      <div className="ambient-glow top-1/2 -right-40 w-96 h-96 bg-purple-500/15 dark:bg-purple-600/10" />

      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <LogoIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Ephemeral RAG
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              Hybrid v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/register"
            className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        {/* Left: Product Showcase & Value Prop */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Zero Storage Cost • Ephemeral Privacy Architecture
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Next-Gen Document Intelligence,{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Zero Database Bloat.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Query your PDF and Word documents using production-grade Hybrid RAG (BM25 sparse search + pgvector dense cosine + Reciprocal Rank Fusion) and BGE cross-encoder reranking. All file embeddings automatically wipe upon session close to ensure 100% free serverless storage.
          </p>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                <ShieldIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ephemeral Privacy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Vector chunks are purged from database on tab close. Chat history is preserved with document placeholders.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                <CpuIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">RRF & BGE Reranker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fuses keyword search with semantic vectors, followed by cross-encoder reranking for pinpoint context.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                <ZapIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Groq Fast Inference</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sub-second answers powered by open-source models with live prompt and completion token tracking.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <SearchIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Live Observability</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Inspect retrieval traces with exact BM25, Vector, RRF, and Reranker scores for every chunk.
              </p>
            </div>
          </div>

          {/* Architecture badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">Built with:</span>
            <span className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">FastAPI</span>
            <span className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">Neon pgvector</span>
            <span className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">Groq LLMs</span>
            <span className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">BGE Embeddings</span>
            <span className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">React + Vite</span>
          </div>
        </div>

        {/* Right: Modern Floating Auth Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-7 sm:p-8 backdrop-blur-xl">
            <div className="mb-6 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign In
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Access your chat sessions or test with instant guest access
              </p>
            </div>

            {/* Instant Guest Access Button */}
            <div className="mb-6 p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200/80 dark:border-indigo-800/60 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <ZapIcon className="w-3.5 h-3.5" />
                  <span>Instant Access</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                  No sign-in
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Experience the app immediately. Ask up to 4 questions without entering credentials.
              </p>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-600/25 transition duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue as Guest</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-indigo-200" />
              </button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute px-3 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                or sign in with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {error && (
                <div className="p-3 rounded-lg text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-300 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/60 border ${
                    emailTouched && !isEmailValid
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700/80 focus:ring-indigo-500'
                  } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition`}
                />
                {emailTouched && !isEmailValid && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 font-medium">
                    Please enter a valid email address (e.g. name@example.com)
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition duration-150 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Authenticating…' : 'Sign in to Ephemeral RAG'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New to Ephemeral RAG?{' '}
                <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200/60 dark:border-slate-800/60 z-10">
        Ephemeral RAG • Open-Source Hybrid Retrieval • Free Serverless Tier
      </footer>
    </div>
  )
}
