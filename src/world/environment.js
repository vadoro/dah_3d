import * as THREE from 'three'
import { C, LAYOUT } from '../config.js'
import { makeCanvas, toTexture } from './textures.js'
import { MOTIF } from './letters.js'

// 블룸 임계값을 넘도록 밝기를 올린 색(HDR)
export const glow = (hex, k) => new THREE.Color(hex).multiplyScalar(k)

const rand = (seed) => {
  const x = Math.sin(seed * 91.7 + 17.3) * 43758.5453
  return x - Math.floor(x)
}

// 등각 디오라마: 우주 배경 위에 떠 있는 정사각형 타일 섬 두 개(메인 · 전시 섬)와 직선 다리
export function buildEnvironment(scene) {
  scene.background = skyTexture()

  const env = new THREE.Group()
  env.name = 'environment'
  scene.add(env)

  // 조명: 등각 일러스트처럼 윗면이 가장 밝고, 왼쪽 면은 중간, 오른쪽 면은 어둡게 보이도록
  // 키라이트를 카메라 왼쪽 앞에 두고, 시점을 돌리면 함께 돈다(setAzimuth).
  const hemi = new THREE.HemisphereLight('#D9D0F2', '#1B1528', 1.05)
  env.add(hemi)
  const center = new THREE.Vector3(0, 0, -13)
  const key = new THREE.DirectionalLight('#F7F5FC', 2.3)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera
  sc.left = -56
  sc.right = 56
  sc.top = 56
  sc.bottom = -56
  sc.near = 1
  sc.far = 200
  key.shadow.bias = -0.0005
  key.shadow.normalBias = 0.03
  key.target.position.copy(center)
  env.add(key, key.target)
  const fill = new THREE.DirectionalLight(C.light, 0.45)
  env.add(fill)

  function setAzimuth(az) {
    const a = az - THREE.MathUtils.degToRad(32)
    const el = THREE.MathUtils.degToRad(56)
    key.position
      .set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el))
      .multiplyScalar(90)
      .add(center)
    const b = az + Math.PI * 0.6
    fill.position
      .set(Math.sin(b) * 0.6, 0.5, Math.cos(b) * 0.6)
      .multiplyScalar(60)
      .add(center)
  }
  setAzimuth(Math.PI / 4)

  env.add(buildSlab(LAYOUT.zones.agora.center, LAYOUT.platformHalf, mainTileColor, { main: true }))
  env.add(buildSlab(LAYOUT.zones.gallery.center, LAYOUT.galleryHalf, galleryTileColor, {}))
  env.add(buildBridge())
  env.add(buildDecor())

  return { group: env, keyLight: key, setAzimuth }
}

// 화면에 고정되는 하늘: 보라빛 그라데이션 + 별 + 성운 (직교 카메라에서도 늘 같은 하늘)
function skyTexture() {
  const W = 1600
  const H = 1000
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1E1733')
  g.addColorStop(0.55, '#130F21')
  g.addColorStop(1, '#0C0A14')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  for (const [x, y, r, c] of [
    [0.18, 0.22, 520, 'rgba(129,95,215,0.22)'],
    [0.82, 0.3, 460, 'rgba(104,68,196,0.2)'],
    [0.55, 0.85, 600, 'rgba(75,45,153,0.18)'],
  ]) {
    const rg = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r)
    rg.addColorStop(0, c)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, W, H)
  }
  for (let i = 0; i < 900; i++) {
    const x = rand(i) * W
    const y = rand(i + 0.5) * H
    const big = rand(i + 0.7) > 0.96
    ctx.globalAlpha = 0.25 + rand(i + 0.3) * 0.65
    ctx.fillStyle = rand(i + 0.9) > 0.7 ? '#C8B9F2' : '#F7F5FC'
    ctx.fillRect(x, y, big ? 2.2 : 1.2, big ? 2.2 : 1.2)
  }
  ctx.globalAlpha = 1
  return toTexture(canvas)
}

/* ── 타일 색: 길 · 아고라 광장 · 스튜디오 바닥 ── */
const BASE = new THREE.Color('#2C2442')
const PATH = new THREE.Color('#3D3360')
const PLAZA_A = new THREE.Color('#463A6E')
const PLAZA_B = new THREE.Color('#3A3059')
const tint = (hex, k) => BASE.clone().lerp(new THREE.Color(hex), k)
const ZONE_TILES = [
  { x0: -20, x1: -8, z0: -6, z1: 6, color: tint(MOTIF.D, 0.16) },
  { x0: 8, x1: 20, z0: -6, z1: 6, color: tint(MOTIF.A, 0.16) },
  { x0: -6, x1: 6, z0: -20, z1: -6, color: tint(MOTIF.H, 0.2) },
  { x0: -8, x1: 8, z0: 8, z1: 20, color: tint('#C8B9F2', 0.1) },
]

