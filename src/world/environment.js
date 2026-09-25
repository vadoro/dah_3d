import * as THREE from 'three'
import { C, LAYOUT } from '../config.js'
import { glowTexture } from './textures.js'

// 블룸 임계값을 넘도록 밝기를 올린 색(HDR)
export const glow = (hex, k) => new THREE.Color(hex).multiplyScalar(k)

// 우주 배경(별 · 성운), 조명, 떠 있는 두 개의 섬(메인 플랫폼 · 전시 섬)과 다리
export function buildEnvironment(scene) {
  scene.background = new THREE.Color(C.bg)
  scene.fog = new THREE.FogExp2(C.bg, 0.0065)

  const env = new THREE.Group()
  env.name = 'environment'
  scene.add(env)

  env.add(buildStars())
  env.add(buildNebula())

  // 조명: 보라빛 하늘광 + 따뜻한 오프화이트 키라이트
  const hemi = new THREE.HemisphereLight(C.light, C.bg, 0.9)
  env.add(hemi)
  const key = new THREE.DirectionalLight(C.text, 1.6)
  key.position.set(18, 36, 22)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera
  sc.left = -30
  sc.right = 30
  sc.top = 30
  sc.bottom = -70
  sc.near = 1
  sc.far = 120
  key.shadow.bias = -0.0006
  key.shadow.normalBias = 0.02
  key.target.position.set(0, 0, -12)
  env.add(key, key.target)
  const rim = new THREE.DirectionalLight(C.primary, 1.1)
  rim.position.set(-20, 14, -40)
  env.add(rim)

  env.add(buildIsland(LAYOUT.zones.agora.center, LAYOUT.platformRadius, { rings: [3.4, 8.5, 19.5], main: true }))
  env.add(buildIsland(LAYOUT.zones.gallery.center, LAYOUT.galleryRadius, { rings: [5.5, 11.2] }))
  env.add(buildBridge())
  env.add(buildPaths())

  return { group: env, keyLight: key }
}

function buildStars() {
  const count = 4200
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const a = new THREE.Color(C.text)
  const b = new THREE.Color(C.light)
  const c = new THREE.Color(C.mid)
  for (let i = 0; i < count; i++) {
    // 구 껍질에 고르게 분포
    const r = 160 + Math.random() * 220
    const u = Math.random() * 2 - 1
    const t = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    pos[i * 3] = r * s * Math.cos(t)
    pos[i * 3 + 1] = r * u * 0.8 + 20
    pos[i * 3 + 2] = r * s * Math.sin(t)
    const pick = Math.random()
    const colr = pick < 0.6 ? a : pick < 0.85 ? b : c
    col[i * 3] = colr.r
    col[i * 3 + 1] = colr.g
    col[i * 3 + 2] = colr.b
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    map: glowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.name = 'stars'
  return pts
}

function buildNebula() {
  const g = new THREE.Group()
  const tex1 = glowTexture('rgba(129,95,215,0.55)', 'rgba(129,95,215,0)', 256)
  const tex2 = glowTexture('rgba(104,68,196,0.5)', 'rgba(104,68,196,0)', 256)
  const spots = [
    [-120, 60, -220, 260, tex1],
    [150, 20, -160, 220, tex2],
    [40, 110, -260, 300, tex1],
    [-200, -40, 60, 240, tex2],
    [180, 80, 140, 200, tex1],
  ]
  for (const [x, y, z, s, tex] of spots) {
    const m = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.32,
      fog: false,
      blending: THREE.AdditiveBlending,
    })
    const sp = new THREE.Sprite(m)
    sp.position.set(x, y, z)
    sp.scale.setScalar(s)
    g.add(sp)
  }
  return g
}

// 윗면은 어두운 유리 바닥, 아랫면은 각진 크리스털 — 우주에 떠 있는 섬
function buildIsland(center, radius, { rings = [], main = false } = {}) {
  const g = new THREE.Group()
  g.position.copy(center)

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.6, 128),
    new THREE.MeshStandardMaterial({ color: C.bg2, roughness: 0.55, metalness: 0.25 }),
  )
  top.position.y = -0.3
  top.receiveShadow = true
  top.name = 'floor'
  g.add(top)

  const under = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.99, radius * 0.18, radius * 0.55, 14, 3),
    new THREE.MeshStandardMaterial({
      color: '#1B1528',
      emissive: C.deepDark,
      emissiveIntensity: 0.12,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    }),
  )
  under.position.y = -0.6 - radius * 0.275
  g.add(under)

  // 가장자리 발광 링
  const edge = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 8, 200), new THREE.MeshBasicMaterial({ color: glow(C.primary, 3) }))
  edge.rotation.x = Math.PI / 2
  edge.position.y = 0.01
  g.add(edge)

  // 헤어라인 동심원
  for (const r of rings) {
    const curve = new THREE.EllipseCurve(0, 0, r, r)
    const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, 0.012, p.y))
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: C.light, transparent: true, opacity: 0.16 }),
    )
    g.add(line)
  }

  if (main) {
    // 아래쪽 은은한 보라빛 — 섬이 떠 있는 느낌
    const glow = new THREE.PointLight(C.primary, 60, 40, 2)
    glow.position.set(0, -8, 0)
    g.add(glow)
  }
  return g
}

function buildBridge() {
  const g = new THREE.Group()
  const { from, to } = LAYOUT.bridge
  const len = from.z - to.z + 4
  const midZ = (from.z + to.z) / 2
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.3, len),
    new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.4, metalness: 0.3 }),
  )
  deck.position.set(0, -0.16, midZ)
  deck.receiveShadow = true
  g.add(deck)
  // 양쪽 발광 레일
  for (const x of [-1.6, 1.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), new THREE.MeshBasicMaterial({ color: glow(C.light, 1.8) }))
    rail.position.set(x, 0.9, midZ)
    g.add(rail)
    for (let z = from.z + 1; z > to.z - 1; z -= 2.2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), new THREE.MeshStandardMaterial({ color: C.textMeta }))
      post.position.set(x, 0.45, z)
      g.add(post)
    }
  }
  return g
}

// 아고라에서 각 스튜디오로 이어지는 은은한 빛의 길 — "연결되는 지성"
function buildPaths() {
  const g = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: C.primary, transparent: true, opacity: 0.18, depthWrite: false })
  const ends = [
    [LAYOUT.zones.D.center, 3.4, 8.5],
    [LAYOUT.zones.A.center, 3.4, 8.5],
    [LAYOUT.zones.H.center, 3.4, 8],
    [LAYOUT.zones.field.center, 3.4, 9],
  ]
  for (const [c, r0, r1] of ends) {
    const dir = c.clone().setY(0).normalize()
    const len = r1 - r0
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, len), mat)
    strip.rotation.x = -Math.PI / 2
    strip.rotation.z = -Math.atan2(dir.x, -dir.z)
    strip.position.copy(dir.clone().multiplyScalar(r0 + len / 2)).setY(0.015)
    g.add(strip)
  }
  return g
}
