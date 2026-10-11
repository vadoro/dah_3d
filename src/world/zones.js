import * as THREE from 'three'
import { C, LAYOUT } from '../config.js'
import { DAH, exhibitionName } from '../data/dah.js'
import { letterMesh, MOTIF } from './letters.js'
import { glow } from './environment.js'
import { standingTable, sign, clubBanner, zoneFrame, pedestal, deviceCanvas, drawDevice, deviceMesh, MAT } from './props.js'
import { makeCanvas, toTexture, font, roundRect, wrapText, captionTexture } from './textures.js'

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

/* ── 등각 시점 도우미 ──
   facer   : 시점을 90°씩 돌려도 늘 정면이 보이도록 카메라 쪽으로 도는 표지물(큰 글자 · 표지판 · 깃발)
   cutaway : 카메라와 공간 사이를 가리는 쪽에 오면 흐려지는 구조물(벽 · 게이트 · 서버랙) — 등각 게임의 컷어웨이 */
function facer(obj, offset = 0) {
  return { obj, offset }
}
function cutaway(obj, dirX, dirZ) {
  return { obj, dir: { x: dirX, z: dirZ }, alpha: 1 }
}
function setFade(obj, alpha) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material) return
    if (!o.userData.fadeMat) {
      o.material = o.material.clone()
      o.userData.fadeMat = true
      o.userData.baseOpacity = o.material.opacity ?? 1
      o.userData.baseTransparent = o.material.transparent
    }
    o.material.transparent = alpha < 0.999 || o.userData.baseTransparent
    o.material.opacity = o.userData.baseOpacity * alpha
    o.material.depthWrite = alpha > 0.6
    o.castShadow = alpha > 0.6
  })
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
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 0.8, 8), MAT.model())
  ped.position.y = 0.4
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.04, 48),
    new THREE.MeshBasicMaterial({ color: glow(C.primary, 2.5) }),
  )
  core.position.y = 0.86
  g.add(shadow(top), rim, shadow(ped), core, zoneFrame(5, 5, C.light))

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
  g.add(place(zoneFrame(6, 6, color), c))

  // 받침대 위의 큰 D — 시점을 돌려도 정면이 보이도록 카메라 쪽으로 돈다
  const letterGroup = new THREE.Group()
  letterGroup.add(pedestal(3.4, 0.45, 1.1, MAT.modelDark()))
  const letter = letterMesh('D', 4.6, { depth: 0.6, emissive: 0.8 })
  letter.position.y = 0.45
  letterGroup.add(letter)
  g.add(shadow(place(letterGroup, V(c.x - 6.7, c.z - 0.6))))
  const wallGroup = new THREE.Group()
  g.add(wallGroup)

  // 열린 곡선 벽 (아고라 쪽이 열려 있다 — "먼저 듣고 열어 두고 안으로 초대하는 구조")
  const R = 5.3
  const H = 2.8
  const t0 = THREE.MathUtils.degToRad(195)
  const tl = THREE.MathUtils.degToRad(150)
  // 열 개의 면으로 꺾인 곡선 — 등각 시점에서 면마다 밝기가 달라 입체가 또렷하다
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 10, 1, true, t0, tl),
    new THREE.MeshStandardMaterial({ color: '#4A3D73', side: THREE.DoubleSide, roughness: 0.7, flatShading: true }),
  )
  wall.position.set(c.x, H / 2, c.z)
  wall.castShadow = true
  wall.receiveShadow = true
  wallGroup.add(wall)
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
    wallGroup.add(tube)
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
      const r = R - 0.12
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
  wallGroup.add(notes)

  const spots = spotsFor(c, V(1, 0), V(0, 1), 2.4, 2.1)
  spots.forEach((p) => g.add(place(standingTable(color, 'sketch'), p)))

  const dSign = sign({
    letter: 'D',
    title: 'D 스튜디오',
    subtitle: '디자인 트랙 · 문제 정의',
    lines: ['경험 디자인 · 사회혁신디자인 · AI디자인', '"먼저 듣고 열어 두고 안으로 초대하는 구조"'],
    accent: color,
  })
  const flag1 = clubBanner('더 인스튜디오', 'UX·UI')
  const flag2 = clubBanner('I-SO', '시각디자인')
  g.add(place(dSign, V(c.x + 5.4, c.z + 5.4)), place(flag1, V(c.x - 1.2, c.z - 5.9)), place(flag2, V(c.x - 1.2, c.z + 5.9)))

  const light = new THREE.PointLight(color, 25, 14, 2)
  light.position.set(c.x - 1, 4, c.z)
  g.add(light)

  return {
    id: 'D',
    center: c,
    group: g,
    spots,
    facers: [facer(letterGroup), facer(dSign), facer(flag1), facer(flag2)],
    cutaways: [cutaway(letterGroup, -1, 0), cutaway(wallGroup, -1, 0)],
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
  g.add(place(zoneFrame(6, 6, color), c))

  // 큰 A와 서버랙은 기본 시점에서 랩 안쪽을 가리지 않도록 랩의 북쪽(-z) 가장자리에 세운다
  const letterGroup = new THREE.Group()
  letterGroup.add(pedestal(3.4, 0.45, 1.1, MAT.modelDark()))
  const letter = letterMesh('A', 4.8, { depth: 0.6, emissive: 0.8 })
  letter.position.y = 0.45
  letterGroup.add(letter)
  g.add(shadow(place(letterGroup, V(c.x + 1.4, c.z - 6.3))))
  const racks = new THREE.Group()
  const lightMat = new THREE.MeshBasicMaterial({ color: glow(color, 1.6) })
  for (const [dx, dz] of [
    [5.4, -5.6],
    [-3.2, -5.6],
  ]) {
    const rack = new THREE.Group()
    rack.add(pedestal(1.0, 2.6, 1.0, MAT.modelDark()))
    for (let k = 0; k < 6; k++) {
      for (const side of [1, -1]) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.02), lightMat)
        led.position.set(0, 0.45 + k * 0.36, side * 0.51)
        rack.add(led)
      }
    }
    rack.position.set(c.x + dx, 0, c.z + dz)
    racks.add(rack)
  }
  g.add(shadow(racks))

  const holo = new THREE.Group()
  holo.position.set(c.x + 4.5, 0, c.z)
  g.add(holo)
  const disc = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 2.8), new THREE.MeshBasicMaterial({ color: C.deep }))
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
  const nodes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: C.light }), NODES)
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

  const aSign = sign({
    letter: 'A',
    title: 'A 랩',
    subtitle: 'AI 트랙 · 해결안 설계',
    lines: ['빅데이터인문학 · 인문데이터마이닝', '"흩어진 데이터와 생각을 새로운 가능성으로"'],
    accent: color,
  })
  const flag = clubBanner('DS4H', '데이터')
  g.add(place(aSign, V(c.x - 5.4, c.z + 5.4)), place(flag, V(c.x + 5.6, c.z + 5.6)))

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
    facers: [facer(letterGroup), facer(aSign), facer(flag)],
    cutaways: [cutaway(letterGroup, 0, -1), cutaway(racks, 0, -1)],
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
  g.add(place(zoneFrame(6, 6, color), c))

  const gateZ = c.z - 6.4
  const gateGroup = new THREE.Group()
  g.add(gateGroup)
  const gate = letterMesh('H', 8.0, { depth: 0.8, emissive: 0.8 })
  gateGroup.add(shadow(place(gate, V(0, gateZ))))

  // H 윗칸은 스토리보드 스크린, 아랫칸은 전시 섬으로 가는 통로
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 3.3),
    new THREE.MeshStandardMaterial({ color: C.bg2, roughness: 0.6, transparent: true, opacity: 0.85 }),
  )
  back.position.set(0, 6.05, gateZ + 0.4)
  gateGroup.add(back)
  const frames = []
  teams.forEach((team, i) => {
    for (let n = 0; n < 2; n++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 1.1),
        new THREE.MeshBasicMaterial({ map: storyboardCanvas(team, n), color: '#a9a4b4', transparent: true, opacity: 0.08 }),
      )
      m.position.set(-2.7 + i * 1.8, 6.8 - n * 1.45, gateZ + 0.42)
      gateGroup.add(m)
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

  const hSign = sign({
    letter: 'H',
    title: 'H 스테이지',
    subtitle: '엔터컬쳐 트랙 · 스토리텔링',
    lines: ['스토리텔링 · K-콘텐츠 · 문화원형', '"서로 다른 세계 사이에 다리를 놓는 대화"'],
    accent: C.light,
  })
  const flag = clubBanner('CON:NECT', '콘텐츠')
  g.add(place(hSign, V(-5.6, c.z + 5.2)), place(flag, V(5.8, c.z + 3.2)))

  const light = new THREE.PointLight(color, 30, 16, 2)
  light.position.set(0, 4.5, c.z - 2)
  g.add(light)

  return {
    id: 'H',
    center: c,
    group: g,
    spots,
    facers: [facer(hSign), facer(flag)],
    cutaways: [cutaway(gateGroup, 0, -1)],
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
  roundRect(ctx, 4, 4, S - 8, S - 8, 40)
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
  roundRect(ctx, 6, 6, S - 12, S - 12, 40)
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
  g.add(place(zoneFrame(8, 6, C.light), c))
  const ped = new THREE.Group()
  ped.add(pedestal(6.1, 0.7, 6.1, MAT.modelDark()))
  g.add(place(ped, c))
  const rim = place(zoneFrame(3.05, 3.05, glow(C.primary, 1.8)), V(c.x, c.z, 0.7))
  g.add(rim)
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ map: mapTexture(), transparent: true }))
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
    new THREE.IcosahedronGeometry(0.8, 1),
    new THREE.MeshBasicMaterial({ color: C.light, wireframe: true, transparent: true, opacity: 0.28 }),
  )
  globe.position.set(c.x, 3.0, c.z - 0.6)
  g.add(globe)

  const spots = spotsFor(c, V(0, -1), V(-1, 0), 2.5, 2.6, 4.5)
  spots.forEach((p) => g.add(place(standingTable(C.light, 'sketch'), p)))
  const fSign = sign({
    letter: '◎',
    title: '이슈 맵',
    subtitle: '문제 발굴 · 지역과 글로벌',
    lines: ['문제를 사람의 경험으로 다시 살펴보기', '"남들이 그냥 지나친 불편을 알아보는 눈"'],
    accent: C.light,
  })
  g.add(place(fSign, V(c.x + 6.8, c.z + 1.6)))

  return {
    id: 'field',
    center: c,
    group: g,
    spots,
    facers: [facer(fSign)],
    cutaways: [],
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

/* ───────────────────────── 전시 섬: ㄷ자 포스터 벽 · 가운데 이번 학기 전시 토템 ───────────────────────── */
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
  const half = LAYOUT.galleryHalf
  const g = new THREE.Group()
  const loader = new THREE.TextureLoader()
  const posters = []
  const pickables = []

  // 디귿자 전시 벽(왼쪽 · 뒤 · 오른쪽). 입구(앞쪽)는 다리와 이어져 열려 있다.
  // 카메라 쪽으로 오는 벽은 컷어웨이로 흐려져 안이 보인다.
  const WALL_H = 3.6
  const walls = {
    left: { pos: V(c.x - (half - 1), c.z - 1.5), size: [0.35, WALL_H, 20], inward: V(1, 0), out: [-1, 0] },
    back: { pos: V(c.x, c.z - (half - 1.2)), size: [24.35, WALL_H, 0.35], inward: V(0, 1), out: [0, -1] },
    right: { pos: V(c.x + (half - 1), c.z - 1.5), size: [0.35, WALL_H, 20], inward: V(-1, 0), out: [1, 0] },
  }
  for (const w of Object.values(walls)) {
    w.group = new THREE.Group()
    const m = new THREE.Mesh(new THREE.BoxGeometry(...w.size), MAT.model())
    m.position.copy(w.pos).setY(WALL_H / 2)
    const capLine = new THREE.Mesh(
      new THREE.BoxGeometry(w.size[0] + 0.02, 0.06, w.size[2] + 0.02),
      new THREE.MeshBasicMaterial({ color: glow(C.primary, 1.8) }),
    )
    capLine.position.copy(w.pos).setY(WALL_H + 0.03)
    w.group.add(shadow(m), capLine)
    g.add(w.group)
  }

  // 벽면 자리: 왼쪽 벽 앞→뒤 9칸, 뒤 벽 왼→오 9칸, 오른쪽 벽 뒤→앞 9칸
  const slots = []
  for (let i = 0; i < 9; i++) slots.push({ wall: 'left', pos: V(c.x - (half - 1) + 0.24, c.z + 7.4 - i * 2.1) })
  for (let i = 0; i < 9; i++) slots.push({ wall: 'back', pos: V(c.x - 9.6 + i * 2.4, c.z - (half - 1.2) + 0.24) })
  for (let i = 0; i < 9; i++) slots.push({ wall: 'right', pos: V(c.x + (half - 1) - 0.24, c.z - 9.4 + i * 2.1) })

  function posterMeshes(ex, texture) {
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
    pg.add(shadow(frame), img, cap)
    img.userData.pick = { type: 'poster', exhibition: ex }
    frame.userData.pick = img.userData.pick
    pickables.push(img, frame)
    return { pg, img }
  }

  function fitImage(img, texture) {
    const iw = texture.image?.width || 1
    const ih = texture.image?.height || 1
    const aspect = iw / ih
    let w = 1.64
    let h = w / aspect
    if (h > 2.36) {
      h = 2.36
      w = h * aspect
    }
    img.scale.set(w / 1.64, h / 2.36, 1)
  }

  // 아카이브 포스터를 다음 빈 벽면 자리에 건다
  function hangOnWall(ex, texture) {
    const archived = posters.filter((p) => !p.isCurrent).length
    const slot = slots[Math.min(archived, slots.length - 1)]
    const w = walls[slot.wall]
    const { pg, img } = posterMeshes(ex, texture)
    pg.position.copy(slot.pos)
    pg.rotation.y = Math.atan2(w.inward.x, w.inward.z)
    w.group.add(pg)
    const entry = {
      group: pg,
      img,
      ex,
      isCurrent: false,
      slotPos: slot.pos.clone(),
      viewPos: slot.pos.clone().addScaledVector(w.inward, 2.3),
    }
    posters.push(entry)
    return entry
  }

  for (const ex of DAH.exhibitions) {
    let entry = null
    const tex = loader.load(ex.poster, (t) => entry && fitImage(entry.img, t))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    entry = hangOnWall(ex, tex)
  }

  // 가운데 토템: 이번 학기 전시 포스터를 네 면에 건다 — 어느 방향에서 보아도 보인다
  const totem = new THREE.Group()
  totem.position.copy(c)
  totem.add(pedestal(2.7, 0.4, 2.7, MAT.modelDark()))
  const column = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.4, 2.0), MAT.model())
  column.position.y = 0.4 + 2.2
  totem.add(shadow(column))
  const crownMat = new THREE.MeshStandardMaterial({ color: C.mid, emissive: C.primary, emissiveIntensity: 0.6 })
  const crown = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 2.1), crownMat)
  crown.position.y = 4.88
  totem.add(crown)
  const faces = []
  const capFaces = []
  for (let k = 0; k < 4; k++) {
    const yaw = (k * Math.PI) / 2
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 2.36), new THREE.MeshBasicMaterial({ color: '#d6d2df' }))
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), new THREE.MeshBasicMaterial({ color: '#c6c2cf', transparent: true }))
    for (const [m, y] of [
      [face, 3.05],
      [cap, 1.25],
    ]) {
      m.position.set(Math.sin(yaw) * 1.012, y, Math.cos(yaw) * 1.012)
      m.rotation.y = yaw
      totem.add(m)
    }
    faces.push(face)
    capFaces.push(cap)
    pickables.push(face)
  }
  g.add(totem)

  const currentEntry = {
    group: totem,
    img: faces[0],
    ex: null,
    isCurrent: true,
    slotPos: c.clone(),
    viewPos: c.clone().add(V(0.8, 2.8)),
  }
  posters.push(currentEntry)

  function setCurrent(info) {
    // 지난 학기 전시는 벽으로 옮겨 아카이브가 된다
    if (currentEntry.ex) hangOnWall({ ...currentEntry.ex, current: false }, faces[0].material.map)
    const ex = { ...info, current: true }
    currentEntry.ex = ex
    const tex = generatedPoster(info)
    const capTex = captionTexture(`제${info.ordinal}회 · ${info.semester}`, info.title || '전시명 미정')
    for (const f of faces) {
      f.material.map = tex
      f.material.needsUpdate = true
      f.userData.pick = { type: 'poster', exhibition: ex }
    }
    for (const cf of capFaces) {
      cf.material.map = capTex
      cf.material.needsUpdate = true
    }
  }

  // 입구 배너
  const bannerCanvas = makeCanvas(1400, 200)
  const bannerTex = toTexture(bannerCanvas)
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 1.0),
    new THREE.MeshBasicMaterial({ map: bannerTex, color: '#c6c2cf', transparent: true, side: THREE.DoubleSide }),
  )
  const entryZ = c.z + half - 1.6
  banner.position.set(0, 3.25, entryZ)
  g.add(banner)
  for (const x of [-3.6, 3.6]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.8, 0.2), MAT.model())
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
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.95), MAT.modelDark())
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

  const light = new THREE.PointLight(C.light, 45, 32, 1.6)
  light.position.set(c.x, 8, c.z + 2)
  g.add(light)

  let lastBanner = ''
  return {
    id: 'gallery',
    center: c,
    group: g,
    spots: plinths.map((p) => p.pos),
    plinths,
    posters,
    pickables,
    setCurrent,
    facers: [],
    cutaways: Object.values(walls).map((w) => cutaway(w.group, ...w.out)),
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
      crownMat.emissiveIntensity = sim.exhibitionOpen ? 1.8 + Math.sin(t * 2.4) * 0.6 : 0.6
    },
  }
}