function mainTileColor(x, z) {
  if (Math.abs(x) <= 5 && Math.abs(z) <= 5) return (Math.round((x + z) / 2) & 1) === 0 ? PLAZA_A : PLAZA_B
  for (const zt of ZONE_TILES) if (x > zt.x0 && x < zt.x1 && z > zt.z0 && z < zt.z1) return zt.color
  if (Math.abs(x) <= 1 || Math.abs(z) <= 1) return PATH
  return BASE
}

function galleryTileColor(x, z) {
  return (Math.round((x + z) / 2) & 1) === 0 ? new THREE.Color('#3B3158') : new THREE.Color('#332A4D')
}

// 떠 있는 정사각형 섬: 타일 윗면 + 계단식으로 좁아지는 지층(아랫면) + 가장자리 발광선
function buildSlab(center, half, colorAt, { main = false } = {}) {
  const g = new THREE.Group()
  g.position.copy(center)
  const T = LAYOUT.tile
  const n = Math.round((half * 2) / T)

  // 타일 — 사이 틈이 격자선이 된다
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(T - 0.07, 0.24, T - 0.07),
    new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 }),
    n * n,
  )
  const m4 = new THREE.Matrix4()
  const col = new THREE.Color()
  let k = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = -half + T / 2 + i * T
      const z = -half + T / 2 + j * T
      m4.makeTranslation(x, -0.12, z)
      tiles.setMatrixAt(k, m4)
      col.copy(colorAt(x + center.x, z + center.z)).offsetHSL(0, 0, (rand(k + center.z) - 0.5) * 0.025)
      tiles.setColorAt(k, col)
      k++
    }
  }
  tiles.receiveShadow = true
  tiles.name = 'floor'
  g.add(tiles)

  // 타일 아래 판 + 계단식 지층
  const strata = [
    { inset: 0, h: 1.2, color: '#1A1428' },
    { inset: 3, h: 2.2, color: '#2A1F4A' },
    { inset: 7, h: 2.2, color: '#221940' },
    { inset: 12, h: 2.4, color: '#1A1333' },
    { inset: 17, h: 2.4, color: '#140F27' },
  ]
  let y = -0.24
  strata.forEach((s, idx) => {
    const w = half * 2 - s.inset * 2 * (half / 24)
    if (w <= 1) return
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(w, s.h, w),
      new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.9, emissive: C.deepDark, emissiveIntensity: 0.05 + idx * 0.02 }),
    )
    box.position.y = y - s.h / 2
    box.castShadow = idx === 0
    box.receiveShadow = true
    g.add(box)
    // 계단 위에 박힌 데이터 크리스털
    if (idx > 0) {
      for (let c = 0; c < 6; c++) {
        const side = c % 4
        const along = (rand(c * 7 + idx + center.z) - 0.5) * (w - 2)
        const edge = w / 2 + (half * 2 - strata[idx - 1].inset * 2 * (half / 24) - w) / 4
        const px = side === 0 ? along : side === 1 ? along : side === 2 ? edge : -edge
        const pz = side === 0 ? edge : side === 1 ? -edge : along
        const size = 0.35 + rand(c + idx * 3) * 0.4
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(size, size, size),
          new THREE.MeshStandardMaterial({ color: C.mid, emissive: C.primary, emissiveIntensity: 1.6 }),
        )
        cube.position.set(px, y + size / 2, pz)
        cube.rotation.y = rand(c) * Math.PI
        g.add(cube)
      }
    }
    y -= s.h
  })

  // 가장자리 발광선
  const edgeMat = new THREE.MeshBasicMaterial({ color: glow(C.primary, 2.6) })
  for (const [sx, sz, w, d] of [
    [0, half, half * 2 + 0.12, 0.08],
    [0, -half, half * 2 + 0.12, 0.08],
    [half, 0, 0.08, half * 2 + 0.12],
    [-half, 0, 0.08, half * 2 + 0.12],
  ]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), edgeMat)
    e.position.set(sx, 0.01, sz)
    g.add(e)
  }

  if (main) {
    const under = new THREE.PointLight(C.primary, 120, 50, 2)
    under.position.set(0, -12, 0)
    g.add(under)
  }
  return g
}

