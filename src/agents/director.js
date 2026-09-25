import * as THREE from 'three'
import { WEEK_SECONDS, WEEKS, LAYOUT } from '../config.js'
import { DAH, nextSemester } from '../data/dah.js'
import { PHASES, LINES } from '../data/script.js'
import { route } from './nav.js'

const V = (x, z) => new THREE.Vector3(x, 0, z)
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const clamp01 = (x) => Math.min(1, Math.max(0, x))

const ZONE_NAME = { D: 'D 스튜디오', A: 'A 랩', H: 'H 스테이지', field: '이슈 맵', gallery: '전시 섬', agora: '원탁' }
const AWARDS = ['우수 프로젝트상', '관람객 인기상', '베스트 협업상', '도전상']

// 한 학기를 진행하는 연출가: 단계 전환, 자리 배치, 대화(비트), 교수 순회, 전시 관람객, 시상식
export class Director {
  constructor({ teams, profs, students, visitors, world, fx, events }) {
    this.teams = teams
    this.profs = profs
    this.students = students
    this.visitors = visitors
    this.people = [...profs, ...students]
    this.everyone = [...profs, ...students, ...visitors]
    this.world = world
    this.fx = fx
    this.events = events
    this.teamAgents = teams.map((t) => students.filter((s) => s.data.team === t.id))
    for (const s of students) s.teamIndex = teams.findIndex((t) => t.id === s.data.team)

    this.semester = { ...DAH.current }
    this.world.zones.gallery.setCurrent(this.semester)
    this.clock = 0
    this.speedMul = 1
    this.resetSemesterState()

    // 시작: 모두 플랫폼 곳곳에서 원탁으로 모여든다
    this.people.forEach((a, i) => {
      const ang = (i / this.people.length) * Math.PI * 2 + rand(-0.2, 0.2)
      const r = rand(9, 17)
      a.place(V(Math.cos(ang) * r, Math.sin(ang) * r))
      a.yaw = Math.atan2(-a.position.x, -a.position.z)
    })
    for (const v of this.visitors) {
      v.root.visible = false
      v.active = false
    }
  }

  resetSemesterState() {
    this.week = 0
    this.phaseIndex = -1
    this.phase = null
    this.progress = this.teams.map(() => [0, 0, 0, 0, 0])
    this.groups = []
    this.stats = { beats: 0, stars: this.teams.map(() => 0), visits: this.teams.map(() => 0), guests: this.teams.map(() => 0) }
    this.recent = new Map()
    this.awardsGiven = 0
    this.midtermTurn = -1
    this.councilOut = false
    for (const a of this.people) a.saidPersonal = false
  }

  get simState() {
    return {
      progress: this.progress,
      current: this.semester,
      exhibitionPrep: this.week >= 12.8,
      exhibitionOpen: this.phase?.id === 'exhibition',
      showDevices: ['prototype', 'story'].includes(this.phase?.id),
    }
  }

  restart() {
    this.clearGroups()
    for (const v of this.visitors) this.dismissVisitor(v, true)
    this.resetSemesterState()
    this.fx.resetCurrent()
    this.fx.glow = 1
  }

  // 타임라인 이동: 지나간 단계의 역량은 채우고, 다가올 단계는 비운다
  seek(week) {
    this.week = Math.max(0, Math.min(WEEKS - 0.001, week))
    this.progress.forEach((p) => p.fill(0))
    for (const ph of PHASES) {
      if (ph.weeks[1] > this.week) break
      const c = ph.competency
      if (c === null || c === undefined) continue
      for (const p of this.progress) p[c] = Math.max(p[c], ph.id === 'exhibition' ? 1 : 0.82)
    }
    this.phaseIndex = -1
    this.awardsGiven = 0
    this.midtermTurn = -1
    this.councilOut = false
  }

