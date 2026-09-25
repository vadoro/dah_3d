import { DAH } from '../data/dah.js'
import { PHASES } from '../data/script.js'
import { ZONE_LABELS, SPEEDS } from '../config.js'

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
  restart:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 1.5v7l-4.2-3.5z" fill="currentColor"/></svg>',
  film: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5v2.2l4.5-3v10.6l-4.5-3v2.2A1.5 1.5 0 0 1 14 18H5a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor"/></svg>',
  spark:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2 6.6 6.5 2.4-6.5 2.4-2 6.6-2-6.6-6.5-2.4 6.5-2.4z" fill="currentColor"/></svg>',
  tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2V4a1 1 0 0 1 1-1h7.2L21 12.8 12.8 21zM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="currentColor" fill-rule="evenodd"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 10.5h2V17h-2zM11 7h2v2h-2z" fill="currentColor"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  target:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 1.5V5M12 19v3.5M1.5 12H5M19 12h3.5" stroke="currentColor" stroke-width="2"/></svg>',
  users:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="currentColor"/><path d="M2.5 19c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5z" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".7"/><path d="M16 13.6c2.9 0 4.9 1.6 5.5 4.4H17" fill="currentColor" opacity=".7"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// 목적격 조사: 마지막 글자에 받침이 있으면 '을', 없으면(또는 한글이 아니면) '를'
function eulReul(word) {
  const code = String(word).trim().slice(-1).charCodeAt(0) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를'
}

const TRACK_NAME = { design: '디자인 트랙', ai: 'AI 트랙', culture: '엔터컬쳐 트랙', lead: '전공 전체' }
const COMP_SHORT = ['이슈', '씽킹', '데이터', '스토리', 'AI서비스']

