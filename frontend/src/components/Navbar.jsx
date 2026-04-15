import React, { useState } from 'react'
import { Camera, Upload, MessageSquare, LogOut, Activity, Menu, X } from 'lucide-react'

const Navbar = ({ mode, setMode, onLogout, toggleChat, isChatOpen }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleNavClick = (action) => {
    action()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="top-navbar">
      <div className="nav-branding">
        <Activity color="#38bdf8" size={24} />
        <span>AI TRAFFIC</span>
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
          className={`nav-btn ${mode === 'webcam' ? 'active' : ''}`}
          onClick={() => handleNavClick(() => setMode('webcam'))}
        >
          <Camera size={18} />
          <span>Live Detection</span>
        </button>
        
        <button 
          className={`nav-btn ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => handleNavClick(() => setMode('upload'))}
        >
          <Upload size={18} />
          <span>Static Analysis</span>
        </button>
        
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
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar
