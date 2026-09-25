import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { createAvatar } from './avatar.js'

const damp = (a, b, k, dt) => THREE.MathUtils.damp(a, b, k, dt)

function angleDamp(a, b, k, dt) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * (1 - Math.exp(-k * dt))
}

const ACTION_LABEL = {
  idle: '대기',
  walk: '이동 중',
  talk: '말하는 중',
  listen: '듣는 중',
  work: '작업 중',
  present: '발표 · 설명 중',
  clap: '박수',
  look: '관람 중',
}

export class Agent {
  constructor(data, spec, index) {
    this.data = data
    this.id = data.id
    this.kind = data.kind
    this.index = index
    const av = createAvatar(spec)
    this.root = av.root
    this.rig = av.rig
    this.parts = av.parts
    this.hit = av.hit
    this.sel = av.sel
    this.hit.userData.agent = this
    this.height = spec.height ?? 1

    this.path = []
    this.moving = false
    this.speed = 2.4
    this.walkPhase = Math.random() * 6
    this.action = 'idle'
    this.focus = null // 바라볼 지점
    this.yaw = 0
    this.task = '' // 인스펙터에 보이는 현재 활동
    this.lines = [] // 최근 대사
    this.seed = Math.random() * 100
    this.onArrive = null

    // 이름표 + 말풍선 (CSS2D)
    const el = document.createElement('div')
    el.className = `agent-label kind-${this.kind}`
    const stack = document.createElement('div')
    stack.className = 'stack'
    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    const tag = document.createElement('div')
    tag.className = 'nametag'
    tag.textContent = data.name
    if (spec.team) tag.style.setProperty('--team', spec.team)
    stack.append(bubble, tag)
    el.append(stack)
    this.el = el
    this.bubbleEl = bubble
    this.label = new CSS2DObject(el)
    this.label.position.set(0, 2.05 * this.height, 0)
    this.root.add(this.label)
    this.bubbleUntil = 0
  }

  get position() {
    return this.root.position
  }

  get headPos() {
    return this.root.position.clone().setY(1.6 * this.height)
  }

  get actionLabel() {
    return this.moving ? ACTION_LABEL.walk : (ACTION_LABEL[this.action] ?? '')
  }

  place(p) {
    this.root.position.copy(p)
    this.path = []
    this.moving = false
  }

  goTo(points, { speed, onArrive } = {}) {
    this.path = points.map((p) => p.clone().setY(0))
    this.moving = this.path.length > 0
    // 먼 이동(전시 섬 왕복 등)은 빨리 감기처럼 속도를 올려 약 5초 안에 도착한다
    let dist = 0
    let prev = this.root.position
    for (const p of this.path) {
      dist += prev.distanceTo(p)
      prev = p
    }
    this.speed = speed ?? THREE.MathUtils.clamp(dist / 5, 2.2, 12)
    this.onArrive = onArrive ?? null
  }

  say(text, now, duration) {
    this.bubbleEl.textContent = text
    this.el.classList.add('speaking')
    this.bubbleUntil = now + duration
    this.lines.unshift(text)
    if (this.lines.length > 4) this.lines.pop()
  }

  setSelected(v) {
    this.sel.visible = v
    this.el.classList.toggle('selected', v)
  }

  update(dt, t, simDt, speedMul) {
    // 말풍선 시간
    if (this.bubbleUntil && t > this.bubbleUntil) {
      this.el.classList.remove('speaking')
      this.bubbleUntil = 0
    }

    const P = this.parts
    let targetYaw = this.yaw
    let stride = 0
    if (this.moving && this.path.length) {
      const target = this.path[0]
      const pos = this.root.position
      const dx = target.x - pos.x
      const dz = target.z - pos.z
      const d = Math.hypot(dx, dz)
      const step = this.speed * speedMul * dt
      if (d <= step || d < 0.02) {
        pos.x = target.x
        pos.z = target.z
        this.path.shift()
        if (!this.path.length) {
          this.moving = false
          const cb = this.onArrive
          this.onArrive = null
          cb?.(this)
        }
      } else {
        pos.x += (dx / d) * step
        pos.z += (dz / d) * step
        targetYaw = Math.atan2(dx, dz)
        stride = Math.min(1, this.speed / 3)
      }
    }
    if (!this.moving && this.focus) {
      const dx = this.focus.x - this.root.position.x
      const dz = this.focus.z - this.root.position.z
      if (dx * dx + dz * dz > 0.0004) targetYaw = Math.atan2(dx, dz)
    }
    this.yaw = angleDamp(this.yaw, targetYaw, this.moving ? 10 : 5, dt)
    this.root.rotation.y = this.yaw

    // 포즈
    let legL = 0,
      legR = 0,
      armLx = 0,
      armRx = 0,
      armLz = 0.08,
      armRz = -0.08,
      headX = 0,
      bob = 0
    const s = this.seed
    if (this.moving) {
      this.walkPhase += dt * speedMul * (5 + Math.min(this.speed, 4.5) * 2.2)
      const w = Math.sin(this.walkPhase)
      legL = w * 0.65 * stride
      legR = -w * 0.65 * stride
      armLx = -w * 0.55 * stride
      armRx = w * 0.55 * stride
      bob = Math.abs(Math.cos(this.walkPhase)) * 0.045 * stride
    } else {
      switch (this.action) {
        case 'talk':
          armRx = -0.75 - Math.sin(t * 5 + s) * 0.3
          armRz = -0.25
          armLx = -0.25 - Math.sin(t * 3.3 + s) * 0.15
          headX = Math.sin(t * 7 + s) * 0.06
          break
        case 'listen':
          headX = Math.max(0, Math.sin(t * 1.3 + s)) * 0.12
          armLz = 0.12
          armRz = -0.12
          break
        case 'work':
          armLx = -1.05 + Math.sin(t * 13 + s) * 0.07
          armRx = -1.05 + Math.sin(t * 11 + s + 1) * 0.07
          armLz = -0.12
          armRz = 0.12
          headX = 0.3
          break
        case 'present':
          armRx = -1.35 + Math.sin(t * 2 + s) * 0.12
          armRz = -0.35
          armLx = -0.3
          headX = Math.sin(t * 4 + s) * 0.04
          break
        case 'clap': {
          armLx = -1.15
          armRx = -1.15
          const c = Math.abs(Math.sin(t * 9 + s))
          armLz = -0.15 - c * 0.3
          armRz = 0.15 + c * 0.3
          bob = Math.abs(Math.sin(t * 4.5 + s)) * 0.03
          break
        }
        case 'look':
          headX = -0.12
          armLx = -0.15
          armRx = -0.15
          break
        default:
          armLz = 0.08 + Math.sin(t * 1.1 + s) * 0.02
          armRz = -armLz
      }
    }
    const k = 12
    P.legL.rotation.x = damp(P.legL.rotation.x, legL, k, dt)
    P.legR.rotation.x = damp(P.legR.rotation.x, legR, k, dt)
    P.armL.rotation.x = damp(P.armL.rotation.x, armLx, k, dt)
    P.armR.rotation.x = damp(P.armR.rotation.x, armRx, k, dt)
    P.armL.rotation.z = damp(P.armL.rotation.z, armLz, k, dt)
    P.armR.rotation.z = damp(P.armR.rotation.z, armRz, k, dt)
    P.head.rotation.x = damp(P.head.rotation.x, headX, 8, dt)
    const breathe = 1 + Math.sin(t * 2 + s) * 0.012
    P.torso.scale.set(breathe, 1, breathe)
    this.rig.position.y = damp(this.rig.position.y, bob, 20, dt)
  }
}
