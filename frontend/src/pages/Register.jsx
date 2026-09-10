import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { ThemeToggle } from '../lib/theme.jsx'
import { LogoIcon, CheckIcon } from '../components/Icons.jsx'

export default function Register() {
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [emailTouched, setEmailTouched] = useState(false)
  const isEmailValid = !email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    const trimmedEmail = email.trim()
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address format (e.g. name@example.com)')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long')
      return
    }

    setLoading(true)
    try {
      const res = await api.register({ username: username.trim(), email: trimmedEmail, password })
      setMessage(res.message || `Verification code sent to ${trimmedEmail}`)
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.verifyOTP({ email, otp_code: otpCode })
      api.setToken(data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.resendOTP({ email })
      setMessage(res.message || 'New verification code sent!')
    } catch (err) {
      setError(err.message || 'Failed to resend code')
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
            to="/login"
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        {/* Left: Value Proposition */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Free Serverless Tier • Email OTP Verification
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Create your account in{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              30 seconds.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Registered accounts unlock persistent conversation histories, individual token analytics, and personal question tracking. Your uploaded document chunks still erase on session close to keep database storage free.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon className="w-3 h-3" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>Persistent Q&A History</strong>: Review past questions and answers anytime, with document name badges preserved.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon className="w-3 h-3" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>Personal Token Dashboard</strong>: Monitor exact prompt, completion, and total tokens used by Groq.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon className="w-3 h-3" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>Zero Storage Quota Fears</strong>: Embeddings are wiped on session exit, preserving your Neon free tier.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Floating Register / OTP Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-7 sm:p-8 backdrop-blur-xl">
            {step === 'form' ? (
              <>
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Create Account
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enter your details to receive a 6-digit verification code
                  </p>
                </div>

                {error && (
                  <div className="p-3 mb-4 rounded-lg text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-300 font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>

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
                      placeholder="alex@example.com"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/60 border ${
                        emailTouched && !isEmailValid
                          ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 dark:border-slate-700/80 focus:ring-indigo-500'
                      } text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition`}
                    />
                    {emailTouched && !isEmailValid && (
                      <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 font-medium">
                        Please enter a valid email address (e.g. alex@example.com)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password
                    </label>
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
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition duration-150 shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending Code…' : 'Send Verification Code'}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Already registered?{' '}
                    <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Step 2 of 2
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    Enter Verification Code
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    A 6-digit code has been sent to <strong>{email}</strong>
                  </p>
                </div>

                {message && (
                  <div className="p-3 mb-4 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="p-3 mb-4 rounded-lg text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-300 font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-lg text-center font-mono text-xl tracking-[0.4em] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition duration-150 shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Verifying…' : 'Verify & Launch App'}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              </>
            )}
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
