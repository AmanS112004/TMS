import React, { useState } from "react";
import {
  Camera,
  Upload,
  MessageSquare,
  LogOut,
  Activity,
  Menu,
  X,
  Gamepad2,
} from "lucide-react";

const Navbar = ({
  mode,
  setMode,
  currentView,
  setCurrentView,
  onLogout,
  toggleChat,
  isChatOpen,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (action) => {
    action();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        <div className="nav-branding">
          <Activity color="var(--accent-primary)" size={24} />
          <span className="brand-text">GoSignal</span>
        </div>
      </div>

      <div className={`nav-center ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        <button
          className={`nav-btn ${currentView === "dashboard" && mode === "webcam" ? "active" : ""}`}
          onClick={() =>
            handleNavClick(() => {
              setCurrentView("dashboard");
              setMode("webcam");
            })
          }
        >
          <Camera size={18} />
          <span>Live Detection</span>
        </button>

        <button
          className={`nav-btn ${currentView === "dashboard" && mode === "upload" ? "active" : ""}`}
          onClick={() =>
            handleNavClick(() => {
              setCurrentView("dashboard");
              setMode("upload");
            })
          }
        >
          <Upload size={18} />
          <span>Static Analysis</span>
        </button>
      </div>

      <div className="nav-right">
        <button className="logout-btn" onClick={onLogout}>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
