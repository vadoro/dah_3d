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

// 공간 배치 (단위 m). 메인 플랫폼 중앙이 아고라(원탁), 사방에 D·A·H 스튜디오와 이슈 맵,
// H 게이트 뒤 다리를 건너면 전시 섬이 있다.
export const LAYOUT = {
  platformRadius: 24,
  agoraRadius: 2.4,
  zones: {
    agora: { center: new THREE.Vector3(0, 0, 0) },
    D: { center: new THREE.Vector3(-14, 0, 0) },
    A: { center: new THREE.Vector3(14, 0, 0) },
    H: { center: new THREE.Vector3(0, 0, -13) },
    field: { center: new THREE.Vector3(0, 0, 14) },
    gallery: { center: new THREE.Vector3(0, 0, -50) },
  },
  galleryRadius: 13,
  bridge: { from: new THREE.Vector3(0, 0, -22), to: new THREE.Vector3(0, 0, -37.5) },
}

// 카메라 프리셋: [위치, 바라보는 점]
export const CAMERA_PRESETS = {
  overview: [new THREE.Vector3(0, 34, 44), new THREE.Vector3(0, 0, -8)],
  agora: [new THREE.Vector3(0, 10.5, 14), new THREE.Vector3(0, 1.2, 0)],
  D: [new THREE.Vector3(-3, 9, 9), new THREE.Vector3(-14, 1, 0)],
  A: [new THREE.Vector3(3, 9, 9), new THREE.Vector3(14, 1, 0)],
  H: [new THREE.Vector3(0, 8.5, -1), new THREE.Vector3(0, 1.6, -14)],
  field: [new THREE.Vector3(0, 11, 27), new THREE.Vector3(0, 0.6, 13)],
  gallery: [new THREE.Vector3(0, 15, -28), new THREE.Vector3(0, 1.5, -50)],
  sky: [new THREE.Vector3(0, 4.5, 17), new THREE.Vector3(0, 13.5, -2)],
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