  /* ── 이동 도우미 ── */
  move(agent, target, { focus = null, action = 'idle', task, onArrive } = {}) {
    agent.goTo(route(agent.position, target), {
      onArrive: (a) => {
        a.focus = focus
        a.action = a.baseAction
        onArrive?.(a)
      },
    })
    agent.focus = null
    agent.action = 'idle'
    agent.baseAction = action
    if (task) agent.task = task
  }

  ring(center, radius, n, start = Math.PI / 4) {
    return Array.from({ length: n }, (_, k) => {
      const a = start + (k / n) * Math.PI * 2
      return V(center.x + Math.cos(a) * radius, center.z + Math.sin(a) * radius)
    })
  }

  makeGroup({ id, team = null, center, members, radius = 1.2, action = 'work', task, profSlots = true, zone }) {
    const g = {
      id,
      team,
      center: center.clone(),
      members: [],
      profs: [],
      guests: [],
      profSlotUsed: [null, null],
      nextBeat: this.clock + rand(1.2, 3.5),
      active: null,
      zone,
    }
    g.profSlots = profSlots
      ? [0, Math.PI].map((a) => V(center.x + Math.cos(a) * (radius + 0.4), center.z + Math.sin(a) * (radius + 0.4)))
      : []
    const slots = this.ring(center, radius, members.length)
    members.forEach((a, k) => {
      a.group = g
      g.members.push(a)
      this.move(a, slots[k], { focus: center, action, task })
    })
    this.groups.push(g)
    return g
  }

  clearGroups() {
    for (const g of this.groups) if (g.active) this.finishBeat(g, false)
    this.groups = []
    this.councilGroup = null
    for (const a of this.everyone) {
      a.group = null
      a.visit = null
    }
  }

  /* ── 단계 전환 ── */
  enterPhase(i) {
    const ph = PHASES[i]
    this.phaseIndex = i
    this.phase = ph
    this.phaseStart = this.progress.map((p) => [...p])
    this.clearGroups()
    const agora = this.world.zones.agora
    agora.setPanels(
      ph.id === 'orientation' ? 'jobs' : ph.id === 'midterm' ? 'teams' : ph.id === 'closing' ? 'vision' : null,
      this.teams,
      this.progress,
    )

    if (ph.layout === 'assembly') this.layoutAssembly(ph)
    else if (ph.layout === 'clusters') this.layoutClusters()
    else if (ph.layout === 'zone') this.layoutTeams(ph, this.world.zones[ph.zone].spots, ph.zone)
    else if (ph.layout === 'home') this.layoutTeams(ph, this.world.homeSpots, null)
    else if (ph.layout === 'gallery') this.layoutGallery()

    if (ph.id !== 'exhibition') for (const v of this.visitors) if (v.active || v.pending) this.dismissVisitor(v)
    this.events.phase?.(ph)
    this.log(ph.log, 'phase')
  }

  layoutAssembly(ph) {
    // 원탁 둘레에 교수와 네 팀이 번갈아 선다 — 위계 없이 한 원에서 토론
    const order = []
    this.teamAgents.forEach((members, k) => {
      order.push(this.profs[k])
      order.push(...members)
    })
    const g = {
      id: 'all',
      team: null,
      center: V(0, 0),
      members: [],
      profs: [],
      guests: [],
      profSlots: [],
      profSlotUsed: [],
      nextBeat: this.clock + 2,
      active: null,
      zone: 'agora',
    }
    const slots = this.ring(V(0, 0), 3.6, order.length, -Math.PI / 2)
    const task = ph.id === 'orientation' ? '원탁 · 오리엔테이션' : ph.id === 'midterm' ? '원탁 · 중간 발표' : '원탁 · 종강 총회'
    order.forEach((a, k) => {
      a.group = g
      g.members.push(a)
      this.move(a, slots[k], { focus: V(0, 0), action: 'idle', task })
    })
    this.groups.push(g)
  }

