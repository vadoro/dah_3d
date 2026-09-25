import * as THREE from 'three'
import { glowTexture } from './textures.js'

// 아이디어 입자 · 별자리 · 축하 입자
// 대화가 오갈 때 말한 사람에게서 듣는 사람에게로 빛이 건너가고,
// 좋은 아이디어는 별이 되어 원탁 위 하늘에 팀별 별자리를 만든다.

const VERT = /* glsl */ `
attribute float size;
attribute float alpha;
attribute vec3 pcolor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (320.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vAlpha = alpha;
  vColor = pcolor;
}`
const FRAG = /* glsl */ `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
  if (gl_FragColor.a < 0.004) discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function pointCloud(n, map) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('pcolor', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage))
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: map } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

const tmp = new THREE.Vector3()
function bezier(out, a, b, c, t) {
  const u = 1 - t
  out
    .set(0, 0, 0)
    .addScaledVector(a, u * u)
    .addScaledVector(b, 2 * u * t)
    .addScaledVector(c, t * t)
  return out
}

export class FX {
  constructor(scene, teams) {
    this.teams = teams
    const map = glowTexture()
    this.POOL = 500
    this.particles = pointCloud(this.POOL, map)
    this.pool = Array.from({ length: this.POOL }, () => ({ active: false }))
    scene.add(this.particles)

    this.MAX_STARS = 900
    this.stars = pointCloud(this.MAX_STARS, map)
    this.starData = []
    scene.add(this.stars)

    this.MAX_LINES = 900
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAX_LINES * 6), 3))
    lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.MAX_LINES * 6), 3))
    lg.setDrawRange(0, 0)
    this.lines = new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.lines.frustumCulled = false
    this.lineCount = 0
    this.lineGen = []
    scene.add(this.lines)

    this.generation = 0 // 학기 수 — 별자리가 해마다 바깥으로 쌓인다
    this.lastStar = teams.map(() => null)
    this.counts = teams.map(() => 0)
    this.glow = 1
  }

  anchor(teamIdx) {
    const gen = this.generation
    const a = teamIdx * (Math.PI / 2) + Math.PI / 4 + gen * 0.45
    const r = 6.5 + gen * 2.2
    return new THREE.Vector3(Math.cos(a) * r, 13.5 + teamIdx * 0.5 + gen * 1.6, Math.sin(a) * r - 2)
  }

  spawn(p) {
    const slot = this.pool.find((x) => !x.active)
    if (!slot) return null
    Object.assign(slot, { active: true, t: 0, ...p })
    return slot
  }

  // 대화 한 마디 → 말한 사람에게서 듣는 사람에게로 빛 입자
  idea(from, to, color) {
    for (let k = 0; k < 3; k++) {
      const mid = from.clone().lerp(to, 0.5)
      mid.y += 0.6 + Math.random() * 0.5
      this.spawn({
        kind: 'arc',
        a: from.clone(),
        b: mid,
        c: to.clone(),
        dur: 0.9 + k * 0.18,
        delay: k * 0.12,
        color: new THREE.Color(color),
        size: 0.55,
      })
    }
  }

  // 좋은 아이디어 → 별이 떠올라 팀 별자리에 붙는다
  star(teamIdx, from) {
    const target = this.anchor(teamIdx).add(
      new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 5),
    )
    const mid = from.clone().lerp(target, 0.5)
    mid.y += 2
    this.spawn({
      kind: 'rise',
      a: from.clone(),
      b: mid,
      c: target,
      dur: 2.4,
      delay: 0,
      color: new THREE.Color(this.teams[teamIdx].color),
      size: 1.0,
      team: teamIdx,
    })
  }

  burst(pos, colors, n = 60) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4)
      this.spawn({
        kind: 'burst',
        a: pos.clone(),
        v,
        dur: 1.6 + Math.random() * 0.8,
        delay: Math.random() * 0.3,
        color: new THREE.Color(colors[i % colors.length]),
        size: 0.45,
      })
    }
  }

  addStar(teamIdx, pos, color) {
    if (this.starData.length >= this.MAX_STARS) this.starData.shift()
    this.starData.push({
      pos: pos.clone(),
      color: color.clone(),
      gen: this.generation,
      phase: Math.random() * 6.28,
      size: 0.9 + Math.random() * 0.8,
    })
    const prev = this.lastStar[teamIdx]
    if (prev && this.lineCount < this.MAX_LINES) {
      const la = this.lines.geometry.attributes.position
      const lc = this.lines.geometry.attributes.color
      la.setXYZ(this.lineCount * 2, prev.x, prev.y, prev.z)
      la.setXYZ(this.lineCount * 2 + 1, pos.x, pos.y, pos.z)
      lc.setXYZ(this.lineCount * 2, color.r, color.g, color.b)
      lc.setXYZ(this.lineCount * 2 + 1, color.r, color.g, color.b)
      la.needsUpdate = true
      lc.needsUpdate = true
      this.lineGen[this.lineCount] = this.generation
      this.lineCount++
      this.lines.geometry.setDrawRange(0, this.lineCount * 2)
    }
    this.lastStar[teamIdx] = pos.clone()
    this.counts[teamIdx]++
  }

  // 학기가 끝나면 이번 별자리는 하늘에 남고(흐려짐), 다음 학기 별자리는 바깥에 새로 생긴다
  nextGeneration() {
    this.generation++
    this.lastStar = this.teams.map(() => null)
    this.counts = this.teams.map(() => 0)
  }

  // "처음부터": 이번 학기에 생긴 별과 선만 지운다
  resetCurrent() {
    this.starData = this.starData.filter((s) => s.gen < this.generation)
    const la = this.lines.geometry.attributes.position
    const lc = this.lines.geometry.attributes.color
    let n = 0
    for (let i = 0; i < this.lineCount; i++) {
      if (this.lineGen[i] >= this.generation) continue
      for (let k = 0; k < 2; k++) {
        la.setXYZ(n * 2 + k, la.getX(i * 2 + k), la.getY(i * 2 + k), la.getZ(i * 2 + k))
        lc.setXYZ(n * 2 + k, lc.getX(i * 2 + k), lc.getY(i * 2 + k), lc.getZ(i * 2 + k))
      }
      this.lineGen[n] = this.lineGen[i]
      n++
    }
    this.lineCount = n
    this.lineGen.length = n
    la.needsUpdate = true
    lc.needsUpdate = true
    this.lines.geometry.setDrawRange(0, n * 2)
    this.lastStar = this.teams.map(() => null)
    this.counts = this.teams.map(() => 0)
    for (const p of this.pool) p.active = false
  }

  update(dt, t) {
    const P = this.particles.geometry.attributes
    for (let i = 0; i < this.POOL; i++) {
      const p = this.pool[i]
      if (!p.active) {
        P.alpha.array[i] = 0
        continue
      }
      p.t += dt
      const lt = p.t - p.delay
      if (lt < 0) {
        P.alpha.array[i] = 0
        continue
      }
      const k = Math.min(1, lt / p.dur)
      if (p.kind === 'burst') {
        tmp.copy(p.a).addScaledVector(p.v, lt)
        tmp.y -= 4.5 * lt * lt
        P.alpha.array[i] = 1 - k
      } else {
        const e = p.kind === 'rise' ? k * k * (3 - 2 * k) : k
        bezier(tmp, p.a, p.b, p.c, e)
        P.alpha.array[i] = p.kind === 'rise' ? 1 : Math.sin(k * Math.PI)
      }
      P.position.setXYZ(i, tmp.x, tmp.y, tmp.z)
      P.pcolor.setXYZ(i, p.color.r, p.color.g, p.color.b)
      P.size.array[i] = p.size * (p.kind === 'rise' ? 1 + Math.sin(t * 12) * 0.15 : 1)
      if (k >= 1) {
        p.active = false
        P.alpha.array[i] = 0
        if (p.kind === 'rise') this.addStar(p.team, p.c, p.color)
      }
    }
    P.position.needsUpdate = true
    P.pcolor.needsUpdate = true
    P.size.needsUpdate = true
    P.alpha.needsUpdate = true

    const S = this.stars.geometry.attributes
    const n = this.starData.length
    for (let i = 0; i < this.MAX_STARS; i++) {
      if (i >= n) {
        S.alpha.array[i] = 0
        continue
      }
      const s = this.starData[i]
      const old = s.gen < this.generation
      S.position.setXYZ(i, s.pos.x, s.pos.y, s.pos.z)
      S.pcolor.setXYZ(i, s.color.r, s.color.g, s.color.b)
      S.size.array[i] = s.size * (old ? 0.7 : 1) * (1 + (this.glow - 1) * 0.6)
      S.alpha.array[i] = (old ? 0.35 : 0.9) * (0.75 + Math.sin(t * 2 + s.phase) * 0.25) * Math.min(this.glow, 1.6)
    }
    S.position.needsUpdate = true
    S.pcolor.needsUpdate = true
    S.size.needsUpdate = true
    S.alpha.needsUpdate = true
    this.lines.material.opacity = 0.35 + (this.glow - 1) * 0.4
  }
}
