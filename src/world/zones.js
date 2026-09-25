import * as THREE from 'three'
import { C, LAYOUT } from '../config.js'
import { DAH, exhibitionName } from '../data/dah.js'
import { letterMesh, MOTIF } from './letters.js'
import { glow } from './environment.js'
import { standingTable, sign, clubBanner, floorPad, deviceCanvas, drawDevice, deviceMesh, MAT } from './props.js'
import { makeCanvas, toTexture, font, roundRect, wrapText, glowTexture, captionTexture } from './textures.js'

const V = (x, z, y = 0) => new THREE.Vector3(x, y, z)
const lerp = THREE.MathUtils.lerp
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const rand = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function yawTo(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

function place(obj, pos, yaw = 0) {
  obj.position.copy(pos)
  obj.rotation.y = yaw
  return obj
}

function shadow(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return obj
}

// 모든 스튜디오의 팀 자리: 0·1 = 아고라 쪽 앞줄, 2·3 = 뒷줄
function spotsFor(center, forward, right, front = 2.4, back = 2.2, side = 2.6) {
  const at = (f, r) => center.clone().addScaledVector(forward, f).addScaledVector(right, r)
  return [at(front, -side), at(front, side), at(-back, -side), at(-back, side)]
}

/* ───────────────────────── 아고라: 원탁 · 홀로그램 · 패널 ───────────────────────── */
function buildAgora() {
  const g = new THREE.Group()
  const c = LAYOUT.zones.agora.center
  const R = LAYOUT.agoraRadius

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 0.08, 96),
    new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.25, metalness: 0.45 }),
  )
  top.position.y = 0.8
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 160), new THREE.MeshBasicMaterial({ color: glow(C.light, 2.2) }))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.845
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.85, 0.8, 32), MAT.metal())
  ped.position.y = 0.4
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.04, 48),
    new THREE.MeshBasicMaterial({ color: glow(C.primary, 2.5) }),
  )
  core.position.y = 0.86
  g.add(shadow(top), rim, shadow(ped), core)

  // 광선 원뿔 + D·A·H 홀로그램 (모티브 3색)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 0.45, 1.5, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color: C.primary,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  beam.position.y = 0.86 + 0.75
  g.add(beam)
  const holo = new THREE.Group()
  holo.position.y = 1.75
  ;['D', 'A', 'H'].forEach((L, i) => {
    const m = letterMesh(L, 0.95, { depth: 0.12, emissive: 2.0 })
    m.position.x = (i - 1) * 1.25
    holo.add(m)
  })
  g.add(holo)

  // 직군 지도 / 팀 비교 / 비전 패널 링
  const ring = new THREE.Group()
  ring.position.y = 3.35
  const panels = []
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const canvas = makeCanvas(640, 400)
    const tex = toTexture(canvas)
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.5),
      new THREE.MeshBasicMaterial({ map: tex, color: '#c6c2cf', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    )
    m.position.set(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1)
    m.rotation.y = Math.atan2(m.position.x, m.position.z)
    ring.add(m)
    panels.push({ mesh: m, canvas, tex })
  }
  g.add(ring)

  let panelTarget = 0
  function setPanels(mode, teams, progress) {
    if (!mode) {
      panelTarget = 0
      return
    }
    panelTarget = 1
    panels.forEach((p, i) => {
      const ctx = p.canvas.getContext('2d')
      ctx.clearRect(0, 0, 640, 400)
      ctx.fillStyle = 'rgba(23,19,33,0.88)'
      roundRect(ctx, 0, 0, 640, 400, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,185,242,0.45)'
      ctx.lineWidth = 3
      roundRect(ctx, 2, 2, 636, 396, 14)
      ctx.stroke()
      let eyebrow,
        title,
        body,
        color = C.light
      if (mode === 'jobs') {
        const j = DAH.jobMap[i]
        eyebrow = `직군 지도 ${i + 1}/4`
        title = j.title
        body = j.detail
      } else if (mode === 'teams') {
        const t = teams[i]
        const avg = progress[i].reduce((a, b) => a + b, 0) / progress[i].length
        eyebrow = `중간 발표 · 팀 ${t.symbol} ${t.name}`
        title = t.project
        body = `${t.summary}\n진행도 ${Math.round(avg * 100)}%`
        color = t.color
      } else {
        const v = i < 3 ? DAH.vision[i] : { title: DAH.slogan.kr, body: DAH.mission.kr }
        eyebrow = i < 3 ? `VISION ${i + 1}` : 'SLOGAN'
        title = v.title
        body = v.body
      }
      ctx.fillStyle = color
      ctx.font = font(700, 26)
      ctx.fillText(eyebrow, 34, 56)
      ctx.fillStyle = C.text
      ctx.font = font(800, 40)
      let y = 114
      for (const l of wrapText(ctx, title, 572).slice(0, 2)) {
        ctx.fillText(l, 34, y)
        y += 50
      }
      ctx.fillStyle = C.textSec
      ctx.font = font(500, 27)
      y += 10
      for (const l of wrapText(ctx, body, 572).slice(0, 5)) {
        ctx.fillText(l, 34, y)
        y += 38
      }
      p.tex.needsUpdate = true
    })
  }

  return {
    id: 'agora',
    center: c,
    group: g,
    spots: [],
    holo,
    setPanels,
    camera: null,
    update(dt, t) {
      const cam = this.camera?.position
      const face = cam ? Math.atan2(cam.x, cam.z) : 0
      let d = face + Math.sin(t * 0.6) * 0.35 - holo.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      holo.rotation.y += d * Math.min(1, dt * 1.5)
      holo.position.y = 1.75 + Math.sin(t * 1.2) * 0.06
      ring.rotation.y -= dt * 0.12
      for (const p of panels) {
        const o = p.mesh.material.opacity
        p.mesh.material.opacity = lerp(o, panelTarget, Math.min(1, dt * 2.5))
        p.mesh.visible = p.mesh.material.opacity > 0.01
      }
      beam.material.opacity = 0.07 + Math.sin(t * 2) * 0.02
    },
  }
}

