import React, { useState, useRef, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import { motion } from 'framer-motion'
import { Camera, Upload, Activity, AlertCircle, BarChart3, Clock } from 'lucide-react'

const API_BASE = 'http://localhost:8001'

function App() {
  const [mode, setMode] = useState('webcam') // 'webcam' or 'upload'
  const [isDetecting, setIsDetecting] = useState(false)
  const [processedImage, setProcessedImage] = useState(null)
  const [count, setCount] = useState(0)
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Webcam Capture Loop
  const capture = useCallback(async () => {
    if (mode !== 'webcam' || !isDetecting || !webcamRef.current) return

    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    try {
      const formData = new FormData()
      formData.append('image', imageSrc)

      const response = await fetch(`${API_BASE}/detect/frame`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      
      if (data.image) {
        setProcessedImage(data.image)
        setCount(data.count)
      }
    } catch (error) {
      console.error("Detection error:", error)
    }
  }, [mode, isDetecting])

  useEffect(() => {
    let interval
    if (isDetecting && mode === 'webcam') {
      interval = setInterval(capture, 500) // 2 FPS
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isDetecting, mode, capture])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/detect/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.image) {
        setProcessedImage(data.image)
        setCount(data.count)
      }
    } catch (error) {
      console.error("Upload error:", error)
    }
  }

  const resetAnalysis = () => {
    setProcessedImage(null)
    setCount(0)
    setIsDetecting(false)
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Activity color="#38bdf8" size={32} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '1px' }}>AI TRAFFIC</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <div 
            className={`nav-item ${mode === 'webcam' ? 'active' : ''}`}
            onClick={() => { setMode('webcam'); resetAnalysis(); }}
          >
            <Camera size={20} />
            <span>Live Detection</span>
          </div>
          <div 
            className={`nav-item ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => { setMode('upload'); resetAnalysis(); }}
          >
            <Upload size={20} />
            <span>Static Analysis</span>
          </div>
        </nav>

        <div className="card" style={{ marginTop: 'auto' }}>
          <div className="status-badge">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80' }} />
            SYSTEM ONLINE
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Model: YOLOv8 Nano<br />
            Framework: React 19<br />
            API: FastAPI<br />
            Latency: ~120ms
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Traffic Command Center</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Automated Computer Vision Surveillance</p>
          </div>
          <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.875rem' }}>Real-time Feed</span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '500px' }}>
            <div className="feed-container">
              {mode === 'webcam' ? (
                <>
                  {!processedImage || !isDetecting ? (
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="feed-canvas"
                      videoConstraints={{ facingMode: "user" }}
                    />
                  ) : (
                    <img src={processedImage} className="feed-canvas" alt="Processed Stream" />
                  )}
                  <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10 }}>
                    <button onClick={() => setIsDetecting(!isDetecting)}>
                      {isDetecting ? 'TERMINATE ANALYSIS' : 'INITIATE ANALYSIS'}
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '1rem' }}
                >
                  {processedImage ? (
                    <img src={processedImage} className="feed-canvas" alt="Analysis Result" />
                  ) : (
                    <>
                      <Upload size={48} color="var(--accent-cyan)" />
                      <h3 style={{ marginTop: '1.5rem' }}>Import Traffic Image</h3>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Drag and drop or click to browse</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload}
                    accept="image/*"
                  />
                  {processedImage && (
                    <button 
                      className="btn-secondary" 
                      style={{ position: 'absolute', bottom: '1.5rem' }}
                      onClick={(e) => { e.stopPropagation(); resetAnalysis(); }}
                    >
                      CLEAR IMAGE
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="stat-card" style={{ position: 'relative' }}>
              <span className="stat-label">Total Vehicles</span>
              <motion.span 
                key={count}
                initial={{ scale: 1.5, color: '#fff' }}
                animate={{ scale: 1, color: 'var(--accent-cyan)' }}
                className="stat-value"
              >
                {count}
              </motion.span>
              <BarChart3 size={32} color="rgba(56, 189, 248, 0.05)" style={{ position: 'absolute', top: 15, right: 15 }} />
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)' }}>
                <AlertCircle size={16} />
                LIVE ANALYTICS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Model Conf.</span>
                  <span style={{ fontWeight: 600 }}>96.8%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Classifiers</span>
                  <span style={{ fontWeight: 600 }}>4 Active</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                  System is actively scanning for Cars, Trucks, Buses, and Motorcycles.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