  layoutClusters() {
    const centers = this.ring(V(0, 0), 7.4, 4, Math.PI / 4)
    this.teamAgents.forEach((members, k) => {
      const t = this.teams[k]
      this.makeGroup({
        id: t.id,
        team: k,
        center: centers[k],
        members,
        radius: 1.0,
        action: 'idle',
        task: `아고라 · 팀 ${t.symbol} ${t.name} 결성`,
        zone: 'agora',
      })
    })
    this.startRotation()
  }

  layoutTeams(ph, spots, zoneId) {
    this.teamAgents.forEach((members, k) => {
      const t = this.teams[k]
      const zone = zoneId ?? t.home
      const task =
        ph.id === 'prototype'
          ? `${ZONE_NAME[zone]} · 「${t.project}」 프로토타입 제작`
          : `${ZONE_NAME[zone]} · ${ph.title} (${ph.subtitle})`
      const g = this.makeGroup({
        id: t.id,
        team: k,
        center: spots[k],
        members,
        radius: 1.2,
        action: ph.id === 'discover' ? 'idle' : 'work',
        task,
        zone,
      })
      if (ph.id === 'story' && this.week >= 12.8) this.sendCouncil(g)
    })
    this.startRotation()
  }

  layoutGallery() {
    const plinths = this.world.zones.gallery.plinths
    this.teamAgents.forEach((members, k) => {
      const t = this.teams[k]
      this.makeGroup({
        id: t.id,
        team: k,
        center: plinths[k].pos,
        members,
        radius: 1.35,
        action: 'present',
        task: `전시 섬 · 「${t.project}」 설명`,
        zone: 'gallery',
      })
    })
    this.startRotation()
    this.councilOut = false
    // 관람객 입장 — 다리 건너편에서 차례로
    this.visitors.forEach((v, i) => {
      v.spawnAt = this.clock + 1.2 + i * 0.9
      v.pending = true
    })
  }

  /* ── 교수 순회 멘토링 ── */
  startRotation() {
    const order = [...this.profs].sort(() => Math.random() - 0.5)
    order.forEach((p, i) => this.assignVisit(p, this.groups[i % this.groups.length]))
  }

  chooseGroup(prof) {
    const teamGroups = this.groups.filter((g) => g.team !== null && g !== prof.visit && g.profSlotUsed.some((x) => !x))
    if (!teamGroups.length) return null
    let best = null
    let bestScore = Infinity
    for (const g of teamGroups) {
      const t = this.teams[g.team]
      let score = g.profSlotUsed.filter(Boolean).length * 10 + Math.random() * 5
      if (prof.data.track === t.lead) score -= 3
      if (prof.data.track === 'lead') score -= 1
      if (score < bestScore) {
        bestScore = score
        best = g
      }
    }
    return best
  }

  leaveVisit(prof) {
    const g = prof.visit
    if (!g) return
    const k = g.profSlotUsed.indexOf(prof)
    if (k >= 0) g.profSlotUsed[k] = null
    g.profs = g.profs.filter((p) => p !== prof)
    if (g.active && (g.active.speaker === prof || g.active.listeners.includes(prof))) this.finishBeat(g)
    prof.visit = null
    prof.group = null
  }

  assignVisit(prof, g) {
    if (!g) return
    const k = g.profSlotUsed.findIndex((x) => !x)
    if (k < 0) return
    this.leaveVisit(prof)
    g.profSlotUsed[k] = prof
    prof.visit = g
    prof.group = g
    prof.visitUntil = this.week + rand(0.5, 0.95)
    const t = this.teams[g.team]
    this.move(prof, g.profSlots[k], {
      focus: g.center,
      action: 'idle',
      task: `팀 ${t.symbol} ${t.name} 멘토링`,
      onArrive: () => {
        if (prof.visit === g) {
          // 배속과 상관없이 최소 7초는 머물며 대화에 참여한다
          prof.visitMinClock = this.clock + 7
          g.profs.push(prof)
          g.nextBeat = Math.min(g.nextBeat, this.clock + 0.6)
        }
      },
    })
    this.stats.visits[g.team]++
  }

