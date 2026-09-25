import * as THREE from 'three'
import { C } from '../config.js'
import { signTexture, bannerTexture, makeCanvas, roundRect, font } from './textures.js'

const mats = {}
function mat(key, opts) {
  if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(opts)
  return mats[key]
}

export const MAT = {
  dark: () => mat('dark', { color: '#1E182B', roughness: 0.5, metalness: 0.3 }),
  glass: () => mat('glass', { color: C.glass, roughness: 0.3, metalness: 0.35 }),
  metal: () => mat('metal', { color: '#4A4258', roughness: 0.4, metalness: 0.6 }),
  screen: () => mat('screen', { color: '#2B2142', emissive: C.primary, emissiveIntensity: 0.55, roughness: 0.3 }),
  paper: () => mat('paper', { color: '#EDE8F7', roughness: 0.9 }),
}

function shadowed(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return obj
}

// 스탠딩 테이블 — 팀 한 곳의 중심
export function standingTable(accent = C.primary, kind = 'laptop') {
  const g = new THREE.Group()
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 32), MAT.glass())
  top.position.y = 1.0
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: accent }))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 1.03
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.0, 10), MAT.metal())
  stem.position.y = 0.5
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.04, 24), MAT.metal())
  base.position.y = 0.02
  g.add(top, rim, stem, base)
  if (kind === 'laptop') g.add(laptop(0.08, -0.05, 0.4), laptop(-0.14, 0.12, -2.4))
  if (kind === 'monitor') g.add(monitor())
  if (kind === 'sketch') g.add(sketchPad(0.1, 0), sketchPad(-0.15, 0.1))
  if (kind === 'camera') g.add(laptop(0, 0, 0))
  return shadowed(g)
}

function laptop(x, z, rotY) {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.21), MAT.metal())
  const scr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.01), MAT.metal())
  scr.position.set(0, 0.1, -0.1)
  scr.rotation.x = -0.25
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.17), MAT.screen())
  glow.position.set(0, 0.1, -0.093)
  glow.rotation.x = -0.25
  g.add(base, scr, glow)
  g.position.set(x, 1.035, z)
  g.rotation.y = rotY
  return g
}

function monitor() {
  const g = new THREE.Group()
  const scr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.03), MAT.metal())
  scr.position.y = 1.36
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), MAT.screen())
  glow.position.set(0, 1.36, 0.017)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), MAT.metal())
  arm.position.y = 1.18
  g.add(scr, glow, arm)
  return g
}

function sketchPad(x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.36), MAT.paper())
  m.position.set(x, 1.035, z)
  m.rotation.y = x * 2
  return m
}

// 스튜디오 표지판
export function sign(opts, width = 2.6) {
  const g = new THREE.Group()
  const tex = signTexture(opts)
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 2),
    new THREE.MeshBasicMaterial({ map: tex, color: '#c6c2cf', transparent: true, side: THREE.DoubleSide }),
  )
  panel.position.y = 1.9
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), MAT.metal())
  post.position.y = 0.7
  g.add(panel, post)
  return g
}

// 동아리 배너(세로 깃발)
export function clubBanner(name, field) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8), MAT.metal())
  pole.position.y = 1.7
  const tex = bannerTexture(name, field)
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 2.1),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: '#ffffff',
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  )
  flag.position.set(0.38, 2.25, 0)
  g.add(pole, flag)
  return shadowed(g)
}

// 원형 바닥 패드 — 스튜디오의 영역 표시
export function floorPad(radius, color) {
  const g = new THREE.Group()
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.MeshStandardMaterial({ color: '#1C1629', roughness: 0.6, metalness: 0.2 }),
  )
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.006
  pad.receiveShadow = true
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.04, radius, 128),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.012
  g.add(pad, ring)
  return g
}

// 팀 프로토타입 화면 — 진행도에 따라 UI 요소가 하나씩 채워진다
export function deviceCanvas() {
  return makeCanvas(256, 480)
}