/* ───────────────────────── 조립 ───────────────────────── */
// view: { az } — 카메라 방위. 표지물(facer)과 컷어웨이가 이 값을 따른다.
export function buildZones(scene, teams, view = { az: Math.PI / 4 }) {
  const zones = {
    agora: buildAgora(),
    D: buildD(teams),
    A: buildA(teams),
    H: buildH(teams),
    field: buildField(teams),
    gallery: buildGallery(teams),
  }
  for (const z of Object.values(zones)) scene.add(z.group)
  const facers = Object.values(zones).flatMap((z) => z.facers ?? [])
  const cutaways = Object.values(zones).flatMap((z) => z.cutaways ?? [])

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
    view,
    update(dt, t, sim) {
      for (const z of Object.values(zones)) z.update(dt, t, sim)
      // 표지물은 카메라 쪽으로, 카메라를 가리는 구조물은 흐리게
      const vx = Math.sin(view.az)
      const vz = Math.cos(view.az)
      for (const f of facers) {
        let d = view.az + f.offset - f.obj.rotation.y
        d = Math.atan2(Math.sin(d), Math.cos(d))
        f.obj.rotation.y += d * Math.min(1, dt * 6)
      }
      for (const cw of cutaways) {
        const target = cw.dir.x * vx + cw.dir.z * vz > 0.3 ? 0.16 : 1
        const moving = Math.abs(cw.alpha - target) > 0.005
        if (moving) cw.alpha = lerp(cw.alpha, target, Math.min(1, dt * 5))
        else cw.alpha = target
        // 흐려진 동안 새로 걸린 포스터도 같은 투명도를 갖도록 매 프레임 적용
        if (moving || cw.alpha < 0.999 || cw.dirty) setFade(cw.obj, cw.alpha)
        cw.dirty = moving
      }
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
