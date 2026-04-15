import React from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

const GOOGLE_CLIENT_ID = "1043940495048-f5m5fviaivrdob4pdu0oe169fu81ivbe.apps.googleusercontent.com";

const Login = ({ onSuccess, onFailure }) => {
  return (
    <div className="login-page">
      <div className="login-left">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="branding-container"
        >
          <div className="logo-group">
            <Activity color="var(--accent-primary)" size={80} />
            <h1 style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>
              AI TRAFFIC
            </h1>
          </div>
          <p className="tagline" style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}>
            Next-gen urban mobility. Powered by real-time intelligence.
          </p>
          <div className="platform-stats">
            <div className="stat-item">
              <span style={{ color: 'var(--accent-primary)' }}>96.8%</span>
              <label>Accuracy</label>
            </div>
            <div className="stat-item">
              <span style={{ color: 'var(--accent-secondary)' }}>120ms</span>
              <label>Latency</label>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="login-right">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="login-card"
        >
          <h2 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800 }}>Welcome Back</h2>
          <p className="subtitle" style={{ color: 'var(--text-secondary)' }}>Sign in to access your city command center</p>
          
          <div className="google-auth-container">
            <GoogleLogin
              onSuccess={onSuccess}
              onError={onFailure}
              clientId={GOOGLE_CLIENT_ID}
              useOneTap
              theme="outline"
              size="large"
              width="320"
            />
          </div>
          
          <div className="login-footer">
            <span className="secure-badge">Secure Cloud Access</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