/* ───────────────────────── D 스튜디오: 열린 곡선 · 포스트잇 벽 ───────────────────────── */
function buildD(teams) {
  const c = LAYOUT.zones.D.center
  const color = MOTIF.D
  const g = new THREE.Group()
  g.add(place(floorPad(6.6, color), c))

  const letter = letterMesh('D', 5.0, { depth: 0.35, emissive: 0.8 })
  // 기본 시점과 스튜디오 시점 모두에서 읽히도록 아고라 앞쪽을 향해 살짝 돌려 세운다
  g.add(shadow(place(letter, V(c.x - 6.7, c.z - 0.6), 1.05)))

  // 열린 곡선 유리벽 (아고라 쪽이 열려 있다 — "먼저 듣고 열어 두고 안으로 초대하는 구조")
  const R = 5.3
  const H = 2.8
  const t0 = THREE.MathUtils.degToRad(195)
  const tl = THREE.MathUtils.degToRad(150)
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 72, 1, true, t0, tl),
    new THREE.MeshStandardMaterial({
      color: '#2A2140',
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.25,
      metalness: 0.1,
      depthWrite: false,
    }),
  )
  wall.position.set(c.x, H / 2, c.z)
  g.add(wall)
  for (const y of [H, 0.03]) {
    const pts = []
    for (let i = 0; i <= 48; i++) {
      const th = t0 + (tl * i) / 48
      pts.push(V(c.x + R * Math.sin(th), c.z + R * Math.cos(th), y))
    }
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.03, 6, false),
      new THREE.MeshBasicMaterial({ color: glow(color, 1.8) }),
    )
    g.add(tube)
  }

  // 포스트잇: 팀마다 벽의 한 구간(30장). 구간 순서(θ 195°→345°) = [0번 팀, 2번 팀, 3번 팀, 1번 팀]
  const sectionTeams = [0, 2, 3, 1]
  const PER = 30
  const notes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.27, 0.27),
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85, emissive: '#ffffff', emissiveIntensity: 0.08 }),
    PER * 4,
  )
  const noteBase = []
  const noteScale = new Float32Array(PER * 4)
  const tmpColor = new THREE.Color()
  sectionTeams.forEach((teamIdx, s) => {
    for (let k = 0; k < PER; k++) {
      const i = teamIdx * PER + k
      const col = k % 6
      const row = Math.floor(k / 6)
      const th = t0 + tl * ((s + (col + 0.5) / 6) / 4) + (rand(i) - 0.5) * 0.02
      const y = 0.85 + row * 0.36 + (rand(i + 9) - 0.5) * 0.06
      const r = R - 0.07
      const pos = V(c.x + r * Math.sin(th), c.z + r * Math.cos(th), y)
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, Math.atan2(-Math.sin(th), -Math.cos(th)), (rand(i + 3) - 0.5) * 0.3, 'YXZ'),
      )
      noteBase[i] = { pos, q, order: rand(i + 17) }
      tmpColor.set(teams[teamIdx].color).lerp(new THREE.Color('#ffffff'), 0.25 + rand(i + 5) * 0.35)
      notes.setColorAt(i, tmpColor)
    }
  })
  // 같은 팀 안에서는 무작위 순서로 붙는다
  const orderInTeam = []
  for (let tIdx = 0; tIdx < 4; tIdx++) {
    const ids = Array.from({ length: PER }, (_, k) => tIdx * PER + k).sort((a, b) => noteBase[a].order - noteBase[b].order)
    orderInTeam.push(ids)
  }
  const m4 = new THREE.Matrix4()
  const sc = new THREE.Vector3()
  function writeNote(i) {
    const s = noteScale[i]
    sc.setScalar(Math.max(0.0001, s))
    m4.compose(noteBase[i].pos, noteBase[i].q, sc)
    notes.setMatrixAt(i, m4)
  }
  for (let i = 0; i < PER * 4; i++) writeNote(i)
  notes.instanceMatrix.needsUpdate = true
  g.add(notes)

  const spots = spotsFor(c, V(1, 0), V(0, 1), 2.4, 2.1)
  spots.forEach((p) => g.add(place(standingTable(color, 'sketch'), p)))

  g.add(
    place(
      sign({
        letter: 'D',
        title: 'D 스튜디오',
        subtitle: '디자인 트랙 · 문제 정의',
        lines: ['경험 디자인 · 사회혁신디자인 · AI디자인', '"먼저 듣고 열어 두고 안으로 초대하는 구조"'],
        accent: color,
      }),
      V(c.x + 5.4, c.z + 5.4),
      Math.PI * 0.62,
    ),
  )
  g.add(place(clubBanner('더 인스튜디오', 'UX·UI'), V(c.x - 1.2, c.z - 5.9), 0.2))
  g.add(place(clubBanner('I-SO', '시각디자인'), V(c.x - 1.2, c.z + 5.9), Math.PI - 0.2))

  const light = new THREE.PointLight(color, 25, 14, 2)
  light.position.set(c.x - 1, 4, c.z)
  g.add(light)

  return {
    id: 'D',
    center: c,
    group: g,
    spots,
    tableKind: 'sketch',
    update(dt, t, sim) {
      let dirty = false
      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const pr = sim.progress[tIdx]
        const shown = Math.floor(clamp01(pr[1] * 1.05 + pr[0] * 0.12) * PER)
        const ids = orderInTeam[tIdx]
        for (let k = 0; k < PER; k++) {
          const i = ids[k]
          const target = k < shown ? 1 : 0
          if (Math.abs(noteScale[i] - target) > 0.001) {
            noteScale[i] = target > noteScale[i] ? Math.min(target, noteScale[i] + dt * 3) : Math.max(target, noteScale[i] - dt * 2)
            writeNote(i)
            dirty = true
          }
        }
      }
      if (dirty) notes.instanceMatrix.needsUpdate = true
      light.intensity = 20 + Math.sin(t * 1.5) * 3
    },
  }
}

