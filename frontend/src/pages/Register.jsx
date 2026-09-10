import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

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

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.register({ username, email, password })
      setMessage(res.message || `Verification code sent to ${email}`)
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
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono text-xs tracking-[0.3em] text-amber uppercase mb-2">
            {step === 'otp' ? 'sys://verify' : 'sys://register'}
          </div>
          <h1 className="font-display text-3xl font-semibold text-text">
            {step === 'otp' ? 'Verify Email' : 'Create account'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${email}`
              : 'Start asking questions of your documents'}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleRegister} className="bg-panel border border-line rounded-xl p-6 space-y-4">
            {error && (
              <div className="text-sm bg-red-950/40 border border-red-900 text-red-300 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5">USERNAME</label>
              <input
                required minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-amber transition-colors"
                placeholder="jane_doe"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5">EMAIL</label>
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-amber transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5">PASSWORD</label>
              <input
                type="password" required minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-amber transition-colors"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber text-ink font-medium text-sm rounded-md py-2.5 hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? 'Sending verification…' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="bg-panel border border-line rounded-xl p-6 space-y-4">
            {message && (
              <div className="text-xs bg-amber/10 border border-amber/30 text-amber rounded-md px-3 py-2 font-mono">
                {message}
              </div>
            )}
            {error && (
              <div className="text-sm bg-red-950/40 border border-red-900 text-red-300 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-mono text-muted mb-1.5">6-DIGIT VERIFICATION CODE</label>
              <input
                required
                maxLength={6}
                pattern="[0-9]{6}"
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] font-mono font-bold text-xl bg-panel-2 border border-line rounded-md px-3 py-2 text-amber focus:outline-none focus:border-amber transition-colors"
                placeholder="123456"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-amber text-ink font-medium text-sm rounded-md py-2.5 hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify & Activate Account'}
            </button>
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-muted hover:text-amber transition underline"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-muted hover:text-text transition"
              >
                Edit email
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-amber hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
