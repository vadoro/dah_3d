import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import { CAMERA_PRESETS, SPEEDS, ISO } from './config.js'
import { DAH, exhibitionName } from './data/dah.js'
import { professors, students, teams, visitors, TRACK_COLORS, HAIR } from './data/cast.js'
import { PHASES, LINES } from './data/script.js'
import { buildEnvironment } from './world/environment.js'
import { buildZones } from './world/zones.js'
import { FX } from './world/fx.js'
import { Agent } from './agents/agent.js'
import { Director } from './agents/director.js'
import { CameraRig } from './camera.js'
import { createHud } from './ui/hud.js'

const params = new URLSearchParams(location.search)

// 캔버스 텍스처에 쓰일 한글 글리프를 미리 받는다(Pretendard 동적 서브셋)
async function loadFonts() {
  const text =
    JSON.stringify({ DAH, teams, PHASES }) +
    'D 스튜디오 A 랩 H 스테이지 이슈 맵 디자인 트랙 문제 정의 경험 사회혁신디자인 AI디자인 먼저 듣고 열어 두고 안으로 초대하는 구조 ' +
    'AI 트랙 해결안 설계 빅데이터인문학 인문데이터마이닝 흩어진 데이터와 생각을 새로운 가능성으로 엔터컬쳐 스토리텔링 K-콘텐츠 문화원형 ' +
    '서로 다른 세계 사이에 다리를 놓는 대화 문제 발굴 지역과 글로벌 문제를 사람의 경험으로 다시 살펴보기 남들이 그냥 지나친 불편을 알아보는 눈 ' +
    '지역 이슈 맵 강원 춘천 원주 속초 강릉 동해 LOCAL GLOBAL 직군 지도 중간 발표 진행도 팀 프로토타입 배포 완료 사용해 보기 시작하기 ' +
    '문제의 장면 해결의 장면 전시명 미정 준비 중 NOW SHOWING 더 인스튜디오 UX·UI I-SO 시각디자인 CON:NECT 콘텐츠 DS4H 데이터 CLUB ' +
    exhibitionName(99) +
    '0123456789%·#「」'
  const faces = [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 32px "Pretendard Variable"`, text))
  await Promise.race([Promise.allSettled(faces), new Promise((r) => setTimeout(r, 4000))])
}

async function boot() {
  await loadFonts()
  const lowPower = matchMedia('(max-width: 820px)').matches

  /* ── 렌더러 · 장면 · 카메라 ── */
  const app = document.getElementById('app')
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2))
  renderer.setSize(innerWidth, innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  app.appendChild(renderer.domElement)

  const labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(innerWidth, innerHeight)
  document.getElementById('labels').appendChild(labelRenderer.domElement)

  const scene = new THREE.Scene()
  // 등각(isometric) 시점: 원근이 없는 직교 카메라
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 420)
  const fitFrustum = () => {
    // 세로 화면(휴대폰)에서는 가로 폭이 너무 좁아지지 않도록 시야를 넓힌다
    const aspect = innerWidth / innerHeight
    const h = (ISO.viewHeight / 2) * Math.max(1, 0.75 / aspect)
    const w = h * aspect
    camera.left = -w
    camera.right = w
    camera.top = h
    camera.bottom = -h
    camera.updateProjectionMatrix()
  }
  fitFrustum()
  camera.zoom = 0.62

  // 드래그 = 이동, 휠·핀치 = 확대. 회전은 Q/E 키와 도크 버튼으로 90°씩.
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.enableRotate = false
  controls.screenSpacePanning = false
  controls.zoomToCursor = true
  controls.minZoom = ISO.minZoom
  controls.maxZoom = ISO.maxZoom
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
  controls.target.set(0, 0, -14)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.55)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  /* ── 세계 ── */
  const env = buildEnvironment(scene)
  if (lowPower) env.keyLight.shadow.mapSize.set(1024, 1024)
  const view = { az: ISO.baseAzimuth }
  const world = buildZones(scene, teams, view)
  world.zones.agora.camera = camera
  const fx = new FX(scene, teams)

  const profAgents = professors.map(
    (p, i) => new Agent(p, { kind: 'prof', body: p.coat, accent: p.scarf, hair: p.hair, hairStyle: p.hairStyle, height: p.height }, i),
  )
  const studentAgents = students.map((s, i) => {
    const team = teams.find((t) => t.id === s.team)
    return new Agent(
      s,
      {
        kind: 'student',
        body: TRACK_COLORS[s.track],
        hair: HAIR[(i * 3) % HAIR.length],
        hairStyle: s.hairStyle,
        height: 0.94 + ((i * 7) % 10) / 100,
        team: team.color,
      },
      i,
    )
  })
  const visitorAgents = visitors.map(
    (v, i) =>
      new Agent(
        v,
        {
          kind: 'visitor',
          body: v.mentor ? '#F7F5FC' : '#938BA5',
          hair: '#3A2D4F',
          hairStyle: ['short', 'bob', 'long', 'bun', 'curly'][i % 5],
          height: 0.93 + (i % 4) * 0.035,
        },
        i,
      ),
  )
  const agents = [...profAgents, ...studentAgents, ...visitorAgents]
  for (const a of agents) scene.add(a.root)

  /* ── 상태 ── */
  const state = {
    started: false,
    playing: false,
    speed: SPEEDS.includes(Number(params.get('speed'))) ? Number(params.get('speed')) : 1,
    auto: params.get('auto') !== '0',
    names: params.get('names') === '1',
    bloom: params.get('bloom') !== '0',
    selected: null,
  }

  const rig = new CameraRig(camera, controls)
  const auto = { timer: 0, phase: null }

  const hud = createHud(document.getElementById('hud'), {
    teams,
    handlers: {
      onStart: start,
      onPlay: () => setPlaying(!state.playing),
      onRestart: () => {
        director.restart()
        hud.toast('처음부터', `${director.semester.semester}학기 1주차`)
        if (!state.playing) setPlaying(true)
      },
      onSpeed: (s) => {
        state.speed = s
        hud.setSpeed(s)
      },
      onAuto: () => setAuto(!state.auto),
      onNames: () => setNames(!state.names),
      onBloom: () => {
        state.bloom = !state.bloom
        hud.setBloom(state.bloom)
      },
      onZone: (z) => {
        setAuto(false)
        unfollow()
        rig.preset(z)
      },
      onSeek: (w) => {
        director.seek(w)
        if (!state.started) start()
      },
      onTeam: (k) => {
        const g = director.groups.find((x) => x.team === k)
        const members = director.teamAgents[k]
        const center = g ? g.center : members[0].position
        setAuto(false)
        unfollow()
        rig.closeUp(center.clone(), 3.0)
      },
      onFollow: () => {
        if (!state.selected) return
        if (rig.follow === state.selected) unfollow()
        else {
          setAuto(false)
          rig.setFollow(state.selected)
          hud.setFollowing(true)
        }
      },
      onRotate: (dir) => rig.rotate(dir),
      onCloseInspector: deselect,
      onLogClick: (entry) => entry.agent && select(entry.agent, true),
    },
  })

  const director = new Director({
    teams,
    profs: profAgents,
    students: studentAgents,
    visitors: visitorAgents,
    world,
    fx,
    events: {
      log: (e) => hud.addLog(e),
      toast: (t, s) => !state.warming && hud.toast(t, s),
      phase: (ph) => {
        if (state.started && !state.warming) hud.toast(`${Math.floor(director.week) + 1}주차 · ${ph.title}`, ph.subtitle)
        auto.phase = ph
        if (state.auto && state.started) {
          rig.preset(ph.camera, 2.4)
          auto.timer = 8
        }
      },
      semester: (info) => !state.warming && hud.toast(`${info.semester}학기 완료`, `아이디어 별 ${info.stars}개 · 다음 학기가 시작됩니다`),
    },
  })

  hud.setSpeed(state.speed)
  hud.setAuto(state.auto)
  hud.setNames(state.names)
  hud.setBloom(state.bloom)
  hud.setPlaying(false)
  document.body.classList.toggle('show-names', state.names)

  function setPlaying(p) {
    state.playing = p
    hud.setPlaying(p)
  }
  function setAuto(v) {
    state.auto = v
    hud.setAuto(v)
    if (v) {
      unfollow()
      if (auto.phase) rig.preset(auto.phase.camera, 2)
      auto.timer = 8
    }
  }
  function setNames(v) {
    state.names = v
    hud.setNames(v)
    document.body.classList.toggle('show-names', v)
  }
  function unfollow() {
    rig.setFollow(null)
    hud.setFollowing(false)
  }
  function select(agent, focus = false) {
    if (state.selected) state.selected.setSelected(false)
    state.selected = agent
    agent.setSelected(true)
    hud.inspectAgent(agent, agent.teamIndex != null ? teams[agent.teamIndex] : null)
    if (rig.follow && rig.follow !== agent) unfollow()
    if (focus) {
      setAuto(false)
      rig.closeUp(agent.position.clone(), 3.4)
    }
  }
  function deselect() {
    if (state.selected) state.selected.setSelected(false)
    state.selected = null
    unfollow()
    hud.closeInspector()
  }

  function start() {
    if (state.started) return
    state.started = true
    // 소개 화면 뒤에서 천천히 돌던 디오라마를 가장 가까운 등각 방향에 맞춘다
    const q = Math.PI / 2
    rig.azTarget = ISO.baseAzimuth + Math.round((rig.azimuth - ISO.baseAzimuth) / q) * q
    setPlaying(params.get('paused') !== '1')
    const ph = director.phase ?? PHASES[0]
    auto.phase = ph
    const cam = params.get('cam')
    if (cam && CAMERA_PRESETS[cam]) {
      setAuto(false)
      rig.preset(cam, 0.01)
    } else rig.preset(ph.camera === 'agora' ? 'overview' : ph.camera, 3)
    auto.timer = 5
    if (!state.warming) announce()
  }
  function announce() {
    const ph = director.phase ?? PHASES[0]
    hud.toast(`${director.semester.semester}학기 · ${Math.floor(director.week) + 1}주차`, ph.title)
  }

  /* ── 선택(레이캐스트) ── */
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const posterHits = world.zones.gallery.pickables
  let downAt = null
  let hovered = null
  const setPointer = (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = -(e.clientY / innerHeight) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  }
  const visibleHits = () => agents.filter((a) => a.root.visible).map((a) => a.hit)
  renderer.domElement.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]))
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return
    setPointer(e)
    const hit = raycaster.intersectObjects([...visibleHits(), ...posterHits], false)[0]
    if (!hit) return deselect()
    const a = hit.object.userData.agent
    if (a) return select(a)
    const pick = hit.object.userData.pick
    if (pick?.type === 'poster') {
      const img = world.zones.gallery.posters.find((p) => p.ex === pick.exhibition)?.img
      const src = img?.material.map?.image
      const url = src instanceof HTMLCanvasElement ? src.toDataURL() : pick.exhibition.poster
      if (state.selected) state.selected.setSelected(false)
      state.selected = null
      unfollow()
      hud.inspectPoster(pick.exhibition, url)
    }
  })
  let hoverTick = 0
  renderer.domElement.addEventListener('pointermove', (e) => {
    const now = performance.now()
    if (now - hoverTick < 60) return
    hoverTick = now
    setPointer(e)
    const hit = raycaster.intersectObjects([...visibleHits(), ...posterHits], false)[0]
    const a = hit?.object.userData.agent ?? null
    if (a !== hovered) {
      hovered?.el.classList.remove('hover')
      a?.el.classList.add('hover')
      hovered = a
    }
    renderer.domElement.style.cursor = hit ? 'pointer' : ''
  })
  controls.addEventListener('start', () => {
    rig.cancel()
    if (state.auto && state.started) setAuto(false)
  })

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return
    if (e.code === 'Space' && state.started) {
      e.preventDefault()
      setPlaying(!state.playing)
    } else if (e.code === 'KeyQ') rig.rotate(-1)
    else if (e.code === 'KeyE') rig.rotate(1)
  })
  window.addEventListener('resize', () => {
    fitFrustum()
    renderer.setSize(innerWidth, innerHeight)
    labelRenderer.setSize(innerWidth, innerHeight)
    composer.setSize(innerWidth, innerHeight)
    bloom.setSize(innerWidth, innerHeight)
  })

  /* ── 자동 연출: 단계 장면 ↔ 지금 대화가 오가는 팀 클로즈업 ── */
  let closeUpNext = true
  function updateAutoCam(dt) {
    if (!state.auto || !state.started || !state.playing || rig.follow) return
    auto.timer -= dt
    if (auto.timer > 0) return
    auto.timer = 7 + Math.random() * 3
    if (closeUpNext) {
      const live = director.groups.filter((g) => g.active)
      const rich = live.filter((g) => g.profs.length || g.guests.length || g.id === 'all')
      const g = (rich.length ? rich : live)[Math.floor(Math.random() * (rich.length ? rich.length : live.length))]
      if (g) {
        const focus = g.id === 'all' ? g.active.speaker.position.clone() : g.center.clone()
        rig.closeUp(focus, g.id === 'all' ? 3.4 : 3.0)
      } else auto.timer = 1
    } else if (auto.phase) rig.preset(auto.phase.camera, 2.4)
    closeUpNext = !closeUpNext
  }

  /* ── 시작 파라미터(공유 링크용): ?week=9&autostart=1&cam=A&speed=2 ── */
  if (params.has('week')) director.seek(Math.max(0, Number(params.get('week')) - 1))

  const timer = new THREE.Timer()
  timer.connect(document)
  let hudTick = 0
  let elapsed = 0
  const drawSize = new THREE.Vector2()
  const labelsEl = document.getElementById('labels')

  function frame(ts) {
    timer.update(ts)
    const dt = Math.min(timer.getDelta(), 0.05)
    elapsed += dt
    director.update(dt, state.speed, state.playing && state.started)
    world.update(dt, elapsed, director.simState)
    fx.update(dt, elapsed)
    if (!state.started) rig.azTarget += dt * 0.12
    rig.update(dt)
    view.az = rig.azimuth
    env.setAzimuth(rig.azimuth)
    renderer.getDrawingBufferSize(drawSize)
    fx.setScale((drawSize.y * camera.zoom) / (camera.top - camera.bottom))
    updateAutoCam(dt)
    controls.update()

    hudTick -= dt
    if (hudTick <= 0) {
      hudTick = 0.15
      hud.update({
        semester: director.semester.semester,
        ordinal: director.semester.ordinal,
        title: director.semester.title,
        week: director.week,
        phase: director.phase,
        teams: teams.map((_, k) => director.teamSummary(k)),
      })
      // 멀리서 볼 때는 이름표를 숨기고 말풍선을 작게
      const far = camera.zoom < 1.15
      for (const a of agents) a.el.classList.toggle('far', far)
      labelsEl.style.setProperty('--label-scale', THREE.MathUtils.clamp(0.55 + camera.zoom * 0.2, 0.7, 1.05).toFixed(2))
    }

    if (state.bloom) composer.render()
    else renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
    requestAnimationFrame(frame)
  }

  // 첫 프레임에서 단계 배치가 잡히도록 한 번 돌리고 시작
  director.update(0, state.speed, false)
  requestAnimationFrame(frame)
  document.getElementById('loading').classList.add('hide')

  // ?warm=초 — 시작 직후 그만큼 시뮬레이션을 미리 돌린다(시연 링크 · 스크린샷용)
  const warm = Math.min(120, Number(params.get('warm')) || 0)
  if (params.get('autostart') === '1') {
    state.warming = warm > 0 // 시작 안내는 미리 돌린 뒤의 주차로 띄운다
    start()
  } else hud.openIntro(true)

  if (warm && state.started) {
    state.warming = true
    for (let t = 0; t < warm; t += 0.05) {
      director.update(0.05, state.speed, true)
      world.update(0.05, t, director.simState)
      fx.update(0.05, t)
    }
    state.warming = false
    announce()
  }

  // 디버그 · 스크린샷 자동화용
  window.__dah = { director, rig, state, hud, world, fx, camera, controls, select, setPlaying, LINES }
}

boot().catch((err) => {
  console.error(err)
  const el = document.getElementById('loading')
  el.textContent = `시뮬레이션을 시작하지 못했습니다: ${err.message}`
})