/* ───────────────────────── A 랩: 상승하는 삼각 · 데이터 홀로그램 ───────────────────────── */
function buildA(teams) {
  const c = LAYOUT.zones.A.center
  const color = MOTIF.A
  const g = new THREE.Group()
  g.add(place(floorPad(6.6, color), c))

  const letter = letterMesh('A', 5.6, { depth: 0.35, emissive: 0.8 })
  g.add(shadow(place(letter, V(c.x + 6.8, c.z - 0.6), -1.05)))

  const holo = new THREE.Group()
  holo.position.set(c.x + 4.5, 0, c.z)
  g.add(holo)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.08, 48), new THREE.MeshBasicMaterial({ color: C.deep }))
  disc.position.y = 0.04
  holo.add(disc)

  // 막대 차트 (팀별 3개 · 팀 색)
  const BARS = 12
  const bars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.17, 1, 0.17),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, transparent: true, opacity: 0.9 }),
    BARS,
  )
  const barH = new Float32Array(BARS)
  const barPos = []
  for (let i = 0; i < BARS; i++) {
    const a = -Math.PI * 0.75 + (i / (BARS - 1)) * Math.PI * 1.5
    barPos.push(V(Math.cos(a) * 1.05 - 0.2, Math.sin(a) * 1.05))
    bars.setColorAt(i, new THREE.Color(teams[Math.floor(i / 3)].color))
  }
  holo.add(bars)

  // 네트워크 그래프 — 흩어진 데이터가 연결된다
  const net = new THREE.Group()
  net.position.y = 4.0
  holo.add(net)
  const NODES = 30
  const nodePos = []
  for (let i = 0; i < NODES; i++) {
    const u = rand(i * 3 + 1) * 2 - 1
    const th = rand(i * 3 + 2) * Math.PI * 2
    const r = 0.6 + rand(i * 3 + 3) * 0.7
    const s = Math.sqrt(1 - u * u)
    nodePos.push(new THREE.Vector3(r * s * Math.cos(th), r * u * 0.8, r * s * Math.sin(th)))
  }
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 8), new THREE.MeshBasicMaterial({ color: C.light }), NODES)
  net.add(nodes)
  const edges = []
  for (let i = 0; i < NODES; i++) for (let j = 0; j < i; j++) if (nodePos[i].distanceTo(nodePos[j]) < 0.75) edges.push([i, j])
  edges.sort((a, b) => Math.max(...a) - Math.max(...b))
  const ePos = new Float32Array(edges.length * 6)
  edges.forEach(([i, j], k) => {
    ePos.set([nodePos[i].x, nodePos[i].y, nodePos[i].z, nodePos[j].x, nodePos[j].y, nodePos[j].z], k * 6)
  })
  const eGeo = new THREE.BufferGeometry()
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3))
  const lines = new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }))
  net.add(lines)

  const spots = spotsFor(c, V(-1, 0), V(0, -1), 2.4, 2.1)
  spots.forEach((p) => g.add(place(standingTable(color, 'monitor'), p, yawTo(p, c.clone().add(V(-6, 0))))))

  g.add(
    place(
      sign({
        letter: 'A',
        title: 'A 랩',
        subtitle: 'AI 트랙 · 해결안 설계',
        lines: ['빅데이터인문학 · 인문데이터마이닝', '"흩어진 데이터와 생각을 새로운 가능성으로"'],
        accent: color,
      }),
      V(c.x - 5.4, c.z + 5.4),
      -Math.PI * 0.62,
    ),
  )
  g.add(place(clubBanner('DS4H', '데이터'), V(c.x + 1.2, c.z - 5.9), -0.2))

  const light = new THREE.PointLight(color, 25, 14, 2)
  light.position.set(c.x + 1, 4, c.z)
  g.add(light)

  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  let shownNodes = 0

  return {
    id: 'A',
    center: c,
    group: g,
    spots,
    update(dt, t, sim) {
      for (let i = 0; i < BARS; i++) {
        const pr = sim.progress[Math.floor(i / 3)]
        const target = 0.08 + clamp01(pr[2] * 1.1 + pr[4] * 0.25) * (1.2 + rand(i + 40) * 1.3)
        barH[i] = lerp(barH[i], target, Math.min(1, dt * 2))
        const h = barH[i] * (1 + Math.sin(t * 2 + i) * 0.03)
        sc.set(1, h, 1)
        m4.compose(V(barPos[i].x, barPos[i].z, 0.1 + h / 2), q, sc)
        bars.setMatrixAt(i, m4)
      }
      bars.instanceMatrix.needsUpdate = true
      const avg = sim.progress.reduce((a, p) => a + p[2], 0) / sim.progress.length
      const target = Math.round(4 + clamp01(avg * 1.1) * (NODES - 4))
      shownNodes = lerp(shownNodes, target, Math.min(1, dt * 1.5))
      const n = Math.round(shownNodes)
      for (let i = 0; i < NODES; i++) {
        sc.setScalar(i < n ? 1 + Math.sin(t * 3 + i) * 0.2 : 0.0001)
        m4.compose(nodePos[i], q, sc)
        nodes.setMatrixAt(i, m4)
      }
      nodes.instanceMatrix.needsUpdate = true
      let e = 0
      while (e < edges.length && Math.max(...edges[e]) < n) e++
      eGeo.setDrawRange(0, e * 2)
      net.rotation.y += dt * 0.3
      light.intensity = 20 + Math.sin(t * 1.7) * 3
    },
  }
}