  /* ── 운영위원회 · 관람객 ── */
  sendCouncil(g) {
    const council = g.members.filter((a) => a.data.council)
    if (!council.length) return
    const gal = LAYOUT.zones.gallery.center
    for (const a of council) {
      g.members = g.members.filter((m) => m !== a)
      const x = a.data.id === 's-narae' ? -1.2 : 1.2
      if (!this.councilGroup) {
        this.councilGroup = {
          id: 'council',
          team: null,
          center: V(0, gal.z + 9.6),
          members: [],
          profs: [],
          guests: [],
          profSlots: [],
          profSlotUsed: [],
          nextBeat: this.clock + 3,
          active: null,
          zone: 'gallery',
        }
        this.groups.push(this.councilGroup)
      }
      a.group = this.councilGroup
      this.councilGroup.members.push(a)
      this.move(a, V(x, gal.z + 10.2), { focus: V(0, gal.z + 11.4), action: 'work', task: '운영위원회 · 전시회 준비' })
    }
    this.councilOut = true
  }

  spawnVisitor(v) {
    v.pending = false
    v.active = true
    v.root.visible = true
    v.place(V(rand(-1, 1), -23.5))
    v.yaw = Math.PI
    v.task = v.data.mentor ? '전시 관람 · 피드백' : '전시 관람 중'
    this.nextVisitorStop(v)
  }

  nextVisitorStop(v) {
    if (v.guestOf) {
      v.guestOf.guests = v.guestOf.guests.filter((x) => x !== v)
      v.guestOf = null
    }
    const gallery = this.world.zones.gallery
    const teamGroups = this.groups.filter((g) => g.team !== null)
    if (teamGroups.length && Math.random() < 0.6) {
      const g = pick(teamGroups)
      const dir = g.center.clone().sub(LAYOUT.zones.gallery.center).setY(0).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(rand(-1.3, 1.3))
      const target = g.center.clone().addScaledVector(dir, 2.3).add(side)
      this.move(v, target, {
        focus: g.center,
        action: 'look',
        onArrive: () => {
          v.guestOf = g
          g.guests.push(v)
          this.stats.guests[g.team]++
          v.lookUntil = this.clock + rand(5, 9)
        },
      })
    } else {
      const p = pick(gallery.posters)
      const target = p.viewPos.clone().add(V(rand(-0.6, 0.6), rand(-0.6, 0.6)))
      this.move(v, target, { focus: p.slotPos, action: 'look', onArrive: () => (v.lookUntil = this.clock + rand(3, 6)) })
    }
    v.lookUntil = Infinity
  }

  dismissVisitor(v, instant = false) {
    if (v.guestOf) {
      v.guestOf.guests = v.guestOf.guests.filter((x) => x !== v)
      v.guestOf = null
    }
    v.pending = false
    if (instant || !v.root.visible) {
      v.active = false
      v.root.visible = false
      return
    }
    v.active = false
    this.move(v, V(rand(-1, 1), -23.5), {
      onArrive: () => {
        v.root.visible = false
      },
    })
    v.task = '귀가'
  }

  /* ── 대화 비트 ── */
  pickLine(agent, g) {
    const ph = this.phase
    const bank = LINES[ph.id] ?? {}
    let pool = []
    if (agent.kind === 'prof') {
      pool = [...(bank.prof?.[agent.data.track] ?? []), ...(bank.prof?.any ?? [])]
    } else if (agent.kind === 'visitor') {
      pool = agent.data.mentor ? (bank.mentor ?? []) : (bank.visitor ?? [])
    } else {
      if (agent.data.council && bank.council && (g.id === 'council' || Math.random() < 0.35)) pool = bank.council
      else if (bank.personal && !agent.saidPersonal) {
        agent.saidPersonal = true
        return agent.data.line
      } else {
        const t = this.teams[agent.teamIndex]
        const teamLines = bank.team ? (t.lines[bank.team] ?? []) : []
        pool = teamLines.length && Math.random() < 0.6 ? teamLines : (bank.student ?? [])
      }
    }
    if (!pool.length) pool = bank.student ?? ['좋아요, 해 봅시다!']
    const fresh = pool.filter((l) => !(this.recent.get(l) > this.clock - 30))
    const line = pick(fresh.length ? fresh : pool)
    this.recent.set(line, this.clock)
    return line.replace('{ordinal}', this.semester.ordinal)
  }