function buildBridge() {
  const g = new THREE.Group()
  const z0 = -LAYOUT.platformHalf
  const z1 = LAYOUT.zones.gallery.center.z + LAYOUT.galleryHalf
  const L = z0 - z1
  const N = 7
  const step = L / N
  const deckMat = new THREE.MeshStandardMaterial({ color: '#3D3360', roughness: 0.75 })
  const postMat = new THREE.MeshStandardMaterial({ color: '#E4DDF7', roughness: 0.6 })
  for (let i = 0; i < N; i++) {
    const z = z0 - (i + 0.5) * step
    const d = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, step - 0.07), deckMat)
    d.position.set(0, -0.12, z)
    d.receiveShadow = true
    g.add(d)
    for (const x of [-1.5, 1.5]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), postMat)
      p.position.set(x, 0.4, z)
      p.castShadow = true
      g.add(p)
    }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, L), new THREE.MeshStandardMaterial({ color: '#221940', roughness: 0.9 }))
  beam.position.set(0, -0.64, (z0 + z1) / 2)
  beam.castShadow = true
  g.add(beam)
  const railMat = new THREE.MeshBasicMaterial({ color: glow(C.light, 1.8) })
  for (const x of [-1.5, 1.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, L), railMat)
    rail.position.set(x, 0.84, (z0 + z1) / 2)
    g.add(rail)
  }
  return g
}

/* ── 장식: 큐브 나무 · 가로등 · 벤치 (사람이 다니는 길과 팀 자리는 피해서 가장자리에만) ── */
function cubeTree(seed) {
  const t = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), new THREE.MeshStandardMaterial({ color: '#4A3A6E' }))
  trunk.position.y = 0.55
  t.add(trunk)
  const greens = ['#A286E9', '#C8B9F2', '#815FD7']
  const s1 = 1.5 + rand(seed) * 0.5
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(s1, s1, s1), new THREE.MeshStandardMaterial({ color: greens[seed % 3], roughness: 0.7 }))
  c1.position.y = 1.1 + s1 / 2
  t.add(c1)
  const s2 = s1 * 0.6
  const c2 = new THREE.Mesh(
    new THREE.BoxGeometry(s2, s2, s2),
    new THREE.MeshStandardMaterial({ color: greens[(seed + 1) % 3], roughness: 0.7 }),
  )
  c2.position.set(0.15, 1.1 + s1 + s2 / 2 - 0.05, -0.1)
  t.add(c2)
  t.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return t
}

function lamp() {
  const l = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), new THREE.MeshStandardMaterial({ color: '#E4DDF7' }))
  pole.position.y = 1.3
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshBasicMaterial({ color: glow('#E9E4F5', 1.6) }))
  head.position.y = 2.75
  pole.castShadow = true
  l.add(pole, head)
  return l
}

function bench() {
  const b = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: '#E4DDF7', roughness: 0.6 })
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.6), mat)
  seat.position.y = 0.48
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.12), mat)
  back.position.set(0, 0.8, -0.26)
  for (const x of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.5), mat)
    leg.position.set(x, 0.21, 0)
    b.add(leg)
  }
  b.add(seat, back)
  b.traverse((o) => o.isMesh && (o.castShadow = true))
  return b
}

function buildDecor() {
  const g = new THREE.Group()
  const H = LAYOUT.platformHalf - 2.5
  const G = LAYOUT.zones.gallery.center
  const trees = [
    [-H, -H],
    [H, -H],
    [-H, H],
    [H, H],
    [-H, 12],
    [H, 12],
    [-H, -12],
    [H, -12],
    [-12, H],
    [12, H],
    [-12, -H],
    [12, -H],
    [G.x - 11, G.z + 11],
    [G.x + 11, G.z + 11],
  ]
  trees.forEach(([x, z], i) => {
    const t = cubeTree(i)
    t.position.set(x, 0, z)
    t.rotation.y = (i % 4) * (Math.PI / 2)
    g.add(t)
  })
  for (const [x, z] of [
    [-21.8, 6],
    [-21.8, -6],
    [21.8, 6],
    [21.8, -6],
    [-6, 21.8],
    [6, 21.8],
    [-3.6, -22.2],
    [3.6, -22.2],
  ]) {
    const l = lamp()
    l.position.set(x, 0, z)
    g.add(l)
  }
  for (const [x, z, yaw] of [
    [-17, 22.2, Math.PI],
    [17, 22.2, Math.PI],
    [-17, -22.2, 0],
    [17, -22.2, 0],
  ]) {
    const b = bench()
    b.position.set(x, 0, z)
    b.rotation.y = yaw
    g.add(b)
  }
  return g
}