export function drawDevice(canvas, team, progress) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#171321'
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.fill()
  ctx.strokeStyle = team.color
  ctx.lineWidth = 4
  roundRect(ctx, 2, 2, W - 4, H - 4, 28)
  ctx.stroke()

  const p = progress
  const step = (t) => p >= t
  // 헤더
  if (step(0.05)) {
    ctx.fillStyle = team.color
    ctx.font = font(800, 26)
    ctx.fillText(team.project, 22, 56)
    ctx.fillStyle = C.textMeta
    ctx.font = font(500, 15)
    ctx.fillText(`팀 ${team.name} · 프로토타입 v${Math.max(1, Math.round(p * 5))}`, 22, 82)
  }
  // 본문 — 팀 유형별 메인 비주얼
  const top = 104
  if (step(0.2)) {
    ctx.fillStyle = 'rgba(200,185,242,0.1)'
    roundRect(ctx, 18, top, W - 36, 170, 14)
    ctx.fill()
    ctx.strokeStyle = team.color
    ctx.fillStyle = team.color
    ctx.lineWidth = 3
    if (team.id === 't-ongi') {
      // 지도 + 핀
      for (let i = 0; i < 7; i++) {
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        ctx.moveTo(30, top + 20 + i * 22)
        ctx.bezierCurveTo(90, top + 5 + i * 25, 150, top + 40 + i * 18, W - 30, top + 18 + i * 22)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const pins = Math.floor(p * 8)
      for (let i = 0; i < pins; i++) {
        const x = 50 + ((i * 53) % (W - 100))
        const y = top + 30 + ((i * 37) % 120)
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (team.id === 't-mulgil') {
      // 저수율 게이지
      const level = 0.25 + p * 0.5
      ctx.globalAlpha = 0.3
      roundRect(ctx, 90, top + 18, 76, 136, 12)
      ctx.fill()
      ctx.globalAlpha = 1
      roundRect(ctx, 90, top + 18 + 136 * (1 - level), 76, 136 * level, 12)
      ctx.fill()
      ctx.fillStyle = C.text
      ctx.font = font(800, 26)
      ctx.fillText(`${Math.round(level * 100)}%`, 96, top + 96)
    } else if (team.id === 't-dajeong') {
      // 큰 버튼 키오스크
      const n = 1 + Math.floor(p * 4)
      for (let i = 0; i < Math.min(4, n); i++) {
        const x = 30 + (i % 2) * 102
        const y = top + 14 + Math.floor(i / 2) * 76
        ctx.globalAlpha = 0.85
        roundRect(ctx, x, y, 92, 66, 12)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    } else {
      // 스토리북 페이지
      const pages = 1 + Math.floor(p * 6)
      for (let i = 0; i < pages; i++) {
        ctx.globalAlpha = 0.25 + i * 0.12
        roundRect(ctx, 34 + i * 12, top + 16 + i * 6, 120, 130, 8)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }
  // 카드 목록
  const cards = Math.floor(Math.max(0, p - 0.35) * 8)
  for (let i = 0; i < Math.min(4, cards); i++) {
    const y = top + 188 + i * 38
    ctx.fillStyle = 'rgba(200,185,242,0.12)'
    roundRect(ctx, 18, y, W - 36, 30, 8)
    ctx.fill()
    ctx.fillStyle = team.color
    ctx.fillRect(28, y + 11, 60 + ((i * 37) % 80), 8)
  }
  // 하단 버튼
  if (step(0.6)) {
    ctx.fillStyle = team.color
    roundRect(ctx, 18, H - 66, W - 36, 44, 12)
    ctx.fill()
    ctx.fillStyle = C.bg
    ctx.font = font(800, 18)
    ctx.textAlign = 'center'
    ctx.fillText(p >= 0.95 ? '배포 완료 · 사용해 보기' : '시작하기', W / 2, H - 38)
    ctx.textAlign = 'left'
  }
}

export function deviceMesh(texture, color) {
  const g = new THREE.Group()
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.12, 0.04),
    new THREE.MeshStandardMaterial({ color: '#241C36', emissive: color, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.4 }),
  )
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 1.08),
    new THREE.MeshBasicMaterial({ map: texture, color: '#c6c2cf', transparent: true }),
  )
  screen.position.z = 0.022
  const back = screen.clone()
  back.rotation.y = Math.PI
  back.position.z = -0.022
  g.add(frame, screen, back)
  return g
}