/* ───────────────────────── H 스테이지: 연결하는 게이트 · 스토리보드 ───────────────────────── */
function storyboardCanvas(team, n) {
  const canvas = makeCanvas(384, 272)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#EDE8F7'
  ctx.fillRect(0, 0, 384, 272)
  ctx.strokeStyle = '#211A31'
  ctx.lineWidth = 5
  ctx.strokeRect(10, 10, 364, 252)
  ctx.strokeStyle = team.color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(20, 170 + n * 12)
  ctx.bezierCurveTo(120, 140, 250, 200, 364, 150 - n * 10)
  ctx.stroke()
  ctx.fillStyle = '#211A31'
  const x = 120 + n * 120
  ctx.beginPath()
  ctx.arc(x, 110, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - 16, 135, 32, 60)
  if (n === 1) {
    ctx.beginPath()
    ctx.arc(x - 80, 118, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - 93, 139, 26, 50)
  }
  ctx.fillStyle = team.color
  ctx.font = font(800, 26)
  ctx.fillText(`S#${n + 1}`, 24, 44)
  ctx.fillStyle = '#211A31'
  ctx.font = font(600, 20)
  ctx.fillText(`${team.name} · ${n === 0 ? '문제의 장면' : '해결의 장면'}`, 24, 244)
  return toTexture(canvas)
}

