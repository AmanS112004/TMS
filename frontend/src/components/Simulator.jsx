import React, { useEffect, useRef, useState } from 'react'

// --- SIMULATION CONSTANTS ---
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 800
const speeds = { car: 2.25, bus: 1.8, truck: 1.8, rickshaw: 2, bike: 2.5 }
const stopLines = { right: 590, down: 330, left: 800, up: 535 }
const defaultStop = { right: 580, down: 320, left: 810, up: 545 }
const mid = {
  right: { x: 705, y: 445 },
  down: { x: 695, y: 450 },
  left: { x: 695, y: 425 },
  up: { x: 695, y: 400 }
}
const gap = 15
const gap2 = 15
const rotationAngle = 3
const directionNumbers = { 0: 'right', 1: 'down', 2: 'left', 3: 'up' }
const vehicleTypes = { 0: 'car', 1: 'bus', 2: 'truck', 3: 'rickshaw', 4: 'bike' }

// Base start positions (will be cloned for each simulation instance)
const baseStartX = { right: [0, 0, 0], down: [755, 727, 697], left: [1400, 1400, 1400], up: [602, 627, 657] }
const baseStartY = { right: [348, 370, 398], down: [0, 0, 0], left: [498, 466, 436], up: [800, 800, 800] }

const signalCoods = [[530, 230], [810, 230], [810, 570], [530, 570]]
const signalTimerCoods = [[530, 210], [810, 210], [810, 550], [530, 550]]
const vehicleCountCoods = [[480, 210], [880, 210], [880, 550], [480, 550]]

const defaultRed = 150
const defaultYellow = 5
const defaultGreen = 20
const defaultMinimum = 10
const defaultMaximum = 60
const detectionTime = 5

const carTime = 2
const bikeTime = 1
const rickshawTime = 2.25
const busTime = 2.5
const truckTime = 2.5

class TrafficSignal {
  constructor(red, yellow, green) {
    this.red = red
    this.yellow = yellow
    this.green = green
  }
}

class Vehicle {
  constructor(lane, vClass, directionNum, direction, image, state) {
    this.lane = lane
    this.vehicleClass = vClass
    this.speed = speeds[vClass]
    this.direction_number = directionNum
    this.direction = direction
    this.x = state.spawnPoints.x[direction][lane]
    this.y = state.spawnPoints.y[direction][lane]
    this.crossed = 0
    this.willTurn = Math.random() < 0.3 && lane === 2 ? 1 : 0
    this.turned = 0
    this.rotateAngle = 0
    this.image = image
    this.width = image.width
    this.height = image.height

    state.vehiclesByDirection[direction][lane].push(this)
    this.index = state.vehiclesByDirection[direction][lane].length - 1

    const temp = (this.direction === 'right' || this.direction === 'left') ? this.width + gap : this.height + gap
    
    // Update spawn points for next vehicle in this lane
    if (this.direction === 'right') {
      state.spawnPoints.x[this.direction][this.lane] -= temp
      this.stop = (this.index > 0 && state.vehiclesByDirection[this.direction][this.lane][this.index - 1].crossed === 0) 
        ? state.vehiclesByDirection[this.direction][this.lane][this.index - 1].stop - temp 
        : defaultStop[this.direction]
    } else if (this.direction === 'left') {
      state.spawnPoints.x[this.direction][this.lane] += temp
      this.stop = (this.index > 0 && state.vehiclesByDirection[this.direction][this.lane][this.index - 1].crossed === 0) 
        ? state.vehiclesByDirection[this.direction][this.lane][this.index - 1].stop + temp 
        : defaultStop[this.direction]
    } else if (this.direction === 'down') {
      state.spawnPoints.y[this.direction][this.lane] -= temp
      this.stop = (this.index > 0 && state.vehiclesByDirection[this.direction][this.lane][this.index - 1].crossed === 0) 
        ? state.vehiclesByDirection[this.direction][this.lane][this.index - 1].stop - temp 
        : defaultStop[this.direction]
    } else if (this.direction === 'up') {
      state.spawnPoints.y[this.direction][this.lane] += temp
      this.stop = (this.index > 0 && state.vehiclesByDirection[this.direction][this.lane][this.index - 1].crossed === 0) 
        ? state.vehiclesByDirection[this.direction][this.lane][this.index - 1].stop + temp 
        : defaultStop[this.direction]
    }
  }

