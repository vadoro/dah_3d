import * as THREE from 'three'

// CI 컬러 시스템 — 딥 퍼플 블랙(우주) + 보라(지성). 보라 단일 계열만 쓴다.
export const C = {
  bg: '#100D18',
  bg2: '#171321',
  glass: '#211A31',
  primary: '#815FD7',
  light: '#C8B9F2',
  mid: '#A286E9',
  deep: '#6844C4',
  deepDark: '#4B2D99',
  text: '#F7F5FC',
  textSec: '#C9C3D5',
  textMeta: '#938BA5',
}

export const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

// 시간: 1배속에서 한 주 = WEEK_SECONDS초, 한 학기 = 16주
export const WEEK_SECONDS = 12
export const WEEKS = 16
export const SPEEDS = [0.5, 1, 2, 4]

// 공간 배치 (단위 m, 바닥 타일 한 칸 = 2m). 등각(isometric) 디오라마로 짓는다.
// 정사각형 메인 섬 중앙이 아고라(원탁), 사방에 D·A·H 스튜디오와 이슈 맵,
// H 게이트 뒤 다리를 건너면 정사각형 전시 섬이 있다.
export const LAYOUT = {
  tile: 2,
  platformHalf: 24,
  agoraRadius: 2.4,
  zones: {
    agora: { center: new THREE.Vector3(0, 0, 0) },
    D: { center: new THREE.Vector3(-14, 0, 0) },
    A: { center: new THREE.Vector3(14, 0, 0) },
    H: { center: new THREE.Vector3(0, 0, -13) },
    field: { center: new THREE.Vector3(0, 0, 14) },
    gallery: { center: new THREE.Vector3(0, 0, -50) },
  },
  galleryHalf: 13,
  bridge: { from: new THREE.Vector3(0, 0, -22), to: new THREE.Vector3(0, 0, -37.5) },
}

// 등각 카메라: 수평에서 35.264°(arctan 1/√2) 내려다보고, 90°씩 돌려 네 방향에서 본다.
export const ISO = {
  elevation: Math.atan(1 / Math.SQRT2),
  baseAzimuth: Math.PI / 4,
  distance: 160,
  viewHeight: 40, // zoom 1에서 화면 세로에 들어오는 월드 높이(m)
  minZoom: 0.4,
  maxZoom: 6,
}

// 카메라 프리셋: 바라보는 점 + 확대 배율
const P = (x, y, z, zoom) => ({ target: new THREE.Vector3(x, y, z), zoom })
export const CAMERA_PRESETS = {
  overview: P(3, 0, -17, 0.6),
  agora: P(0, 1, 0, 2.5),
  D: P(-15, 1.6, -0.6, 1.95),
  A: P(14, 1, 0, 2.1),
  H: P(0, 2, -14, 1.9),
  field: P(0, 0.5, 14, 2.2),
  gallery: P(0, 1.5, -50, 1.45),
  sky: P(0, 12, -2, 1.25),
}

export const ZONE_LABELS = {
  overview: '전체',
  agora: '아고라',
  D: 'D 스튜디오',
  A: 'A 랩',
  H: 'H 스테이지',
  field: '이슈 맵',
  gallery: '전시 섬',
  sky: '별자리',
}