function buildH(teams) {
  const c = LAYOUT.zones.H.center
  const color = MOTIF.H
  const g = new THREE.Group()
  g.add(place(floorPad(6.6, color), c))

  const gateZ = c.z - 6.4
  const gate = letterMesh('H', 8.0, { depth: 0.5, emissive: 0.8 })
  g.add(shadow(place(gate, V(0, gateZ))))

  // H 윗칸은 스토리보드 스크린, 아랫칸은 전시 섬으로 가는 통로
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 3.3),
    new THREE.MeshStandardMaterial({ color: C.bg2, roughness: 0.6, transparent: true, opacity: 0.85 }),
  )
  back.position.set(0, 6.05, gateZ - 0.05)
  g.add(back)
  const frames = []
  teams.forEach((team, i) => {
    for (let n = 0; n < 2; n++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 1.1),
        new THREE.MeshBasicMaterial({ map: storyboardCanvas(team, n), color: '#a9a4b4', transparent: true, opacity: 0.08 }),
      )
      m.position.set(-2.7 + i * 1.8, 6.8 - n * 1.45, gateZ + 0.02)
      g.add(m)
      frames.push({ mesh: m, team: i, n })
    }
  })

  const spots = spotsFor(c, V(0, 1), V(1, 0), 2.2, 2.4)
  spots.forEach((p) => g.add(place(standingTable(color, 'laptop'), p)))

  // 촬영 카메라 · 조명 · 서가(인문 아카이브)
  const cam = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.45), MAT.dark())
  body.position.y = 1.55
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.2, 16), MAT.metal())
  lens.rotation.x = Math.PI / 2
  lens.position.set(0, 1.55, 0.3)
  cam.add(body, lens)
  for (let k = 0; k < 3; k++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), MAT.metal())
    const a = (k / 3) * Math.PI * 2
    leg.position.set(Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22)
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3)
    cam.add(leg)
  }
  g.add(shadow(place(cam, V(-5.2, c.z + 1.5), yawTo(V(-5.2, c.z + 1.5), V(0, c.z - 1)))))

  const shelf = new THREE.Group()
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.45), MAT.dark())
  frame.position.y = 1.1
  shelf.add(frame)
  const bookGeo = new THREE.BoxGeometry(0.08, 0.34, 0.3)
  const books = new THREE.InstancedMesh(bookGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), 60)
  const m4 = new THREE.Matrix4()
  const palette = [C.light, C.mid, C.primary, C.deep, '#EDE8F7']
  for (let i = 0; i < 60; i++) {
    const row = Math.floor(i / 15)
    const col = i % 15
    m4.makeTranslation(-0.95 + col * 0.13, 0.35 + row * 0.5, 0.1)
    books.setMatrixAt(i, m4)
    books.setColorAt(i, new THREE.Color(palette[Math.floor(rand(i) * palette.length)]))
  }
  shelf.add(books)
  g.add(shadow(place(shelf, V(5.4, c.z - 1.2), -Math.PI / 2 + 0.35)))

  g.add(
    place(
      sign({
        letter: 'H',
        title: 'H 스테이지',
        subtitle: '엔터컬쳐 트랙 · 스토리텔링',
        lines: ['스토리텔링 · K-콘텐츠 · 문화원형', '"서로 다른 세계 사이에 다리를 놓는 대화"'],
        accent: C.light,
      }),
      V(-5.6, c.z + 5.2),
      Math.PI * 0.2,
    ),
  )
  g.add(place(clubBanner('CON:NECT', '콘텐츠'), V(5.8, c.z + 3.2), -0.4))

  const light = new THREE.PointLight(color, 30, 16, 2)
  light.position.set(0, 4.5, c.z - 2)
  g.add(light)

  return {
    id: 'H',
    center: c,
    group: g,
    spots,
    update(dt, t, sim) {
      for (const f of frames) {
        const p = sim.progress[f.team][3]
        const target = p > (f.n === 0 ? 0.2 : 0.65) ? 1 : 0.08
        f.mesh.material.opacity = lerp(f.mesh.material.opacity, target, Math.min(1, dt * 2))
      }
      light.intensity = 26 + Math.sin(t * 1.3) * 4
    },
  }
}

/* ───────────────────────── 이슈 맵: 지역과 글로벌 이슈 탐색 ───────────────────────── */
const CITIES = [
  { name: '춘천', x: 330, y: 400 },
  { name: '원주', x: 390, y: 720 },
  { name: '속초', x: 640, y: 250 },
  { name: '강릉', x: 710, y: 500 },
  { name: '동해', x: 770, y: 650 },
]
const TEAM_CITY = ['춘천', '강릉', '원주', '동해']

function mapTexture() {
  const S = 1024
  const canvas = makeCanvas(S, S)
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = 'rgba(33,26,49,0.9)'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = 'rgba(200,185,242,0.1)'
  ctx.lineWidth = 2
  for (let i = 0; i <= S; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, S)
    ctx.moveTo(0, i)
    ctx.lineTo(S, i)
    ctx.stroke()
  }
  // 동해 바다
  ctx.fillStyle = 'rgba(104,68,196,0.35)'
  ctx.beginPath()
  ctx.moveTo(560, 0)
  ctx.bezierCurveTo(640, 220, 700, 380, 780, 520)
  ctx.bezierCurveTo(820, 620, 850, 760, 900, 1024)
  ctx.lineTo(1024, 1024)
  ctx.lineTo(1024, 0)
  ctx.closePath()
  ctx.fill()
  // 산맥 등고선
  ctx.strokeStyle = 'rgba(200,185,242,0.28)'
  ctx.lineWidth = 3
  for (let k = 0; k < 6; k++) {
    ctx.beginPath()
    ctx.moveTo(480 + k * 18, 60)
    ctx.bezierCurveTo(520 + k * 20, 300, 560 + k * 12, 520, 620 + k * 16, 960)
    ctx.stroke()
  }
  ctx.fillStyle = C.light
  ctx.font = font(700, 38)
  for (const city of CITIES) {
    ctx.beginPath()
    ctx.arc(city.x, city.y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText(city.name, city.x + 18, city.y + 12)
  }
  ctx.restore()
  ctx.strokeStyle = C.primary
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = C.text
  ctx.font = font(800, 44)
  ctx.textAlign = 'center'
  ctx.fillText('지역 이슈 맵 · 강원', S / 2, 120)
  ctx.fillStyle = C.textMeta
  ctx.font = font(600, 28)
  ctx.fillText('LOCAL ↔ GLOBAL', S / 2, 930)
  return toTexture(canvas)
}