export function createHud(root, { teams, handlers }) {
  root.innerHTML = `
    <div class="brand panel">
      <img src="ci/logo-light.svg" alt="DAH 로고" />
      <div>
        <div class="t1">DAH STUDIO 3D</div>
        <div class="t2">${esc(DAH.university)} ${esc(DAH.nameKr)} · 협업 시뮬레이션</div>
      </div>
    </div>

    <div class="timeline panel" aria-live="polite">
      <div class="tl-head">
        <span class="tl-sem"></span>
        <span class="tl-week"></span>
        <span class="tl-phase"></span>
      </div>
      <div class="tl-sub"></div>
      <div class="flow">
        <span class="chip bookend" data-flow="-1">동기</span>
        ${DAH.flow.map((f, i) => `<span class="arrow">›</span><span class="chip" data-flow="${i}">${esc(f)}</span>`).join('')}
        <span class="arrow">›</span><span class="chip bookend" data-flow="5">축적</span>
      </div>
      <div class="weeks" title="클릭해서 원하는 주차로 이동">
        ${Array.from({ length: 16 }, (_, i) => `<div class="wk${i >= 13 && i < 15 ? ' exhibit' : ''}"><i></i></div>`).join('')}
      </div>
      <div class="weeks-legend"><span>1주 오리엔테이션</span><span>8주 중간 발표</span><span>14–15주 전시회</span><span>16주 종강</span></div>
    </div>

    <div class="top-actions">
      <button class="btn" data-act="about">${ICON.info}<span class="label">전공 소개</span></button>
      <button class="btn" data-act="names" title="이름표 보기">${ICON.tag}<span class="label">이름표</span></button>
      <button class="btn on" data-act="bloom" title="빛 효과(블룸)">${ICON.spark}<span class="label">빛 효과</span></button>
      <button class="btn icon" data-act="help" title="도움말">${ICON.help}</button>
    </div>

    <section class="teams panel" aria-label="팀 프로젝트 진행">
      <h3>이번 학기 팀 프로젝트</h3>
      ${teams
        .map(
          (t, k) => `
        <div class="team" data-team="${k}" style="--c:${t.color}">
          <div class="row1"><span class="sym" style="color:${t.color}">${t.symbol}</span><span class="name">${esc(t.name)}</span><span class="proj">「${esc(t.project)}」</span></div>
          <div class="sum">${esc(t.summary)}</div>
          <div class="bars">
            ${COMP_SHORT.map((c, i) => `<div class="cell"><span class="lbl">${c}</span><span class="bar" data-c="${i}"><i style="background:${t.color}"></i></span><span class="pct" data-p="${i}">0</span></div>`).join('')}
          </div>
          <div class="foot"><span>아이디어 별 <b data-f="stars">0</b></span><span>교수 멘토링 <b data-f="visits">0</b>회</span><span>종합 <b data-f="overall">0%</b></span></div>
        </div>`,
        )
        .join('')}
    </section>

    <aside class="side">
      <section class="inspector panel" aria-live="polite"></section>
      <section class="log panel" aria-label="활동 기록">
        <h3>활동 기록</h3>
        <ul></ul>
      </section>
    </aside>

    <div class="toast panel"><div class="t"></div><div class="s"></div></div>

    <nav class="dock panel" aria-label="재생과 카메라">
      <button class="btn icon" data-act="restart" title="이번 학기 처음부터">${ICON.restart}</button>
      <button class="btn play" data-act="play" title="재생 / 일시정지 (Space)">${ICON.pause}</button>
      <div class="seg" role="group" aria-label="배속">
        ${SPEEDS.map((s) => `<button class="btn" data-speed="${s}">${s}×</button>`).join('')}
      </div>
      <span class="sep"></span>
      <button class="btn on" data-act="auto" title="단계마다 카메라가 장면을 따라갑니다">${ICON.film}<span class="label">자동 연출</span></button>
      <button class="btn mobile-only" data-act="m-teams" aria-label="팀 패널">${ICON.users}</button>
      <button class="btn mobile-only" data-act="m-log" aria-label="활동 기록">${ICON.list}</button>
      <span class="sep"></span>
      ${Object.entries(ZONE_LABELS)
        .map(([k, v]) => `<button class="btn" data-zone="${k}">${esc(v)}</button>`)
        .join('')}
    </nav>
  `

  const $ = (s) => root.querySelector(s)
  const $$ = (s) => [...root.querySelectorAll(s)]
  const el = {
    sem: $('.tl-sem'),
    week: $('.tl-week'),
    phase: $('.tl-phase'),
    sub: $('.tl-sub'),
    chips: $$('.flow .chip'),
    wks: $$('.weeks .wk i'),
    weeks: $('.weeks'),
    teamCards: $$('.team'),
    inspector: $('.inspector'),
    log: $('.log ul'),
    toast: $('.toast'),
    play: $('[data-act="play"]'),
    auto: $('[data-act="auto"]'),
    names: $('[data-act="names"]'),
    bloom: $('[data-act="bloom"]'),
    speeds: $$('[data-speed]'),
    teamsPanel: $('.teams'),
    side: $('.side'),
  }

  // 이벤트
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button, .team, .log li.clickable')
    if (!b) return
    if (b.dataset.speed) return handlers.onSpeed(Number(b.dataset.speed))
    if (b.dataset.zone) return handlers.onZone(b.dataset.zone)
    if (b.classList.contains('team')) return handlers.onTeam(Number(b.dataset.team))
    if (b.matches('.log li')) return handlers.onLogClick(b._entry)
    const act = b.dataset.act
    if (act === 'play') handlers.onPlay()
    else if (act === 'restart') handlers.onRestart()
    else if (act === 'auto') handlers.onAuto()
    else if (act === 'names') handlers.onNames()
    else if (act === 'bloom') handlers.onBloom()
    else if (act === 'about') openAbout()
    else if (act === 'help') openIntro(false)
    else if (act === 'follow') handlers.onFollow()
    else if (act === 'close-insp') handlers.onCloseInspector()
    else if (act === 'm-teams') {
      el.teamsPanel.classList.toggle('mobile-open')
      el.side.classList.remove('mobile-open')
    } else if (act === 'm-log') {
      el.side.classList.toggle('mobile-open')
      el.teamsPanel.classList.remove('mobile-open')
    }
  })
  el.weeks.addEventListener('click', (e) => {
    const r = el.weeks.getBoundingClientRect()
    handlers.onSeek(((e.clientX - r.left) / r.width) * 16)
  })

  /* ── 모달: 인트로 · 전공 소개 ── */
  const intro = document.createElement('div')
  intro.className = 'modal'
  intro.innerHTML = `
    <div class="sheet panel" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div class="eyebrow">${esc(DAH.university)} ${esc(DAH.nameKr)} · ${esc(DAH.nameEn)}</div>
      <h1 id="intro-title">${esc(DAH.ciConcept.title)}</h1>
      <p class="lead">교수와 학생이 원탁에서 만나 토론하고, D · A · H 세 스튜디오를 오가며 함께 프로젝트를 만들어 프로젝트 전시회에 이르는 <b>한 학기 16주</b>를 3D 공간에서 시뮬레이션합니다. 좋은 아이디어는 별이 되어 원탁 위 하늘에 팀별 별자리로 쌓입니다.</p>
      <h2>공간</h2>
      <div class="cols3">
        <div class="card"><div class="big" style="color:#C8B9F2">D</div><div class="ct">D 스튜디오 · 디자인</div><div class="cd">열린 곡선 벽에 포스트잇이 쌓이는 문제 정의의 공간. ${esc(DAH.letters.D.body)}</div></div>
        <div class="card"><div class="big" style="color:#A286E9">A</div><div class="ct">A 랩 · AI</div><div class="cd">상승하는 삼각 안에서 데이터가 연결되는 해결안 설계의 공간. ${esc(DAH.letters.A.body)}</div></div>
        <div class="card"><div class="big" style="color:#815FD7">H</div><div class="ct">H 스테이지 · 엔터컬쳐</div><div class="cd">H 게이트 윗칸은 스토리보드, 아랫칸은 전시 섬으로 건너가는 다리. ${esc(DAH.letters.H.body)}</div></div>
      </div>
      <h2>한 학기의 흐름</h2>
      <div class="steps">
        ${PHASES.map((p, i) => `${i ? '<span class="a">›</span>' : ''}<span class="s">${esc(p.title)}</span>`).join('')}
      </div>
      <h2>조작</h2>
      <p style="font-size:13px"><span class="kbd">드래그</span> 회전 · <span class="kbd">스크롤</span> 확대 · <span class="kbd">우클릭 드래그</span> 이동 · 인물이나 포스터를 <span class="kbd">클릭</span>하면 정보 · <span class="kbd">Space</span> 재생/일시정지 · 상단 주차 막대를 클릭하면 그 주로 이동</p>
      <div class="intro-actions">
        <button class="btn primary" data-close>${ICON.play}시뮬레이션 시작</button>
        <button class="btn" data-about>${ICON.info}전공 소개 보기</button>
      </div>
      <p class="fineprint">전공 정보 출처: <a href="${DAH.site}" target="_blank" rel="noopener">${DAH.site.replace('https://', '')}</a> · 등장인물과 팀 프로젝트는 전공의 교육 방식을 보여주기 위한 가상 설정입니다.</p>
    </div>`
  document.body.appendChild(intro)

  const about = document.createElement('div')
  about.className = 'modal'
  about.innerHTML = `
    <div class="sheet panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div>
          <div class="eyebrow">About · Since ${DAH.since}</div>
          <h1 id="about-title">${esc(DAH.nameKr)}</h1>
        </div>
        <button class="btn icon" data-close style="margin-left:auto" aria-label="닫기">${ICON.close}</button>
      </div>
      <p class="lead">${esc(DAH.nameKr)}은 ${esc(DAH.what)}</p>
      <h2>Mission</h2>
      <p>${esc(DAH.mission.kr)}<br /><span class="muted">${esc(DAH.mission.en)}</span></p>
      <h2>Vision</h2>
      <div class="cols3">${DAH.vision.map((v, i) => `<div class="card"><div class="eyebrow">0${i + 1}</div><div class="ct" style="margin-top:6px">${esc(v.title)}</div><div class="cd">${esc(v.body)}</div></div>`).join('')}</div>
      <h2>세 트랙</h2>
      <div class="cols3">${Object.values(DAH.tracks)
        .map(
          (t) =>
            `<div class="card"><div class="big" style="color:${{ D: '#C8B9F2', A: '#A286E9', H: '#815FD7' }[t.letter]}">${t.letter}</div><div class="ct">${esc(t.name)}</div><div class="cd">${esc(t.summary)}<br/><br/>${t.keywords.map(esc).join(' · ')}<br/>동아리: ${t.clubs.map(esc).join(', ')}</div></div>`,
        )
        .join('')}</div>
      <h2>프로젝트의 기반 다섯 가지 역량</h2>
      <div class="steps" style="margin-bottom:10px">${DAH.flow.map((f, i) => `${i ? '<span class="a">›</span>' : ''}<span class="s">${esc(f)}</span>`).join('')}</div>
      <div class="cols5">${DAH.competencies.map((c) => `<div class="card"><div class="ct">${esc(c.name)}</div><div class="cd">${esc(c.detail)}</div></div>`).join('')}</div>
      <h2>교육 설계: 동기 → 효능감 → 진로</h2>
      <div class="cols3">${DAH.pedagogy.map((p) => `<div class="card"><div class="ct">${esc(p.title)}</div><div class="cd">${esc(p.detail)}</div></div>`).join('')}</div>
      <h2>프로젝트 전시회</h2>
      <p>2017년 2학기 첫 전시회 이후 매 학기 열어 ${DAH.exhibitions.length}회를 이어 왔습니다. 가장 최근 전시는 ${DAH.exhibitions.at(-1).semester} 「${esc(DAH.exhibitions.at(-1).title)}」. 전시 섬의 나선형 포스터 벽에서 역대 전시를 모두 볼 수 있습니다.</p>
      <h2>${esc(DAH.next.title)}</h2>
      <p class="muted" style="margin-bottom:10px">${esc(DAH.next.lead)}</p>
      <div class="cols3">${DAH.next.items.map((p) => `<div class="card"><div class="ct">${esc(p.title)}</div><div class="cd">${esc(p.detail)}</div></div>`).join('')}</div>
      <p class="fineprint">슬로건 「${esc(DAH.slogan.kr)} · ${esc(DAH.slogan.en)}」 · 출처: <a href="${DAH.site}" target="_blank" rel="noopener">${DAH.site.replace('https://', '')}</a></p>
    </div>`
  document.body.appendChild(about)

  let introFirst = true
  function openIntro(first = true) {
    introFirst = first
    intro.classList.add('open')
    intro.querySelector('[data-close]').focus()
  }
  function openAbout() {
    about.classList.add('open')
    about.querySelector('[data-close]').focus()
  }
  function closeModals() {
    const wasIntro = intro.classList.contains('open')
    intro.classList.remove('open')
    about.classList.remove('open')
    if (wasIntro && introFirst) {
      introFirst = false
      handlers.onStart()
    }
  }
  intro.addEventListener('click', (e) => {
    if (e.target.closest('[data-about]')) {
      closeModals()
      openAbout()
    } else if (e.target.closest('[data-close]') || e.target === intro) closeModals()
  })
  about.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === about) about.classList.remove('open')
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (intro.classList.contains('open') || about.classList.contains('open')) closeModals()
      else handlers.onCloseInspector()
    }
  })

  /* ── 토스트 ── */
  const queue = []
  let toastBusy = false
  function toast(title, sub = '') {
    queue.push([title, sub])
    while (queue.length > 2) queue.shift()
    if (!toastBusy) nextToast()
  }
  function nextToast() {
    const item = queue.shift()
    if (!item) {
      toastBusy = false
      return
    }
    toastBusy = true
    el.toast.querySelector('.t').textContent = item[0]
    el.toast.querySelector('.s').textContent = item[1]
    el.toast.classList.add('show')
    setTimeout(
      () => {
        el.toast.classList.remove('show')
        setTimeout(nextToast, 450)
      },
      queue.length ? 1800 : 2800,
    )
  }

  /* ── 로그 ── */
  function addLog(entry) {
    const li = document.createElement('li')
    li.className = entry.kind + (entry.agent ? ' clickable' : '')
    li.innerHTML = `<span class="wk">${entry.week}주</span><span></span>`
    li.lastChild.textContent = entry.text
    li._entry = entry
    el.log.prepend(li)
    while (el.log.children.length > 60) el.log.lastChild.remove()
  }

  /* ── 인스펙터 ── */
  let inspected = null
  function inspectAgent(agent, team) {
    inspected = { type: 'agent', agent, team }
    renderInspector(true)
    el.inspector.classList.add('open')
    el.side.classList.add('mobile-open')
    el.teamsPanel.classList.remove('mobile-open')
  }
  function inspectPoster(ex, imgSrc) {
    inspected = { type: 'poster', ex }
    const isLatest = ex.semester === DAH.exhibitions.at(-1).semester
    el.inspector.innerHTML = `
      <div class="insp-head">
        <div>
          <div class="eyebrow">제${ex.ordinal}회 프로젝트 전시회 · ${esc(ex.semester)}</div>
          <div class="nm" style="margin-top:4px">「${esc(ex.title || '전시명 미정')}」</div>
        </div>
        <button class="btn icon insp-close" data-act="close-insp" aria-label="닫기">${ICON.close}</button>
      </div>
      ${imgSrc ? `<img class="poster-preview" src="${imgSrc}" alt="제${ex.ordinal}회 전시 포스터" />` : ''}
      ${ex.intro ? `<p class="muted" style="font-size:12px;margin:10px 0 0;line-height:1.65">${esc(ex.intro)}</p>` : ''}
      ${ex.current ? '<p class="muted" style="font-size:12px;margin:10px 0 0">이번 학기 시뮬레이션이 향하는 전시입니다. 15주차에 전시 섬에서 열립니다.</p>' : ''}
      ${isLatest ? `<div class="insp-actions"><a class="btn" href="${DAH.exhibitionSite}" target="_blank" rel="noopener">전시 사이트 열기</a></div>` : ''}`
    el.inspector.classList.add('open')
    el.side.classList.add('mobile-open')
  }
  function renderInspector(full = false) {
    if (!inspected || inspected.type !== 'agent') return
    const { agent, team } = inspected
    const d = agent.data
    const color = team?.color ?? (d.kind === 'prof' ? d.coat : '#938BA5')
    const role =
      d.kind === 'prof'
        ? d.role
        : d.kind === 'visitor'
          ? d.role
          : `${TRACK_NAME[d.track]} · ${d.year}학년${d.council ? ' · 운영위원회' : ''}`
    const rows = []
    if (d.kind === 'student') {
      rows.push(['주전공', d.major === DAH.nameKr ? `${d.major} (1전공)` : `${d.major} · 복수전공`])
      rows.push(['팀', `${team.symbol} ${team.name} 「${team.project}」`])
      if (d.club) rows.push(['동아리', d.club])
      rows.push(['좋아하는 것', d.likes])
    } else if (d.kind === 'prof') {
      rows.push(['역할', d.focus])
    }
    rows.push(['지금', `${agent.task || '—'} · ${agent.actionLabel}`])
    const quotes = agent.lines.map((l) => `<q>${esc(l)}</q>`).join('')
    const html = `
      <div class="insp-head">
        <div class="dot" style="background:${color}"></div>
        <div>
          <div class="nm">${esc(d.name)}</div>
          <div class="rl">${esc(role)}</div>
        </div>
        <button class="btn icon insp-close" data-act="close-insp" aria-label="닫기">${ICON.close}</button>
      </div>
      <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${quotes ? `<div class="eyebrow">최근 대화</div><div class="quotes">${quotes}</div>` : ''}
      <div class="insp-actions"><button class="btn${inspected.following ? ' on' : ''}" data-act="follow">${ICON.target}따라가기</button></div>`
    if (full || el.inspector._html !== html) {
      el.inspector.innerHTML = html
      el.inspector._html = html
    }
  }
  function closeInspector() {
    inspected = null
    el.inspector.classList.remove('open')
    el.inspector.innerHTML = ''
    el.inspector._html = ''
  }
  function setFollowing(v) {
    if (inspected) inspected.following = v
    renderInspector()
  }

  /* ── 매 틱 갱신 ── */
  function update(s) {
    const ph = s.phase
    const target = s.title ? `「${s.title}」` : '전시'
    el.sem.textContent = `${s.semester}학기 · 제${s.ordinal}회 ${target}${eulReul(s.title || '전시')} 향해`
    el.week.textContent = `${Math.min(16, Math.floor(s.week) + 1)}주차 / 16`
    if (ph && el.phase.textContent !== ph.title) {
      el.phase.textContent = ph.title
      el.sub.textContent = `${ph.subtitle} · ${ph.stage}`
    }
    el.chips.forEach((c) => {
      const f = Number(c.dataset.flow)
      const cur = ph?.flow ?? -1
      c.classList.toggle('on', f === cur)
      c.classList.toggle('done', f < cur)
    })
    el.wks.forEach((w, i) => (w.style.width = `${Math.max(0, Math.min(1, s.week - i)) * 100}%`))
    s.teams.forEach((t, k) => {
      const card = el.teamCards[k]
      t.progress.forEach((v, i) => {
        card.querySelector(`[data-c="${i}"] i`).style.width = `${v * 100}%`
        card.querySelector(`[data-c="${i}"]`).parentElement.classList.toggle('now', ph?.competency === i)
        card.querySelector(`[data-p="${i}"]`).textContent = Math.round(v * 100)
      })
      card.querySelector('[data-f="stars"]').textContent = t.stars
      card.querySelector('[data-f="visits"]').textContent = t.visits
      card.querySelector('[data-f="overall"]').textContent = `${Math.round(t.overall * 100)}%`
    })
    renderInspector()
  }

  return {
    update,
    addLog,
    toast,
    openIntro,
    openAbout,
    inspectAgent,
    inspectPoster,
    closeInspector,
    setFollowing,
    get inspected() {
      return inspected
    },
    setPlaying(p) {
      el.play.innerHTML = p ? ICON.pause : ICON.play
      el.play.setAttribute('aria-label', p ? '일시정지' : '재생')
    },
    setSpeed(x) {
      el.speeds.forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === x))
    },
    setAuto(v) {
      el.auto.classList.toggle('on', v)
    },
    setNames(v) {
      el.names.classList.toggle('on', v)
    },
    setBloom(v) {
      el.bloom.classList.toggle('on', v)
    },
  }
}
