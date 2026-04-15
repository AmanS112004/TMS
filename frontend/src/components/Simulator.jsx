import React, { useEffect, useRef, useState } from 'react'

// --- SIMULATION CONSTANTS ---
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 922
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
const baseStartY = { right: [348, 370, 398], down: [0, 0, 0], left: [498, 466, 436], up: [922, 922, 922] }

const signalCoods = [[530, 230], [810, 230], [810, 570], [530, 570]]
const signalTimerCoods = [[530, 210], [810, 210], [810, 550], [530, 550]]

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
    }
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

    stateRef.current.signals = [
      new TrafficSignal(0, 5, 20),
      new TrafficSignal(25, 5, 20),
      new TrafficSignal(150, 5, 20),
      new TrafficSignal(150, 5, 20)
    ]

    const timer = setInterval(() => {
      const s = stateRef.current
      const sig = s.signals[s.currentGreen]
      if (s.currentYellow === 0) {
        sig.green--
        if (sig.green <= 0) s.currentYellow = 1
      } else {
        sig.yellow--
        if (sig.yellow <= 0) {
          s.currentYellow = 0
          sig.green = 20; sig.yellow = 5; sig.red = 150
          s.currentGreen = s.nextGreen
          s.nextGreen = (s.currentGreen + 1) % 4
        }
      }
      s.signals.forEach((sig, i) => { if (i !== s.currentGreen) sig.red-- })
    }, 1000)

    const spawner = setInterval(() => {
      if (!isLoaded) return
      const s = stateRef.current
      const typeNum = Math.floor(Math.random() * 5)
      const lane = typeNum === 4 ? 0 : Math.floor(Math.random() * 2) + 1
      const dirNum = Math.floor(Math.random() * 4)
      const dir = directionNumbers[dirNum]
      const type = vehicleTypes[typeNum]
      s.allVehicles.push(new Vehicle(lane, type, dirNum, dir, imagesRef.current[dir][type], s))
    }, 800)

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

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', width: '100%', maxWidth: '1600px' }}>
         <div className="card" style={{ padding: '1.5rem', minWidth: '200px' }}>
            <h4 style={{ color: '#999', fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase' }}>Frame Rate</h4>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f97316' }}>60.0 FPS</span>
         </div>
         <div className="card" style={{ padding: '1.5rem', minWidth: '200px' }}>
            <h4 style={{ color: '#999', fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase' }}>Active Sprites</h4>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fb7185' }}>DYNAMIC</span>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; }
      ` }} />
    </div>
  )
}

export default Simulator
