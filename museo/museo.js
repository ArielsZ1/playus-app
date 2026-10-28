import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { getTemporadas, getFechasTodas, getJugadores } from '../src/lib/queries.js'
import { armarMuseo } from '../src/lib/museo.js'

const canvas = document.querySelector('#webgl')
let scene, camera, renderer, modelPivot, gema, sparkParticles
const clock = new THREE.Clock()
let currentScroll = 0
let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0
let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2
let outerCursorX = window.innerWidth / 2, outerCursorY = window.innerHeight / 2
const shaderUniforms = { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, uMouse: { value: new THREE.Vector2(0, 0) }, uScroll: { value: 0 } }
const sparkCount = 450, sparkData = []
const sizes = { width: window.innerWidth, height: window.innerHeight }

// ---------- Contenido (datos reales) ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const num = (n) => n.toLocaleString('es-AR')
const plural = (n, uno, varios) => `${num(n)} ${n === 1 ? uno : varios}`
const html = (id, contenido) => {
  const el = document.getElementById(id)
  if (el) el.innerHTML = contenido
}

// "Temporada 2" … "Temporada 6" → "Temporadas 2 a 6"
function rangoTemporadas(nombres) {
  if (nombres.length === 1) return nombres[0]
  const n = nombres.map((x) => x.match(/^Temporada (\d+)$/)?.[1])
  return n.every(Boolean) ? `Temporadas ${n[0]} a ${n[n.length - 1]}` : nombres.join(', ')
}

async function cargarContenido() {
  try {
    const [temporadas, fechas, jugadores] = await Promise.all([getTemporadas(), getFechasTodas(), getJugadores()])
    const apodos = Object.fromEntries(jugadores.map((j) => [j.id, j.apodo]))
    const { origen: o, campeones, enJuego, leyenda, marcas } = armarMuseo(temporadas, fechas, apodos)

    html('origen-1', `${plural(o.temporadas, 'temporada', 'temporadas')}, ${plural(o.fechas, 'fecha jugada', 'fechas jugadas')} y ${plural(o.gemas, 'gema repartida', 'gemas repartidas')}. Cada fecha, un juego distinto: ${num(o.juegos)} juegos pasaron por la arena.`)
    html('origen-2', `${num(o.jugadores)} jugadores dejaron su marca. Todo empezó en ${esc(o.primera)}; hoy se juega ${esc(o.actual)}, y la historia sigue escribiéndose.`)

    html('placa-campeones', campeones.map((c) => `<div class="placa-fila"><span class="placa-temporada">${esc(rangoTemporadas(c.temporadas))}</span><span class="placa-nombre">${esc(c.apodo)}</span></div>`).join('') || '<span class="placa-temporada">Todavía no terminó ninguna temporada</span>')
    html('honor-desc', `Cada temporada corona un solo nombre, grabado para siempre en esta placa.${enJuego ? ` En ${esc(enJuego.temporada)}, todavía en juego, va ganando <strong>${esc(enJuego.apodo)}</strong>.` : ''}`)

    if (leyenda) {
      html('leyenda-desc', `<strong>${esc(leyenda.apodo)}</strong>: ${plural(leyenda.titulos, 'título', 'títulos')}, ${plural(leyenda.victorias, 'victoria', 'victorias')} y ${plural(leyenda.podios, 'podio', 'podios')} en ${num(leyenda.fechas)} fechas. ${esc(leyenda.arquetipo.descripcion)} <a class="slide-link" href="/jugador/${encodeURIComponent(leyenda.jugador_id)}">Ver su ficha →</a>`)
    }
    if (marcas.length) {
      html('marcas-desc', `Las mejores marcas del grupo en sus juegos más jugados:<br>${marcas.map((m) => `<strong>${esc(m.juego)}</strong> · ${esc(m.marca)} · ${esc(m.apodo)}`).join('<br>')}`)
    }
  } catch (err) {
    console.error('Museo: no se pudieron cargar los datos', err)
  }
}