  speakerWeights(g, present) {
    const ph = this.phase
    return present.map((a) => {
      if (a.kind === 'visitor') return 1.6
      if (a.kind === 'prof') {
        if (ph.id === 'orientation') return a.data.track === 'lead' ? 5 : 1.4
        if (ph.id === 'midterm') return 1.6
        return g.id === 'all' ? 1.8 : 2.4
      }
      if (ph.id === 'midterm') return a.teamIndex === this.midtermTurn ? 3 : 0.35
      if (ph.id === 'orientation' && a.saidPersonal) return 0.3
      if (g.guests.length) return 1.4
      return 1
    })
  }

  startBeat(g) {
    const present = [...g.members, ...g.profs, ...g.guests].filter((a) => !a.moving)
    if (present.length < 2) {
      g.nextBeat = this.clock + 0.6
      return
    }
    const w = this.speakerWeights(g, present)
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    let speaker = present[0]
    for (let i = 0; i < present.length; i++) {
      r -= w[i]
      if (r <= 0) {
        speaker = present[i]
        break
      }
    }
    const text = this.pickLine(speaker, g)
    const dur = THREE.MathUtils.clamp(1.7 + text.length * 0.065, 2.6, 5.6)
    speaker.say(text, this.clock, dur)
    speaker.action = 'talk'
    const listeners = present.filter((a) => a !== speaker)
    speaker.focus = listeners.length > 1 ? g.center : listeners[0].position.clone()
    for (const a of listeners) {
      a.action = a.kind === 'visitor' ? 'look' : 'listen'
      a.focus = speaker.position.clone()
    }
    g.active = { speaker, listeners, until: this.clock + dur, text }
    this.stats.beats++
    if (speaker.kind === 'prof' && (g.team !== null || this.phase.id !== 'teaming')) {
      const where = g.team !== null ? ` → 팀 ${this.teams[g.team].symbol} ${this.teams[g.team].name}` : ''
      this.log(`${speaker.data.name}${where}: "${text}"`, 'talk', speaker)
    } else if (speaker.data.mentor) {
      this.log(`현업 멘토: "${text}"`, 'talk', speaker)
    }
  }

  finishBeat(g, reward = true) {
    const { speaker, listeners } = g.active
    g.active = null
    speaker.action = speaker.baseAction ?? 'idle'
    speaker.focus = g.center
    for (const a of listeners) {
      a.action = a.baseAction ?? 'idle'
      a.focus = a.kind === 'visitor' && a.guestOf ? a.guestOf.center : g.center
    }
    g.nextBeat = this.clock + rand(0.7, 2.2)
    if (!reward) return
    // 말한 사람 → 듣는 사람에게 아이디어 입자
    const color = speaker.teamIndex != null ? this.teams[speaker.teamIndex].color : '#C8B9F2'
    listeners.slice(0, 3).forEach((l) => this.fx.idea(speaker.headPos, l.headPos, color))

    const ph = this.phase
    const c = ph.competency
    const profHere = g.profs.length > 0 || speaker.kind === 'prof'
    let teamIdx = g.team
    if (teamIdx === null && speaker.teamIndex != null) teamIdx = speaker.teamIndex
    if (teamIdx === null || teamIdx === undefined) return
    if (c !== null && c !== undefined) {
      const p = this.progress[teamIdx]
      p[c] = clamp01(p[c] + (profHere ? 0.03 : 0.015))
    }
    if (ph.id === 'orientation') return
    // 대화는 실제 시간 기준이라 배속이 빠르면 횟수가 줄어든다 — 별 개수가 배속과 무관하도록 보정
    const chance = (g.id === 'all' ? 0.3 : 0.26 + (profHere ? 0.3 : 0) + (g.guests.length ? 0.15 : 0)) * Math.max(1, this.speedMul)
    const n = Math.floor(chance) + (Math.random() < chance % 1 ? 1 : 0)
    const from = (g.id === 'all' ? speaker.position : g.center).clone().setY(2.2)
    for (let k = 0; k < n; k++) {
      this.fx.star(teamIdx, from)
      this.stats.stars[teamIdx]++
    }
  }