  move(state) {
    const isGreen = state.currentGreen === this.direction_number && state.currentYellow === 0
    const nextVeh = state.vehiclesByDirection[this.direction][this.lane][this.index - 1]

    const checkAhead = (dim, currentPos, targetStop, aheadVehPos, aheadVehWidth, isVertical = false) => {
      const isLeading = this.index === 0
      const hasGap = isLeading || (isVertical 
        ? (this.direction === 'down' ? currentPos + this.height < aheadVehPos - gap2 : currentPos > aheadVehPos + aheadVehWidth + gap2)
        : (this.direction === 'right' ? currentPos + this.width < aheadVehPos - gap2 : currentPos > aheadVehPos + aheadVehWidth + gap2)
      )
      const lightAllows = this.crossed === 1 || isGreen || (isVertical
        ? (this.direction === 'down' ? currentPos + this.height <= targetStop : currentPos >= targetStop)
        : (this.direction === 'right' ? currentPos + this.width <= targetStop : currentPos >= targetStop)
      )
      return lightAllows && hasGap
    }

    if (this.direction === 'right') {
      if (this.crossed === 0 && this.x + this.width > stopLines.right) {
        this.crossed = 1; state.vehiclesByDirection.right.crossed++
      }
      if (checkAhead('x', this.x, this.stop, nextVeh?.x, nextVeh?.width)) {
        if (this.willTurn && this.x + this.width >= mid.right.x && !this.turned) {
          this.rotateAngle += rotationAngle; this.x += 2; this.y += 1.8
          if (this.rotateAngle >= 90) this.turned = 1
        } else if (this.turned) { this.y += this.speed }
        else { this.x += this.speed }
      }
    } else if (this.direction === 'down') {
      if (this.crossed === 0 && this.y + this.height > stopLines.down) {
        this.crossed = 1; state.vehiclesByDirection.down.crossed++
      }
      if (checkAhead('y', this.y, this.stop, nextVeh?.y, nextVeh?.height, true)) {
        if (this.willTurn && this.y + this.height >= mid.down.y && !this.turned) {
          this.rotateAngle += rotationAngle; this.x -= 2.5; this.y += 2
          if (this.rotateAngle >= 90) this.turned = 1
        } else if (this.turned) { this.x -= this.speed }
        else { this.y += this.speed }
      }
    } else if (this.direction === 'left') {
      if (this.crossed === 0 && this.x < stopLines.left) {
        this.crossed = 1; state.vehiclesByDirection.left.crossed++
      }
      if (checkAhead('x', this.x, this.stop, nextVeh?.x, nextVeh?.width)) {
        if (this.willTurn && this.x <= mid.left.x && !this.turned) {
          this.rotateAngle += rotationAngle; this.x -= 1.8; this.y -= 2.5
          if (this.rotateAngle >= 90) this.turned = 1
        } else if (this.turned) { this.y -= this.speed }
        else { this.x -= this.speed }
      }
    } else if (this.direction === 'up') {
      if (this.crossed === 0 && this.y < stopLines.up) {
        this.crossed = 1; state.vehiclesByDirection.up.crossed++
      }
      if (checkAhead('y', this.y, this.stop, nextVeh?.y, nextVeh?.height, true)) {
        if (this.willTurn && this.y <= mid.up.y && !this.turned) {
          this.rotateAngle += rotationAngle; this.x += 1; this.y -= 1
          if (this.rotateAngle >= 90) this.turned = 1
        } else if (this.turned) { this.x += this.speed }
        else { this.y -= this.speed }
      }
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
    ctx.rotate((this.rotateAngle * Math.PI) / 180)
    ctx.drawImage(this.image, -this.width / 2, -this.height / 2)
    ctx.restore()
  }
}

const Simulator = () => {
  const canvasRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const imagesRef = useRef({})
  const stateRef = useRef({
    currentGreen: 0,
    currentYellow: 0,
    nextGreen: 1,
    signals: [],
    allVehicles: [],
    vehiclesByDirection: {
      right: { 0: [], 1: [], 2: [], crossed: 0 },
      down: { 0: [], 1: [], 2: [], crossed: 0 },
      left: { 0: [], 1: [], 2: [], crossed: 0 },
      up: { 0: [], 1: [], 2: [], crossed: 0 }
    },
    spawnPoints: {
      x: JSON.parse(JSON.stringify(baseStartX)),
      y: JSON.parse(JSON.stringify(baseStartY))
    },
    timeElapsed: 0,
    sessionActive: true,
    showStats: false
  })

  useEffect(() => {
    const loadAssets = async () => {
      const images = {}
      const load = (src) => new Promise((res) => {
        const img = new Image(); img.src = src; img.onload = () => res(img)
      })

      images.background = await load('/images/mod_int.png')
      images.red = await load('/images/signals/red.png')
      images.yellow = await load('/images/signals/yellow.png')
      images.green = await load('/images/signals/green.png')

      for (const dir of ['right', 'left', 'up', 'down']) {
        images[dir] = {}
        for (const type of ['bike', 'bus', 'car', 'rickshaw', 'truck']) {
          images[dir][type] = await load(`/images/${dir}/${type}.png`)
        }
      }
      imagesRef.current = images
      setIsLoaded(true)
    }

    loadAssets()

    const ts1 = new TrafficSignal(0, defaultYellow, defaultGreen)
    const ts2 = new TrafficSignal(ts1.red + ts1.yellow + ts1.green, defaultYellow, defaultGreen)
    const ts3 = new TrafficSignal(defaultRed, defaultYellow, defaultGreen)
    const ts4 = new TrafficSignal(defaultRed, defaultYellow, defaultGreen)
    
    stateRef.current.signals = [ts1, ts2, ts3, ts4]

    const setTime = () => {
      const s = stateRef.current
      const nextIdx = s.nextGreen
      const dir = directionNumbers[nextIdx]
      
      let cars = 0, bikes = 0, buses = 0, trucks = 0, rickshaws = 0
      
      for (let i = 0; i < 3; i++) {
        s.vehiclesByDirection[dir][i].forEach(v => {
          if (v.crossed === 0) {
            if (v.vehicleClass === 'car') cars++
            else if (v.vehicleClass === 'bike') bikes++
            else if (v.vehicleClass === 'bus') buses++
            else if (v.vehicleClass === 'truck') trucks++
            else if (v.vehicleClass === 'rickshaw') rickshaws++
          }
        })
      }

      let greenTime = Math.ceil(((cars * carTime) + (rickshaws * rickshawTime) + (buses * busTime) + (trucks * truckTime) + (bikes * bikeTime)) / 3)
      if (greenTime < defaultMinimum) greenTime = defaultMinimum
      else if (greenTime > defaultMaximum) greenTime = defaultMaximum
      
      console.log(`Setting Next Green (${dir}) to ${greenTime}s`)
      s.signals[nextIdx].green = greenTime
    }

    const timer = setInterval(() => {
      const s = stateRef.current
      if (!s.sessionActive) return
      
      s.timeElapsed++
      if (s.timeElapsed >= 300) {
        s.sessionActive = false
        s.showStats = true
        clearInterval(timer)
        return
      }

      const sig = s.signals[s.currentGreen]
      
      if (s.currentYellow === 0) {
        sig.green--
        if (s.signals[s.nextGreen].red === detectionTime) {
          setTime()
        }
        if (sig.green <= 0) s.currentYellow = 1
      } else {
        sig.yellow--
        if (sig.yellow <= 0) {
          s.currentYellow = 0
          sig.green = defaultGreen
          sig.yellow = defaultYellow
          sig.red = defaultRed
          s.currentGreen = s.nextGreen
          s.nextGreen = (s.currentGreen + 1) % 4
          const curr = s.signals[s.currentGreen]
          s.signals[s.nextGreen].red = curr.yellow + curr.green
        }
      }
      s.signals.forEach((sig, i) => { 
        if (i !== s.currentGreen) sig.red-- 
      })
    }, 1000)

    const spawner = setInterval(() => {
      if (!isLoaded) return
      const s = stateRef.current
      if (!s.sessionActive) return

      const typeNum = Math.floor(Math.random() * 5)
      const lane = typeNum === 4 ? 0 : Math.floor(Math.random() * 2) + 1
      
      const prob = Math.random() * 1000
      let dirNum = 0
      if (prob < 400) dirNum = 0      // Right: 40%
      else if (prob < 800) dirNum = 1 // Down: 40%
      else if (prob < 900) dirNum = 2 // Left: 10%
      else dirNum = 3                 // Up: 10%

      const dir = directionNumbers[dirNum]
      const type = vehicleTypes[typeNum]
      s.allVehicles.push(new Vehicle(lane, type, dirNum, dir, imagesRef.current[dir][type], s))
    }, 750)

    return () => { clearInterval(timer); clearInterval(spawner) }
  }, [isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let frameId

    const loop = () => {
      const s = stateRef.current
      ctx.drawImage(imagesRef.current.background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      s.signals.forEach((sig, i) => {
        let img = imagesRef.current.red
        let text = sig.red
        if (i === s.currentGreen) {
          if (s.currentYellow === 1) { img = imagesRef.current.yellow; text = sig.yellow }
          else { img = imagesRef.current.green; text = sig.green }
        }
        ctx.drawImage(img, signalCoods[i][0], signalCoods[i][1])
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace'
        ctx.fillText(text > 0 ? text : (text <= -10 ? "---" : "GO"), signalTimerCoods[i][0], signalTimerCoods[i][1])

        // Draw active vehicle count (CROSSED vehicles - matching simulation.py line 493)
        const crossedCount = s.vehiclesByDirection[directionNumbers[i]].crossed
        ctx.fillStyle = 'white'; ctx.fillRect(vehicleCountCoods[i][0], vehicleCountCoods[i][1] - 20, 40, 25)
        ctx.fillStyle = 'black'; ctx.font = 'bold 18px Arial'
        ctx.fillText(crossedCount, vehicleCountCoods[i][0] + 5, vehicleCountCoods[i][1])
      })

      s.allVehicles.forEach(v => { v.move(s); v.draw(ctx) })
      s.allVehicles = s.allVehicles.filter(v => v.x > -200 && v.x < 1600 && v.y > -200 && v.y < 1000)

      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [isLoaded])

  return (
    <div className="simulator-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#030303' }}>
      <header style={{ width: '100%', maxWidth: '1600px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(to right, #f97316, #fb7185)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Traffic Simulation Hub
          </h1>
          <p style={{ color: '#999', fontWeight: 500 }}>Native Web Engine Portal</p>
        </div>
        <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '0.75rem 1.5rem', borderRadius: '2rem', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>LIVE ENGINE ACTIVE</span>
        </div>
      </header>

      <div className="card" style={{ 
        padding: 0, 
        overflow: 'hidden', 
        border: '1px solid #333', 
        borderRadius: '1.5rem', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
        background: '#000', 
        position: 'relative', 
        width: '100%', 
        maxWidth: '1600px',
        maxHeight: 'calc(100vh - 280px)', // Fits within viewport without scrolling
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          {!isLoaded && (
             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', zIndex: 10 }}>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ width: 50, height: 50, border: '4px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                   <p style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff', letterSpacing: '0.1em' }}>INITIALIZING ENGINE...</p>
                </div>
             </div>
          )}
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            width: 'auto', 
            height: 'auto', 
            display: 'block', 
            borderRadius: '1.5rem',
            objectFit: 'contain' 
          }} />
      </div>

      {stateRef.current.showStats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ padding: '3rem', maxWidth: '600px', width: '90%', textAlign: 'center', border: '1px solid var(--accent-primary)' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f97316', marginBottom: '1rem' }}>SIMULATION COMPLETE</h2>
            <p style={{ color: '#999', marginBottom: '2rem' }}>300 Second Analysis Concluded</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left', marginBottom: '2.5rem' }}>
              {Object.keys(stateRef.current.vehiclesByDirection).map(dir => (
                <div key={dir} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem' }}>
                  <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{dir} Lane</label>
                  <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>{stateRef.current.vehiclesByDirection[dir].crossed} Passed</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--accent-gradient)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2.5rem' }}>
              <h3 style={{ color: '#fff', fontSize: '2rem', fontWeight: 900 }}>
                {Object.values(stateRef.current.vehiclesByDirection).reduce((acc, curr) => acc + (curr.crossed || 0), 0)}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Total Vehicles Processed</p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '1rem 2.5rem', borderRadius: '2rem', background: '#fff', color: '#000', fontWeight: 800, cursor: 'pointer', border: 'none' }}
            >
              RESTART SIMULATION
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        :root { --accent-primary: #f97316; --accent-gradient: linear-gradient(135deg, #f97316 0%, #fb7185 100%); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; }
      ` }} />
    </div>
  )
}

export default Simulator
