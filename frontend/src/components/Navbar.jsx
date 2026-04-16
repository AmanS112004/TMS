import React, { useState } from 'react'
import { Camera, Upload, MessageSquare, LogOut, Activity, Menu, X, Gamepad2 } from 'lucide-react'

const Navbar = ({ mode, setMode, currentView, setCurrentView, onLogout, toggleChat, isChatOpen }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavClick = (action) => {
    action()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="top-navbar">
      <div className="nav-branding">
        <Activity color="var(--accent-primary)" size={24} />
        <span style={{ fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI TRAFFIC
        </span>
      </div>
      
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <button 
          className={`nav-btn ${currentView === 'dashboard' && mode === 'webcam' ? 'active' : ''}`}
          onClick={() => handleNavClick(() => { setCurrentView('dashboard'); setMode('webcam'); })}
        >
          <Camera size={18} />
          <span>Live Detection</span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'dashboard' && mode === 'upload' ? 'active' : ''}`}
          onClick={() => handleNavClick(() => { setCurrentView('dashboard'); setMode('upload'); })}
        >
          <Upload size={18} />
          <span>Static Analysis</span>
        </button>

        {/* <button 
          className={`nav-btn ${currentView === 'simulator' ? 'active' : ''}`}
          onClick={() => handleNavClick(() => setCurrentView('simulator'))}
        >
          <Gamepad2 size={18} />
          <span>Traffic Simulator</span>
        </button> */}
        
        <button 
          className={`nav-btn ${isChatOpen ? 'active' : ''}`}
          onClick={() => handleNavClick(toggleChat)}
        >
          <MessageSquare size={18} />
          <span>Chatbot Assistant</span>
        </button>

        <div className="mobile-user-separator" />
        
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      
      <div className="nav-user desktop-only">
      </div>
    </nav>
  )
}

export default Navbar