function buildField(teams) {
  const c = LAYOUT.zones.field.center
  const g = new THREE.Group()
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 3.15, 0.7, 64), MAT.dark())
  ped.position.set(c.x, 0.35, c.z)
  g.add(shadow(ped))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.035, 8, 128), new THREE.MeshBasicMaterial({ color: glow(C.primary, 2.5) }))
  rim.rotation.x = Math.PI / 2
  rim.position.set(c.x, 0.71, c.z)
  g.add(rim)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.8, 96), new THREE.MeshBasicMaterial({ map: mapTexture(), transparent: true }))
  disc.rotation.x = -Math.PI / 2
  disc.position.set(c.x, 0.72, c.z)
  g.add(disc)

  const s = 2.8 / 512
  const pins = teams.map((team, i) => {
    const city = CITIES.find((x) => x.name === TEAM_CITY[i])
    const pg = new THREE.Group()
    pg.position.set(c.x + (city.x - 512) * s, 0.72, c.z + (city.y - 512) * s)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: team.color }))
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: team.color }))
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.14, 32),
      new THREE.MeshBasicMaterial({ color: team.color, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    )
    pulse.rotation.x = -Math.PI / 2
    pulse.position.y = 0.01
    pg.add(stem, head, pulse)
    g.add(pg)
    return { pg, stem, head, pulse, h: 0 }
  })

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 24, 16),
    new THREE.MeshBasicMaterial({ color: C.light, wireframe: true, transparent: true, opacity: 0.28 }),
  )
  globe.position.set(c.x, 3.0, c.z - 0.6)
  g.add(globe)

  const spots = spotsFor(c, V(0, -1), V(-1, 0), 2.5, 2.6, 4.5)
  spots.forEach((p) => g.add(place(standingTable(C.light, 'sketch'), p)))
  g.add(
    place(
      sign({
        letter: '◎',
        title: '이슈 맵',
        subtitle: '문제 발굴 · 지역과 글로벌',
        lines: ['문제를 사람의 경험으로 다시 살펴보기', '"남들이 그냥 지나친 불편을 알아보는 눈"'],
        accent: C.light,
      }),
      V(c.x + 6.8, c.z + 1.6),
      Math.PI * 0.5 - 0.5,
    ),
  )

  return {
    id: 'field',
    center: c,
    group: g,
    spots,
    update(dt, t, sim) {
      pins.forEach((p, i) => {
        const pr = clamp01(sim.progress[i][0] * 1.1)
        p.h = lerp(p.h, pr, Math.min(1, dt * 2))
        const h = 0.05 + p.h * 1.2
        p.stem.scale.y = h
        p.stem.position.y = h / 2
        p.head.position.y = h + 0.05
        p.head.scale.setScalar(0.4 + p.h * 0.8)
        const k = (t * 0.6 + i * 0.25) % 1
        p.pulse.scale.setScalar(1 + k * 5 * (0.2 + p.h))
        p.pulse.material.opacity = (1 - k) * (0.2 + p.h * 0.8)
      })
      globe.rotation.y += dt * 0.25
    },
  }
}

/* ───────────────────────── 전시 섬: 18회의 포스터 나선 · 이번 학기 작품 ───────────────────────── */
function generatedPoster({ ordinal, semester, title }) {
  const W = 512
  const H = 724
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#211A31')
  g.addColorStop(1, '#100D18')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // 모티브 도형 3개
  ctx.lineWidth = 10
  ctx.strokeStyle = MOTIF.D
  ctx.beginPath()
  ctx.moveTo(70, 180)
  ctx.lineTo(70, 400)
  ctx.bezierCurveTo(260, 400, 260, 180, 70, 180)
  ctx.stroke()
  ctx.strokeStyle = MOTIF.A
  ctx.beginPath()
  ctx.moveTo(190, 420)
  ctx.lineTo(260, 200)
  ctx.lineTo(320, 200)
  ctx.lineTo(390, 420)
  ctx.closePath()
  ctx.stroke()
  ctx.strokeStyle = MOTIF.H
  ctx.beginPath()
  ctx.moveTo(360, 190)
  ctx.lineTo(362, 410)
  ctx.moveTo(452, 190)
  ctx.lineTo(450, 410)
  ctx.moveTo(362, 296)
  ctx.lineTo(450, 296)
  ctx.stroke()
  ctx.fillStyle = C.light
  ctx.font = font(700, 28)
  ctx.fillText(`${semester} DAH EXHIBITION`, 44, 90)
  ctx.fillStyle = C.text
  ctx.font = font(800, 60)
  ctx.fillText(`제${ordinal}회`, 44, 520)
  ctx.font = font(800, 40)
  const lines = wrapText(ctx, title || '전시명 미정', W - 88)
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 44, 584 + i * 48))
  ctx.fillStyle = C.textMeta
  ctx.font = font(600, 22)
  ctx.fillText('디지털인문예술전공 프로젝트 전시회', 44, H - 36)
  return toTexture(canvas)
}

