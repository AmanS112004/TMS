import React from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

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
            <Activity color="#38bdf8" size={64} />
            <h1>AI TRAFFIC</h1>
          </div>
          <p className="tagline">Optimize cities with real-time AI intelligence.</p>
          <div className="platform-stats">
            <div className="stat-item">
              <span>96.8%</span>
              <label>Accuracy</label>
            </div>
            <div className="stat-item">
              <span>120ms</span>
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
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to access your city command center</p>
          
          <div className="google-auth-container">
            <GoogleLogin
              onSuccess={onSuccess}
              onError={onFailure}
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