// ---------- Escena ----------
function createBackgroundShader() {
  const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
  const fragmentShader = `
 varying vec2 vUv; uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uScroll;
 void main(){
 vec2 uv=(gl_FragCoord.xy-0.5*uResolution.xy)/uResolution.y;float aspect=uResolution.x/uResolution.y;
 float time=uTime*0.08;float scroll=uScroll;
 float angle1=0.6,angle2=-0.7,angle3=1.2;float freq1=2.4,freq2=3.2,freq3=4.0;
 vec2 warpedUv=uv;float scrollDeform=scroll*5.0;
 warpedUv.x+=sin(uv.y*2.5+time*0.2+scrollDeform)*0.35;
 warpedUv.y+=cos(uv.x*2.5-time*0.15-scrollDeform*0.8)*0.35;
 warpedUv.x+=sin(uv.y*1.2-time*0.1-scrollDeform*1.5)*0.25;
 warpedUv.y+=cos(uv.x*1.2+time*0.18+scrollDeform*1.2)*0.25;
 vec2 scrollDrift=vec2(scroll*0.04,-scroll*0.02);vec2 mouseShift=vec2(uMouse.x*aspect*0.05,uMouse.y*0.05);warpedUv+=scrollDrift+mouseShift;
 vec2 dir1=vec2(cos(angle1),sin(angle1)),dir2=vec2(cos(angle2),sin(angle2)),dir3=vec2(cos(angle3),sin(angle3));
 float w1=sin(dot(warpedUv,dir1)*freq1+time);float w2=cos(dot(warpedUv,dir2)*freq2-time*1.4+w1*0.4);float w3=sin(dot(warpedUv,dir3)*freq3+time*1.8+w2*0.5);
 float waveField=w1*0.50+w2*0.35+w3*0.15;
 float wideSheen=pow(max(0.0,1.0-abs(waveField-0.1)),2.5);float crispSpecular=pow(max(0.0,1.0-abs(waveField-0.15)),8.0);float crest=wideSheen*0.5+crispSpecular*0.9;
 vec3 c0_shadow=vec3(0.0010,0.0006,0.0004),c0_wave1=vec3(0.085,0.055,0.012),c0_wave2=vec3(0.050,0.030,0.006),c0_crest=vec3(0.50,0.36,0.14);
 vec3 c1_shadow=vec3(0.0006,0.0004,0.0012),c1_wave1=vec3(0.030,0.022,0.075),c1_wave2=vec3(0.016,0.012,0.050),c1_crest=vec3(0.24,0.32,0.62);
 float t=smoothstep(0.0,1.0,scroll);vec3 colShadow=mix(c0_shadow,c1_shadow,t),colWave1=mix(c0_wave1,c1_wave1,t),colWave2=mix(c0_wave2,c1_wave2,t),colCrest=mix(c0_crest,c1_crest,t);
 vec3 color=colShadow;color=mix(color,colWave2,smoothstep(-0.6,0.2,waveField));color=mix(color,colWave1,smoothstep(0.0,0.8,waveField));color+=colCrest*crest*1.4;
 float vignette=1.0-dot(uv,uv)*0.12;color*=vignette;gl_FragColor=vec4(color,1.0);
 }`
  const bgMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: shaderUniforms, depthWrite: false, depthTest: false })
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), bgMaterial)
  bgMesh.position.set(0, 0, -8)
  bgMesh.renderOrder = -10
  camera.add(bgMesh)
}

function createSparkTexture() {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,.85)')
  g.addColorStop(0.6, 'rgba(255,255,255,.3)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 16)
  return new THREE.CanvasTexture(c)
}

function createSparks() {
  const geometry = new THREE.BufferGeometry(), positions = new Float32Array(sparkCount * 3), colors = new Float32Array(sparkCount * 3)
  for (let i = 0; i < sparkCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6.5
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5 - 0.5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6.5
    // Chispas doradas y azul zafiro, los colores de Playus
    if (Math.random() < 0.65) {
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.15
      colors[i * 3 + 2] = 0.25 + Math.random() * 0.1
    } else {
      colors[i * 3] = 0.4 + Math.random() * 0.15
      colors[i * 3 + 1] = 0.55 + Math.random() * 0.12
      colors[i * 3 + 2] = 1
    }
    sparkData.push({ speedX: (Math.random() - 0.5) * 0.4, speedY: 0.15 + Math.random() * 0.3, speedZ: (Math.random() - 0.5) * 0.4, swaySpeed: 0.5 + Math.random() * 1.5, swayRadius: 0.05 + Math.random() * 0.15, phase: Math.random() * Math.PI * 2 })
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({ size: 0.025, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, map: createSparkTexture() })
  sparkParticles = new THREE.Points(geometry, material)
  scene.add(sparkParticles)
}

// Trofeo modelado por código: copa y pie por revolución, asas de medio toro, pedestal hexagonal y gema
function crearTrofeo() {
  const oro = new THREE.MeshStandardMaterial({ color: '#E8B54D', metalness: 1, roughness: 0.25, envMapIntensity: 0.9, side: THREE.DoubleSide })
  const pedestalMat = new THREE.MeshStandardMaterial({ color: '#251D4D', metalness: 0.4, roughness: 0.35, flatShading: true })
  const gemaMat = new THREE.MeshStandardMaterial({ color: '#6E9BFF', metalness: 0.1, roughness: 0.05, emissive: '#1d3a8a', emissiveIntensity: 0.7, flatShading: true })
  const perfil = (puntos) => puntos.map(([x, y]) => new THREE.Vector2(x, y))
  const trofeo = new THREE.Group()

  const copa = new THREE.Mesh(
    new THREE.LatheGeometry(perfil([[0, 1.05], [0.3, 1.08], [0.58, 1.22], [0.76, 1.5], [0.86, 1.85], [0.92, 2.2], [0.98, 2.26], [0.9, 2.26], [0.82, 1.9], [0.7, 1.55], [0.5, 1.32], [0, 1.25]]), 96),
    oro,
  )
  const pie = new THREE.Mesh(
    new THREE.LatheGeometry(perfil([[0, -0.42], [0.62, -0.42], [0.62, -0.3], [0.45, -0.24], [0.2, -0.05], [0.12, 0.35], [0.24, 0.5], [0.26, 0.6], [0.24, 0.7], [0.12, 0.82], [0.14, 1.06], [0, 1.08]]), 96),
    oro,
  )
  const asa = (lado) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 20, 64, Math.PI), oro)
    m.rotation.z = lado * Math.PI / 2
    m.position.set(lado * -0.8, 1.72, 0)
    return m
  }
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.45, 6), pedestalMat)
  pedestal.position.y = -0.65
  gema = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), gemaMat)
  gema.scale.set(1, 1.35, 0.6)
  gema.position.set(0, 1.72, 0.84)

  for (const m of [copa, pie, asa(1), asa(-1), pedestal, gema]) {
    m.castShadow = true
    m.receiveShadow = true
    trofeo.add(m)
  }
  return trofeo
}