  /* ── 진행도 ── */
  updateProgress() {
    const ph = this.phase
    const [w0, w1] = ph.weeks
    const f = clamp01((this.week - w0) / (w1 - w0))
    const grow = (comp, target) => {
      this.progress.forEach((p, t) => {
        const base = this.phaseStart[t][comp] + (target - this.phaseStart[t][comp]) * f
        p[comp] = Math.max(p[comp], base)
      })
    }
    if (ph.competency !== null && ph.competency !== undefined) grow(ph.competency, ph.id === 'exhibition' ? 1 : 0.82)
    if (ph.id === 'prototype') grow(2, 0.9)
    if (ph.id === 'story') grow(4, 0.95)
    if (ph.id === 'exhibition') for (let k = 0; k < 5; k++) grow(k, 1)
  }

  /* ── 단계 안의 사건들 ── */
  updateEvents() {
    const ph = this.phase
    const f = clamp01((this.week - ph.weeks[0]) / (ph.weeks[1] - ph.weeks[0]))

    if (ph.id === 'midterm') {
      // 모두 원탁에 모인 뒤(18%) 네 팀이 차례로 발표한다
      const turn = f < 0.18 ? -1 : Math.min(3, Math.floor(((f - 0.18) / 0.82) * 4))
      if (turn >= 0 && turn !== this.midtermTurn) {
        this.midtermTurn = turn
        const t = this.teams[turn]
        for (const a of this.students) {
          a.baseAction = a.teamIndex === turn ? 'present' : 'idle'
          if (!a.moving && a !== this.groups[0]?.active?.speaker) a.action = a.baseAction
        }
        this.log(`중간 발표 · 팀 ${t.symbol} ${t.name} 「${t.project}」`, 'event')
        this.events.toast?.(`중간 발표 · 팀 ${t.symbol} ${t.name}`, t.project)
      }
    }

    if (ph.id === 'story' && this.week >= 12.8 && !this.councilOut) {
      for (const g of this.groups) if (g.team !== null) this.sendCouncil(g)
      this.log('운영위원회가 먼저 전시 섬으로 건너가 전시를 준비합니다.', 'event')
    }

    if (ph.id === 'exhibition') {
      for (const v of this.visitors) {
        if (v.pending && this.clock >= v.spawnAt) this.spawnVisitor(v)
        else if (v.active && !v.moving && this.clock > v.lookUntil) this.nextVisitorStop(v)
      }
    }

    if (ph.id === 'closing') {
      this.fx.glow = 1 + clamp01(f * 2) * 1.2
      const due = f < 0.5 ? 0 : 1 + Math.floor((f - 0.5) / 0.12)
      if (due > this.awardsGiven && this.awardsGiven < 4) this.giveAward(this.awardsGiven++)
      if (this.clapUntil && this.clock > this.clapUntil) {
        this.clapUntil = 0
        for (const a of this.people) {
          a.baseAction = 'idle'
          if (!a.moving) a.action = 'idle'
        }
      }
    } else if (this.fx.glow > 1) {
      this.fx.glow = Math.max(1, this.fx.glow - 0.01)
    }
  }