function buildGallery(teams) {
  const c = LAYOUT.zones.gallery.center
  const g = new THREE.Group()
  const loader = new THREE.TextureLoader()
  const posters = []
  const pickables = []

  function makePoster(ex, texture, isCurrent = false) {
    const pg = new THREE.Group()
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.5, 0.08), MAT.dark())
    frame.position.y = 1.95
    const img = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 2.36), new THREE.MeshBasicMaterial({ map: texture, color: '#bdbac4' }))
    img.position.set(0, 1.95, 0.045)
    const cap = new THREE.Mesh(
      new THREE.PlaneGeometry(1.64, 0.5),
      new THREE.MeshBasicMaterial({
        map: captionTexture(`제${ex.ordinal}회 · ${ex.semester}`, ex.title || '전시명 미정'),
        color: '#c6c2cf',
        transparent: true,
      }),
    )
    cap.position.set(0, 0.42, 0.02)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 3.1),
      new THREE.MeshBasicMaterial({
        map: glowTexture('rgba(129,95,215,0.9)', 'rgba(129,95,215,0)'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    glow.position.set(0, 1.95, -0.08)
    pg.add(shadow(frame), img, cap, glow)
    img.userData.pick = { type: 'poster', exhibition: ex }
    frame.userData.pick = img.userData.pick
    pickables.push(img, frame)
    g.add(pg)
    const entry = { group: pg, img, glow, ex, isCurrent }
    posters.push(entry)
    return entry
  }

  function fitImage(entry, texture) {
    const iw = texture.image?.width || 1
    const ih = texture.image?.height || 1
    const aspect = iw / ih
    const maxW = 1.64
    const maxH = 2.36
    let w = maxW
    let h = w / aspect
    if (h > maxH) {
      h = maxH
      w = h * aspect
    }
    entry.img.scale.set(w / maxW, h / maxH, 1)
  }

  for (const ex of DAH.exhibitions) {
    const tex = loader.load(ex.poster, (t) => fitImage(entry, t))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const entry = makePoster(ex, tex)
  }

  // 나선형 배치: 과거(오른쪽 앞) → 최신(왼쪽 앞)으로 돌며 조금씩 높아진다 — 쌓이는 시간
  function layout() {
    const total = Math.max(22, posters.length)
    const a0 = THREE.MathUtils.degToRad(-42)
    const a1 = THREE.MathUtils.degToRad(222)
    posters.forEach((p, i) => {
      const a = a0 + ((a1 - a0) * i) / (total - 1)
      const r = 10.9
      const pos = V(c.x + Math.cos(a) * r, c.z - Math.sin(a) * r, 0.1 + i * 0.045)
      p.group.position.copy(pos)
      p.group.rotation.y = yawTo(pos, V(c.x, c.z))
      p.slotPos = pos.clone()
      p.viewPos = pos.clone().lerp(V(c.x, c.z), 0.2).setY(0)
    })
  }

  let current = null
  function setCurrent(info) {
    if (current) {
      // 지난 학기 포스터는 아카이브로 남는다
      current.isCurrent = false
      current.glow.material.opacity = 0
    }
    const ex = { ...info, current: true }
    current = makePoster(ex, generatedPoster(info), true)
    layout()
  }
  layout()

  // 입구 배너
  const bannerCanvas = makeCanvas(1400, 200)
  const bannerTex = toTexture(bannerCanvas)
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 1.0),
    new THREE.MeshBasicMaterial({ map: bannerTex, color: '#c6c2cf', transparent: true, side: THREE.DoubleSide }),
  )
  const entryZ = c.z + LAYOUT.galleryRadius - 1.6
  banner.position.set(0, 3.25, entryZ)
  g.add(banner)
  for (const x of [-3.6, 3.6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.8, 0.14), MAT.metal())
    post.position.set(x, 1.9, entryZ)
    g.add(shadow(post))
  }
  function drawBanner(info, open) {
    const ctx = bannerCanvas.getContext('2d')
    ctx.clearRect(0, 0, 1400, 200)
    ctx.fillStyle = open ? 'rgba(104,68,196,0.95)' : 'rgba(33,26,49,0.92)'
    roundRect(ctx, 0, 0, 1400, 200, 16)
    ctx.fill()
    ctx.fillStyle = open ? C.text : C.textSec
    ctx.font = font(800, 62)
    ctx.textAlign = 'center'
    ctx.fillText(exhibitionName(info.ordinal), 700, 92)
    ctx.font = font(600, 36)
    ctx.fillStyle = open ? C.light : C.textMeta
    ctx.fillText(`${info.semester} · ${info.title || '전시명 미정'} · ${open ? 'NOW SHOWING' : '준비 중'}`, 700, 158)
    bannerTex.needsUpdate = true
  }

  // 이번 학기 팀 작품 좌대
  const plinths = teams.map((team, i) => {
    const a = THREE.MathUtils.degToRad(45 + i * 90)
    const pos = V(c.x + Math.cos(a) * 4.8, c.z - Math.sin(a) * 4.8)
    const pgp = new THREE.Group()
    pgp.position.copy(pos)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.95), MAT.glass())
    box.position.y = 0.5
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.03, 0.98), new THREE.MeshBasicMaterial({ color: team.color }))
    edge.position.y = 1.0
    const cap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.3),
      new THREE.MeshBasicMaterial({
        map: captionTexture(`팀 ${team.symbol} ${team.name}`, team.project, { accent: team.color }),
        color: '#c6c2cf',
        transparent: true,
      }),
    )
    cap.position.set(0, 0.62, 0.48)
    const capBack = cap.clone()
    capBack.rotation.y = Math.PI
    capBack.position.z = -0.48
    pgp.add(shadow(box), edge, cap, capBack)
    pgp.scale.set(1, 0.001, 1)
    g.add(pgp)
    return { group: pgp, pos, device: null, s: 0 }
  })

  const light = new THREE.PointLight(C.light, 35, 30, 1.6)
  light.position.set(c.x, 7, c.z)
  g.add(light)
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, 12, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color: C.primary,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  column.position.set(c.x, 6, c.z)
  g.add(column)

  // 관람 동선: 포스터 앞 + 좌대 주변
  const viewPoints = () => [
    ...posters.map((p) => p.viewPos),
    ...plinths.map((p) => p.pos.clone().add(V(c.x - p.pos.x, c.z - p.pos.z).setLength(1.6))),
  ]

  let lastBanner = ''
  return {
    id: 'gallery',
    center: c,
    group: g,
    spots: plinths.map((p) => p.pos),
    plinths,
    posters,
    pickables,
    viewPoints,
    setCurrent,
    update(dt, t, sim) {
      const key = `${sim.current.ordinal}|${sim.exhibitionOpen}`
      if (key !== lastBanner) {
        drawBanner(sim.current, sim.exhibitionOpen)
        lastBanner = key
      }
      for (const p of plinths) {
        const target = sim.exhibitionPrep ? 1 : 0.001
        p.s = lerp(p.s, target, Math.min(1, dt * 1.5))
        p.group.scale.y = Math.max(0.001, p.s)
        if (p.device) {
          p.device.visible = p.s > 0.6
          p.device.position.y = 1.85 + Math.sin(t * 1.4 + p.pos.x) * 0.05
          p.device.rotation.y += dt * 0.5
        }
      }
      if (current) current.glow.material.opacity = sim.exhibitionOpen ? 0.55 + Math.sin(t * 2.4) * 0.2 : 0.12
      column.material.opacity = lerp(column.material.opacity, sim.exhibitionOpen ? 0.1 : 0, Math.min(1, dt * 2))
    },
  }
}