function cargarTrofeo() {
  const trofeo = crearTrofeo()
  modelPivot = new THREE.Group()
  scene.add(modelPivot)
  modelPivot.add(trofeo)
  // Mismo encuadre que el modelo original: escala a 3.5 de alto y centrado
  const box = new THREE.Box3().setFromObject(trofeo), size = box.getSize(new THREE.Vector3())
  trofeo.scale.setScalar(3.5 / Math.max(size.x, size.y, size.z))
  trofeo.updateMatrixWorld(true)
  trofeo.position.sub(new THREE.Box3().setFromObject(trofeo).getCenter(new THREE.Vector3()))
  modelPivot.position.y = -0.4
}

function onWindowResize() {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  shaderUniforms.uResolution.value.set(sizes.width, sizes.height)
}

function splitTitlesIntoChars() {
  document.querySelectorAll('.slide-title').forEach((title) => {
    const source = title.innerHTML
    let newHTML = '', delayCounter = 0
    source.split(/(<br\s*\/?>)/i).forEach((part) => {
      if (part.toLowerCase().startsWith('<br')) newHTML += part
      else for (let i = 0; i < part.length; i++) {
        if (part[i] === ' ') newHTML += ' '
        else {
          newHTML += `<span class="char" style="transition-delay:${delayCounter * 0.035}s">${part[i]}</span>`
          delayCounter++
        }
      }
    })
    title.innerHTML = newHTML
  })
}

function updateGridDots(scroll) {
  document.querySelectorAll('.grid-dot').forEach((dot, i) => {
    const startY = (i * 17) % 80 + 10
    let speed = 90 + (i * 55) % 180
    if (i % 2 === 0) speed = -speed
    let y = startY + scroll * speed
    y = ((y % 100) + 100) % 100
    dot.style.top = `${y}%`
  })
}

function updateSlides(scroll) {
  for (let i = 1; i <= 4; i++) {
    const fill = document.getElementById(`dash-fill-${i}`)
    if (fill) {
      const start = (i - 1) * 0.25, end = i * 0.25
      const p = Math.max(0, Math.min(1, (scroll - start) / (end - start)))
      fill.style.height = `${p * 100}%`
    }
  }
  const active = (v, a, b) => v >= a && v <= b
  document.getElementById('slide-1')?.classList.toggle('active', active(scroll, -0.1, 0.12))
  const a2 = active(scroll, 0.28, 0.4)
  document.getElementById('slide-2')?.classList.toggle('active', a2)
  document.getElementById('slide-2-img')?.classList.toggle('active', a2)
  document.getElementById('slide-3')?.classList.toggle('active', active(scroll, 0.56, 0.68))
  document.getElementById('slide-4')?.classList.toggle('active', active(scroll, 0.84, 1.05))
}

function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach((link, index) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: maxScroll * [0, 0.34, 0.62, 0.94][index], behavior: 'smooth' })
    })
  })
}

