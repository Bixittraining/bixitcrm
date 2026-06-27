import { useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onLogin?.()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" style={{ animation: 'float 6s ease-in-out infinite' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" style={{ animation: 'float 8s ease-in-out infinite 1s' }} />
      </div>

      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.05) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-2xl shadow-primary-500/30 mb-4"
          >
            <GraduationCap size={32} className="text-white" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="text-3xl font-bold text-white mb-1">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-primary-300 to-accent-400">BIX</span>
              <span className="text-white"> Academy</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-dark-400">
              <Sparkles size={14} className="text-accent-500" />
              <span className="text-sm">Education CRM Platform</span>
              <Sparkles size={14} className="text-accent-500" />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-900/80 backdrop-blur-2xl border border-dark-700/60 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-dark-400 text-sm mb-6">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@academy.com"
                  className="w-full pl-11 pr-4 py-3 bg-dark-800/80 border border-dark-700 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 bg-dark-800/80 border border-dark-700 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500/50" />
                <span className="text-sm text-dark-400">Remember me</span>
              </label>
              <button type="button" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-shadow disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-700/60 text-center">
            <p className="text-sm text-dark-400">
              Demo credentials: any email & password
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-dark-500 mt-6"
        >
          &copy; 2026 BIX Academy. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  )
}