/* ───────────────────────── 조립 ───────────────────────── */
export function buildZones(scene, teams) {
  const zones = {
    agora: buildAgora(),
    D: buildD(teams),
    A: buildA(teams),
    H: buildH(teams),
    field: buildField(teams),
    gallery: buildGallery(teams),
  }
  for (const z of Object.values(zones)) scene.add(z.group)

  // 팀별 홈 스튜디오 자리(프로토타입 단계) — 같은 홈을 쓰는 팀은 앞줄부터 채운다
  const used = {}
  const homeSpots = teams.map((t) => {
    const k = used[t.home] || 0
    used[t.home] = k + 1
    return zones[t.home].spots[k]
  })

  // 프로토타입 화면(팀별 캔버스 하나를 홈 스튜디오와 전시 좌대가 함께 쓴다)
  const devices = teams.map((team, i) => {
    const canvas = deviceCanvas()
    const tex = toTexture(canvas)
    drawDevice(canvas, team, 0)
    const home = deviceMesh(tex, team.color)
    home.position.copy(homeSpots[i]).setY(2.35)
    home.visible = false
    scene.add(home)
    const show = deviceMesh(tex, team.color)
    zones.gallery.plinths[i].device = show
    show.position.copy(zones.gallery.plinths[i].pos).setY(1.85)
    show.visible = false
    scene.add(show)
    return { team, canvas, tex, home, show, drawn: -1 }
  })

  return {
    zones,
    homeSpots,
    devices,
    update(dt, t, sim) {
      for (const z of Object.values(zones)) z.update(dt, t, sim)
      devices.forEach((d, i) => {
        const p = sim.progress[i][4]
        const bucket = Math.round(p * 20)
        if (bucket !== d.drawn) {
          drawDevice(d.canvas, d.team, p)
          d.tex.needsUpdate = true
          d.drawn = bucket
        }
        d.home.visible = sim.showDevices && p > 0.02
        d.home.position.y = 2.35 + Math.sin(t * 1.3 + i) * 0.06
        d.home.rotation.y = Math.sin(t * 0.4 + i) * 0.9
      })
    },
  }
}