function animate() {
  requestAnimationFrame(animate)
  const deltaTime = clock.getDelta()
  const time = clock.getElapsedTime()
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0
  currentScroll += (targetScroll - currentScroll) * 0.025
  mouseX += (targetMouseX - mouseX) * 0.05
  mouseY += (targetMouseY - mouseY) * 0.05
  outerCursorX += (cursorX - outerCursorX) * 0.2
  outerCursorY += (cursorY - outerCursorY) * 0.2
  const cursorOuter = document.querySelector('.cursor-outer')
  if (cursorOuter) {
    cursorOuter.style.left = `${outerCursorX}px`
    cursorOuter.style.top = `${outerCursorY}px`
  }
  if (modelPivot) {
    // Giro lento propio + reacción al mouse
    modelPivot.rotation.y = time * 0.15 + mouseX * 0.25
    modelPivot.rotation.x = mouseY * 0.15
  }
  if (gema) gema.material.emissiveIntensity = 0.55 + Math.sin(time * 2) * 0.25
  if (sparkParticles) {
    const positions = sparkParticles.geometry.attributes.position.array, scrollVelocity = Math.abs(targetScroll - currentScroll), speedMultiplier = 1 + scrollVelocity * 9, turbulence = scrollVelocity * 0.8
    for (let i = 0; i < sparkCount; i++) {
      const idx = i * 3, data = sparkData[i]
      positions[idx] += data.speedX * deltaTime * speedMultiplier
      positions[idx + 1] += data.speedY * deltaTime * speedMultiplier
      positions[idx + 2] += data.speedZ * deltaTime * speedMultiplier
      const sway = data.swayRadius * (1 + turbulence * 4)
      positions[idx] += Math.sin(time * data.swaySpeed + data.phase) * sway * deltaTime
      positions[idx + 2] += Math.cos(time * data.swaySpeed + data.phase) * sway * deltaTime
      if (positions[idx + 1] > 3 || Math.abs(positions[idx]) > 3.5 || Math.abs(positions[idx + 2]) > 3.5) {
        positions[idx + 1] = -2.5
        positions[idx] = (Math.random() - 0.5) * 3
        positions[idx + 2] = (Math.random() - 0.5) * 3
      }
    }
    sparkParticles.geometry.attributes.position.needsUpdate = true
  }
  const phi = currentScroll * Math.PI * 2, y = 0.35 + Math.sin(currentScroll * Math.PI) * 0.8, radius = 4.2 - Math.sin(currentScroll * Math.PI) * 0.6
  const transitionProgress = Math.min(1, currentScroll / 0.28), easeFactor = (Math.cos(transitionProgress * Math.PI) + 1) * 0.5, lookAtXOffset = -0.9 * easeFactor
  camera.position.lerp(new THREE.Vector3(radius * Math.sin(phi), y, radius * Math.cos(phi)), 0.025)
  camera.lookAt(new THREE.Vector3(lookAtXOffset, -0.15, 0))
  shaderUniforms.uTime.value = time
  shaderUniforms.uMouse.value.set(mouseX, -mouseY)
  shaderUniforms.uScroll.value = currentScroll
  updateSlides(currentScroll)
  updateGridDots(currentScroll)
  renderer.render(scene, camera)
}

window.addEventListener('mousemove', (event) => {
  cursorX = event.clientX
  cursorY = event.clientY
  const inner = document.querySelector('.cursor-inner')
  if (inner) {
    inner.style.left = `${cursorX}px`
    inner.style.top = `${cursorY}px`
  }
  targetMouseX = (event.clientX / window.innerWidth) * 2 - 1
  targetMouseY = (event.clientY / window.innerHeight) * 2 - 1
})
window.addEventListener('resize', () => {
  if (camera && renderer) onWindowResize()
})

splitTitlesIntoChars()
cargarContenido()
scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')
scene.fog = new THREE.FogExp2('#000000', 0.01)
camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0.2, 3)
scene.add(camera)
createBackgroundShader()
renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.6
// Reflejos para que el metal se vea dorado y no negro
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
scene.add(new THREE.AmbientLight('#ffffff', 0.1))
const keyLight = new THREE.SpotLight('#ffffff', 18)
keyLight.position.set(4, 6, 3)
keyLight.angle = Math.PI / 4
keyLight.penumbra = 0.9
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.near = 1
keyLight.shadow.camera.far = 15
keyLight.shadow.bias = -0.001
scene.add(keyLight)
const rimLight = new THREE.DirectionalLight('#e3f2ff', 6)
rimLight.position.set(-5, 3, -4)
scene.add(rimLight)
const fillLight = new THREE.DirectionalLight('#fff3e6', 0.8)
fillLight.position.set(-2, -4, 2)
scene.add(fillLight)
createSparks()
cargarTrofeo()
onWindowResize()
animate()
setupNavigation()
