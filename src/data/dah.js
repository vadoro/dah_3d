// dah.js — 전공 정보 (출처: 디지털인문예술전공 웹사이트 https://dah-hallym.vercel.app 의 원문 데이터)
// 비전·미션·트랙·5역량·전시회 아카이브는 사이트 문구를 그대로 옮겼다.
// 시뮬레이션에서 바꾸고 싶은 값(현재 학기, 전시명 등)은 이 파일에서 고친다.

export const DAH = {
  nameKr: '디지털인문예술전공',
  nameEn: 'Digital Arts & Humanities',
  university: '한림대학교',
  school: '미래융합스쿨',
  since: 2017,
  site: 'https://dah-hallym.vercel.app',
  exhibitionSite: 'https://26-1-dah-exhibition.vercel.app',

  // CI 슬로건과 대표 문장
  slogan: { kr: '읽고, 다정하게 답하다', en: 'Read. Respond with Care.' },
  ciConcept: {
    title: '사람을 향해 연결되는 지성',
    en: 'Connected Intelligence for Human Futures',
    body: 'AI와 디지털 기술을 이해하고, 디자인으로 경험을 만들며, 인문학으로 사람과 사회를 읽는다. 기술·디자인·인문학의 서로 다른 지성이 연결되어, 인간의 미래에 다정하게 응답하는 전공이다.',
  },
  mission: {
    kr: '인간에 대한 깊은 이해와 창의적인 디지털 역량을 결합하여, 세상에 없던 새로운 가치를 창조한다.',
    en: 'We combine human insight and digital creativity to build a better future.',
  },
  what: '글로벌 혁신을 주도하는 디지털·정보통신기술, 인간을 위한 가치를 구현하는 디자인, 그리고 사람과 사회를 이해하는 인문사회학적 소양을 융합하여 미래의 주역이 될 인재를 양성하는 새로운 융합 프로그램입니다.',
  vision: [
    {
      title: '미래를 디자인하는 창의적 리더 양성',
      body: '인문학적 통찰력과 예술적 상상력을 바탕으로 디지털 시대의 새로운 미래를 이끌어갈 인재를 키웁니다.',
    },
    {
      title: '가치 기반의 융합 지식 창출',
      body: '기술과 인문학, 예술이 만나는 접점에서 사회적 가치를 창출하는 혁신적인 지식과 프로젝트를 만들어갑니다.',
    },
    {
      title: '지속가능한 디지털 생태계 구축',
      body: '사람과 기술이 조화롭게 공존하는 지속가능한 디지털 환경을 조성하고, 모두에게 이로운 기술의 확산을 주도합니다.',
    },
  ],

  // 로고 D·A·H 세 조각의 의미 (CI)
  letters: {
    D: { title: 'D — 열린 곡선', body: '디지털·디자인. 먼저 듣고 열어 두고 안으로 초대하는 구조.' },
    A: { title: 'A — 상승하는 삼각', body: '예술·AI. 흩어진 데이터와 생각을 새로운 가능성으로 전환하는 방향과 초점.' },
    H: { title: 'H — 연결하는 기둥과 가로선', body: '인문·인간. 서로 다른 세계 사이에 다리를 놓는 관계와 대화.' },
  },

  // 3트랙 — 공간의 세 스튜디오가 된다
  tracks: {
    design: {
      id: 'design',
      letter: 'D',
      name: '디자인 트랙',
      short: '디자인',
      zone: 'D',
      keywords: ['경험 디자인', '사회혁신디자인', 'AI디자인'],
      summary: '인문사회학의 토대 위에 디지털 기술과 디자인을 결합하여 미래의 경험을 창안하는 미래 디자인을 추구합니다.',
      courses: ['UX디자인', '서비스 디자인', '사회혁신디자인', 'AI디자인', 'UI 디자인'],
      clubs: ['더 인스튜디오 · UX·UI', 'I-SO · 시각디자인'],
    },
    ai: {
      id: 'ai',
      letter: 'A',
      name: 'AI 트랙',
      short: 'AI',
      zone: 'A',
      keywords: ['AI', '디지털 도구', '인문학 연구 방법론'],
      summary: '디지털 및 인공지능 기술에 기반하여 인문학 연구에 새로운 관점과 통찰을 발굴하는 것을 추구합니다.',
      courses: ['빅데이터인문학', '인문데이터마이닝', 'AI 서비스와 DB', 'AI 서비스 기획과 프로토타이핑'],
      clubs: ['DS4H · 데이터'],
    },
    culture: {
      id: 'culture',
      letter: 'H',
      name: '엔터컬쳐 트랙',
      short: '엔터컬쳐',
      zone: 'H',
      keywords: ['콘텐츠 기획', '문화예술', '디지털 기술'],
      summary: '디지털 기술과 문화예술의 융합을 기반으로 한 창의적인 콘텐츠의 기획과 개발을 추구합니다.',
      courses: ['스토리텔링 창작실습', '엔터컬처와 K-콘텐츠', 'AI 크리에이터 스튜디오 2', '문화원형과 고전콘텐츠'],
      clubs: ['CON:NECT · 콘텐츠'],
    },
  },

  // 프로젝트의 기반 다섯 가지 역량 (전공 10년 발표 자료)
  flow: ['문제 발굴', '문제 정의', '해결안 설계', '프로토타입 구현', '공개 · 검증'],
  competencies: [
    { id: 'issue', name: '지역과 글로벌 이슈 탐색', short: '이슈 탐색', detail: '문제를 사람의 경험으로 다시 살펴보기' },
    { id: 'thinking', name: '디자인 씽킹', short: '디자인 씽킹', detail: '무엇을 개선하고 해결하고 목표로 하고 있는가' },
    { id: 'data', name: '데이터 분석', short: '데이터 분석', detail: '데이터 기반 근거로 문제를 분석하고 해결방안 도출' },
    { id: 'story', name: '스토리텔링', short: '스토리텔링', detail: '만든 것을 이해가능하게 전달' },
    { id: 'service', name: 'AI 서비스 개발', short: 'AI 서비스', detail: '노코드와 바이브 코딩' },
  ],

  // 교육 설계 원리 — 동기 → 효능감 → 진로
  pedagogy: [
    { title: '동기', detail: '좋아하는 것을 수업에서 다룹니다' },
    { title: '효능감', detail: '만든 것을 남들이 봅니다' },
    { title: '진로', detail: '만든 것이 모여 직무가 됩니다' },
  ],
  principles: [
    { title: '빨리 만들고 빨리 고친다', detail: '정답이 없으니 일단 해보고 안 되면 바꿨습니다' },
    { title: '학생 한 명 기준으로', detail: '몇 명이 듣느냐보다 그 학생에게 도움이 되는지를 보았습니다' },
    { title: '노력이 남게', detail: '들인 시간이 결과물로 남는 구조를 만들었습니다' },
  ],
  jobMap: [
    { title: 'UX/UI 디자인 기획 · 제작', detail: 'UX 디자이너, 시각 디자이너, 사회혁신디자인, 크리에이터 · 디지털 마케터' },
    { title: '데이터 분석 · 활용', detail: '데이터 사이언티스트 · AI 연구원, 비즈니스 애널리스트' },
    { title: 'AI 서비스 기획 · 개발', detail: 'AI 서비스 기획자/디자이너/개발자, 프로덕트 매니저' },
    { title: '엔터테인먼트산업', detail: '디지털 아트 디렉터, 문화콘텐츠 기획자, 전시 기획자, K-Culture 기획자/제작자' },
  ],
  next: {
    title: '2027년, 디인예 새로운 도약',
    lead: 'Design, AI & EnterCulture (DAE)',
    items: [
      { title: 'Career Ready', detail: '모든 교과목이 직군과 직접 연결되도록 재편' },
      { title: 'AI Ready', detail: '전 과목 AI 활용을 역량 기준으로 명문화' },
      { title: 'Change Ready', detail: '중재형(mediator) 융합인재 양성 = AI솔로프리너' },
    ],
  },

  // 역대 프로젝트 전시회 (2017-2 제1회 → 2026-1 제18회). 포스터: public/posters/{semester}.webp
  exhibitions: [
    { semester: '2017-2', title: 'DAH EXHIBITION' },
    { semester: '2018-1', title: 'DAH EXHIBITION' },
    { semester: '2018-2', title: 'DAH EXHIBITION' },
    { semester: '2019-1', title: 'DAH:다' },
    { semester: '2019-2', title: '그래서 우리는 DAH다' },
    { semester: '2020-1', title: '내 손 안의 작은 전시회' },
    { semester: '2020-2', title: '전시회, 우리들의 축제' },
    { semester: '2021-1', title: '모두 DAH 함께' },
    { semester: '2021-2', title: '샛별' },
    { semester: '2022-1', title: '팔레트' },
    { semester: '2022-2', title: 'Display 공존' },
    { semester: '2023-1', title: '흐름' },
    { semester: '2023-2', title: '무한' },
    { semester: '2024-1', title: 'Free-child' },
    { semester: '2024-2', title: 'NEXUS: 연결의 시작' },
    { semester: '2025-1', title: 'Pulse' },
    { semester: '2025-2', title: '흐르는 경계: DAH' },
    {
      semester: '2026-1',
      title: 'Against the Flow',
      intro:
        '디지털 시대의 도시에서 모두는 어떤 디바이스를 통해 세상과 연결되어 있다. 그러나 단 두 사람 "부모와 아이" 만은 어떤 디지털 매개도 거치지 않고, 군중과 반대 방향으로 서로의 손을 잡고 함께 걷는다.',
    },
  ].map((e, i) => ({ ...e, ordinal: i + 1, poster: `posters/${e.semester}.webp` })),

  // 시뮬레이션이 진행하는 학기. 전시명이 정해지면 title에 넣는다(비우면 "전시명 미정").
  current: { semester: '2026-2', ordinal: 19, title: '' },
}

export const exhibitionName = (ordinal) => `제${ordinal}회 디지털인문예술전공 프로젝트 전시회`

// '2026-2' → '2027-1'
export function nextSemester(label) {
  const [y, s] = label.split('-').map(Number)
  return s === 1 ? `${y}-2` : `${y + 1}-1`
}
