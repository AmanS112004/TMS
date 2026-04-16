import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import {
  Camera,
  Upload,
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Volume2,
  Send,
  LogOut,
  Square,
} from "lucide-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Simulator from "./components/Simulator";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

function App() {
  const [mode, setMode] = useState("webcam");
  const [isDetecting, setIsDetecting] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [count, setCount] = useState(0);
  const [timings, setTimings] = useState({ green: 0, red: 0, yellow: 0 });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("dashboard");

  const [isNarrating, setIsNarrating] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your AI Traffic Assistant. How can I help you today?",
    },
  ]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("traffic_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem("traffic_user", JSON.stringify(data.user));
      } else {
        console.error("Auth failed:", data.error);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("traffic_user");
    resetAnalysis();
  };
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const utteranceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleNarrate = async () => {
    if (isNarrating) {
      window.speechSynthesis.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsNarrating(false);
      return;
    }

    try {
      setIsNarrating(true);

      // Cleanup previous request if any
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, timings }),
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json();

      if (data.narrative && !abortControllerRef.current.signal.aborted) {
        // Setup Speech
        const utterance = new SpeechSynthesisUtterance(data.narrative);
        utteranceRef.current = utterance;

        utterance.onend = () => {
          setIsNarrating(false);
          utteranceRef.current = null;
        };
        utterance.onerror = () => {
          setIsNarrating(false);
          utteranceRef.current = null;
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setIsNarrating(false);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Narration error:", error);
      setIsNarrating(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: chatInput,
          count: count,
          timings: timings,
        }),
      });
      const data = await response.json();

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.response ||
            "I'm having trouble connecting to the traffic database.",
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "System error: Chat offline.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Webcam Capture Loop
  const capture = useCallback(async () => {
    if (mode !== "webcam" || !isDetecting || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const formData = new FormData();
      formData.append("image", imageSrc);

      const response = await fetch(`${API_BASE}/detect/frame`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.image) {
        setProcessedImage(data.image);
        setCount(data.count);
        if (data.timings) setTimings(data.timings);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, [mode, isDetecting]);

  useEffect(() => {
    let interval;
    if (isDetecting && mode === "webcam") {
      interval = setInterval(capture, 500); // 2 FPS
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isDetecting, mode, capture]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear old result to show we are processing
    setProcessedImage(null);
    setCount(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/detect/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.image) {
        setProcessedImage(data.image);
        setCount(data.count);
        if (data.timings) setTimings(data.timings);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }

    // Reset file input so same file can be uploaded again if needed
    e.target.value = "";
  };

  const toggleDetection = () => {
    if (!isDetecting) {
      // Clear old state when starting fresh detection
      setProcessedImage(null);
      setCount(0);
      setTimings({ green: 0, red: 0, yellow: 0 });
    } else {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
    }
    setIsDetecting(!isDetecting);
  };

  const resetAnalysis = () => {
    window.speechSynthesis.cancel();
    setIsNarrating(false);
    setProcessedImage(null);
    setCount(0);
    setTimings({ green: 0, red: 0, yellow: 0 });
    setIsDetecting(false);
  };

  if (loading) return null;

  if (!user) {
    return (
      <Login
        onSuccess={handleLoginSuccess}
        onFailure={() => console.error("Google Login Failed")}
      />
    );
  }

  return (
    <div className="app-main">
      <Navbar
        mode={mode}
        setMode={setMode}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen(!isChatOpen)}
      />

      <div className="app-container dashboard-layout">
        <main className="main-content">
          {currentView === "dashboard" ? (
            <>
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 900,
                      background: "var(--accent-gradient)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    City Command Center
                  </h1>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Operator: Welcome, {user.name}
                  </p>
                </div>
              </header>

              <div className="main-grid">
                <div
                  className="card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    minHeight: "500px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div className="feed-container">
                    {mode === "webcam" ? (
                      <>
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="feed-canvas"
                          style={{
                            display:
                              isDetecting && processedImage ? "none" : "block",
                          }}
                          videoConstraints={{ facingMode: "user" }}
                        />
                        {isDetecting && processedImage && (
                          <img
                            src={processedImage}
                            className="feed-canvas"
                            alt="Processed stream"
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "1.5rem",
                            right: "1.5rem",
                            zIndex: 10,
                          }}
                        >
                          <button onClick={toggleDetection}>
                            {isDetecting
                              ? "TERMINATE ANALYSIS"
                              : "INITIATE ANALYSIS"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        className="upload-zone"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          margin: "1rem",
                        }}
                      >
                        {processedImage ? (
                          <img
                            src={processedImage}
                            className="feed-canvas"
                            alt="Analysis Result"
                          />
                        ) : (
                          <>
                            <Upload size={48} color="var(--accent-primary)" />
                            <h3
                              style={{ marginTop: "1.5rem", fontWeight: 800 }}
                            >
                              Import Traffic Image
                            </h3>
                            <p
                              style={{
                                color: "var(--text-secondary)",
                                marginTop: "0.5rem",
                              }}
                            >
                              Drag and drop or click to browse
                            </p>
                          </>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileUpload}
                          accept="image/*"
                        />
                        {processedImage && (
                          <button
                            className="btn-secondary"
                            style={{ position: "absolute", bottom: "1.5rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              resetAnalysis();
                            }}
                          >
                            CLEAR IMAGE
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  <div className="stat-card" style={{ position: "relative" }}>
                    <span className="stat-label">Total Vehicles</span>
                    <motion.span
                      key={count}
                      initial={{ scale: 1.5, color: "#fff" }}
                      animate={{ scale: 1, color: "var(--accent-cyan)" }}
                      className="stat-value"
                    >
                      {count}
                    </motion.span>
                    <BarChart3
                      size={32}
                      color="rgba(249, 115, 22, 0.05)"
                      style={{ position: "absolute", top: 15, right: 15 }}
                    />
                  </div>

                  <div className="card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          color: "var(--accent-primary)",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                        }}
                      >
                        <Clock size={16} />
                        AI SIGNAL TIMING
                      </h3>
                      <button
                        onClick={handleNarrate}
                        className={`voice-btn ${isNarrating ? "playing" : ""}`}
                        title="Explain traffic status"
                        style={{
                          padding: "0.5rem",
                          borderRadius: "50%",
                          background: isNarrating
                            ? "var(--accent-gradient)"
                            : "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isNarrating ? (
                          <Square size={16} fill="#fff" color="#fff" />
                        ) : (
                          <Volume2 size={18} color="var(--accent-primary)" />
                        )}
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Green Signal
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: "#4ade80",
                              boxShadow: "0 0 10px #4ade80",
                            }}
                          />
                          <span
                            style={{ fontWeight: 800, fontSize: "1.25rem" }}
                          >
                            {timings.green}s
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Red Signal
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: "#f87171",
                              boxShadow: "0 0 10px #f87171",
                            }}
                          />
                          <span
                            style={{ fontWeight: 800, fontSize: "1.25rem" }}
                          >
                            {timings.red}s
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Yellow Signal
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: "#fbbf24",
                              boxShadow: "0 0 10px #fbbf24",
                            }}
                          />
                          <span
                            style={{ fontWeight: 800, fontSize: "1.25rem" }}
                          >
                            {timings.yellow}s
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.5rem",
                          padding: "0.75rem",
                          backgroundColor: "rgba(249, 115, 22, 0.03)",
                          borderRadius: "0.75rem",
                          border: "1px solid rgba(249, 115, 22, 0.1)",
                          lineHeight: 1.6,
                        }}
                      >
                        Signal times are dynamically optimized based on
                        real-time vehicle density.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Simulator />
          )}
        </main>
      </div>

      {/* Floating Chatbot Widget */}
      <div className={`chatbot-widget ${isChatOpen ? "open" : ""}`}>
        <motion.div
          className="chat-toggle"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? "×" : "💬"}
        </motion.div>

        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="chat-window card"
          >
            <div
              className="chat-header"
              style={{
                borderBottom: "1px solid var(--border-color)",
                background: "rgba(249, 115, 22, 0.05)",
              }}
            >
              <Activity size={18} color="var(--accent-primary)" />
              <span style={{ fontWeight: 800, letterSpacing: "0.05em" }}>
                Traffic Assistant
              </span>
            </div>

            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              {isChatLoading && (
                <div className="message assistant">
                  <div className="message-content typing-indicator">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                </div>
              )}
              <div ref={chatRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input
                type="text"
                placeholder="Ask about traffic, signals..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" disabled={isChatLoading}>
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;
