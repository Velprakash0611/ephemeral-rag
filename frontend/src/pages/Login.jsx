import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login({ email, password })
      api.setToken(data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
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
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono text-xs tracking-[0.3em] text-amber uppercase mb-2">sys://auth</div>
          <h1 className="font-display text-3xl font-semibold text-text">Contextual</h1>
          <p className="text-muted text-sm mt-1">Sign in to query your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-xl p-6 space-y-4">
          {error && (
            <div className="text-sm bg-red-950/40 border border-red-900 text-red-300 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-amber transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-amber transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber text-ink font-medium text-sm rounded-md py-2.5 hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-line" />
            <span className="px-2 text-[10px] font-mono text-muted uppercase">or</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-panel-2 border border-line hover:border-amber/50 text-text font-medium text-xs font-mono rounded-md py-2.5 hover:bg-panel transition disabled:opacity-50"
          >
            CONTINUE AS GUEST (NO LOGIN REQUIRED)
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-5">
          No account?{' '}
          <Link to="/register" className="text-amber hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}