  giveAward(k) {
    // 별(아이디어)이 많은 순서대로 상을 나눈다 — 시뮬레이션 속 가상의 시상
    const ranking = this.teams.map((_, i) => i).sort((a, b) => this.stats.stars[b] - this.stats.stars[a])
    const teamIdx = ranking[k]
    const t = this.teams[teamIdx]
    this.log(`종강 총회 시상 · ${AWARDS[k]} — 팀 ${t.symbol} ${t.name} 「${t.project}」`, 'award')
    this.events.toast?.(`${AWARDS[k]}`, `팀 ${t.symbol} ${t.name} · ${t.project}`)
    this.fx.burst(V(0, 0).setY(2.4), [t.color, '#F7F5FC', '#C8B9F2'], 70)
    for (const a of this.people) {
      a.baseAction = a.teamIndex === teamIdx ? 'present' : 'clap'
      if (!a.moving && !a.bubbleUntil) a.action = a.baseAction
    }
    this.clapUntil = this.clock + 2.8
  }

  endSemester() {
    const total = this.stats.stars.reduce((a, b) => a + b, 0)
    this.log(
      `${this.semester.semester}학기 종료 · 아이디어 별 ${total}개 · 제${this.semester.ordinal}회 전시가 아카이브에 남았습니다.`,
      'phase',
    )
    this.events.semester?.({ ...this.semester, stars: total })
    this.clearGroups()
    this.fx.nextGeneration()
    this.semester = { semester: nextSemester(this.semester.semester), ordinal: this.semester.ordinal + 1, title: '' }
    this.world.zones.gallery.setCurrent(this.semester)
    this.resetSemesterState()
  }

  log(text, kind = 'info', agent = null) {
    this.events.log?.({ week: Math.floor(this.week) + 1, text, kind, agent })
  }

  /* ── 매 프레임 ── */
  update(dt, speedMul, playing) {
    this.speedMul = speedMul
    const running = playing ? speedMul : 0
    if (playing) {
      this.clock += dt
      this.week += (dt * speedMul) / WEEK_SECONDS
      if (this.week >= WEEKS) this.endSemester()
    }
    const pi = PHASES.findIndex((p) => this.week >= p.weeks[0] && this.week < p.weeks[1])
    if (pi !== this.phaseIndex && pi >= 0) this.enterPhase(pi)

    if (playing) {
      this.updateProgress()
      this.updateEvents()
      // 교수 순회
      if (this.groups.some((g) => g.team !== null)) {
        for (const p of this.profs) {
          const inBeat = p.visit?.active && (p.visit.active.speaker === p || p.visit.active.listeners.includes(p))
          if (!p.moving && p.visit && this.week > p.visitUntil && this.clock > (p.visitMinClock ?? 0) && !inBeat) {
            const next = this.chooseGroup(p)
            if (next) {
              const t = this.teams[next.team]
              this.assignVisit(p, next)
              if (Math.random() < 0.5) this.log(`${p.data.name}가 팀 ${t.symbol} ${t.name}에 합류해 함께 토론합니다.`, 'visit', p)
            } else p.visitUntil = this.week + 0.3
          }
        }
      }
      // 대화
      for (const g of this.groups) {
        if (g.active) {
          if (this.clock >= g.active.until) this.finishBeat(g)
        } else if (this.clock >= g.nextBeat) this.startBeat(g)
      }
    }
    for (const a of this.everyone) if (a.root.visible) a.update(dt, this.clock, 0, running)
  }

  // 인스펙터 · HUD용 요약
  teamSummary(k) {
    const p = this.progress[k]
    return {
      team: this.teams[k],
      progress: p,
      overall: p.reduce((a, b) => a + b, 0) / p.length,
      stars: this.stats.stars[k],
      visits: this.stats.visits[k],
      members: this.teamAgents[k],
    }
  }
}
