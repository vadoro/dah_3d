import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'

// DAH 로고의 세 조각(D · A · H) 원본 패스 — public/ci/motif.svg와 같은 데이터.
// 공간의 건축물(열린 곡선 벽, 상승하는 삼각 게이트, 연결하는 H 게이트)과 원탁 위 홀로그램이 모두 이 도형에서 나온다.
const PATHS = {
  D: 'M5.57 165.84C4.79 165.84 4.26 165.84 3.97 165.84L0 165.8L1.57 0L5.65 0.15C13.05 0.42 187.02 7.59 186.27 87.07C185.54 163.55 24.69 165.84 5.57 165.84ZM9.44 8.3L8.01 157.86C33.95 157.5 177.69 152.54 178.32 86.99C178.95 21.43 35.65 9.86 9.44 8.3Z',
  A: 'M277.01 169.67L91.02 167.9L156.72 3.12L218.64 3.71L277.01 169.67ZM102.7 160.06L265.75 161.61L212.99 11.61L162.09 11.12L102.7 160.06Z',
  H: 'M393.96 165.68L386.01 165.6L386.81 81.55H241.35V164.07L233.4 164.18L229 6.44L236.95 6.21L238.82 73.6H383.36L387.53 7.54L395.46 7.83L393.96 165.68Z',
}

export const MOTIF = { D: '#C8B9F2', A: '#A286E9', H: '#815FD7' }

const shapeCache = {}
function shapesFor(letter) {
  if (!shapeCache[letter]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${PATHS[letter]}"/></svg>`
    const data = new SVGLoader().parse(svg)
    shapeCache[letter] = data.paths.flatMap((p) => p.toShapes(true))
  }
  return shapeCache[letter]
}

// 바닥 중앙에 서 있는 글자 지오메트리. height: 글자 높이(m), depth: 두께(m)
export function letterGeometry(letter, height, depth = 0.25) {
  const shapes = shapesFor(letter)
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 24 })
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const s = height / (bb.max.y - bb.min.y)
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -0.5)
  geo.scale(s, s, depth)
  // SVG는 y축이 아래로 향한다. X축 180° 회전(적정 회전이라 면 방향 유지)으로 세운다.
  geo.rotateX(Math.PI)
  geo.computeBoundingBox()
  geo.translate(0, -geo.boundingBox.min.y, 0)
  geo.computeVertexNormals()
  return geo
}

export function letterMesh(letter, height, { depth = 0.25, color = MOTIF[letter], emissive = 0.55, opacity = 1 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissive,
    roughness: 0.35,
    metalness: 0.1,
    transparent: opacity < 1,
    opacity,
  })
  const mesh = new THREE.Mesh(letterGeometry(letter, height, depth), mat)
  mesh.userData.letter = letter
  return mesh
}
