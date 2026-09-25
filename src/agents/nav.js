import * as THREE from 'three'
import { LAYOUT } from '../config.js'

// 간단한 길찾기: 원탁 우회 + 전시 섬은 H 게이트 → 다리를 거쳐 간다.
const V = (x, z) => new THREE.Vector3(x, 0, z)
const G = LAYOUT.zones.gallery.center
const GATE = V(0, -19.8)
const BRIDGE_A = V(0, -24.5)
const BRIDGE_B = V(0, -37.2)
const HALL = V(0, -9)
const TABLE_CLEAR = 3.1

export function onGallery(p) {
  return Math.hypot(p.x - G.x, p.z - G.z) < LAYOUT.galleryRadius + 0.6
}

function closestOnSegment(a, b) {
  const ab = b.clone().sub(a)
  const len2 = ab.lengthSq() || 1
  const t = THREE.MathUtils.clamp(-a.dot(ab) / len2, 0, 1)
  return a.clone().addScaledVector(ab, t)
}

// a→b가 원탁을 가로지르면 원탁 바깥으로 돌아가는 점을 끼워 넣는다
function avoidTable(a, b, depth = 0) {
  if (depth > 2) return [b]
  if (a.length() < TABLE_CLEAR || b.length() < TABLE_CLEAR) return [b]
  const c = closestOnSegment(a, b)
  if (c.length() >= TABLE_CLEAR) return [b]
  let dir = c.clone()
  if (dir.lengthSq() < 1e-4) dir = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x)
  const w = dir.setLength(TABLE_CLEAR + 1.3)
  return [...avoidTable(a, w, depth + 1), ...avoidTable(w, b, depth + 1)]
}

function mainLeg(from, to) {
  return avoidTable(from.clone().setY(0), to.clone().setY(0))
}

export function route(from, to) {
  const fg = onGallery(from)
  const tg = onGallery(to)
  if (fg === tg) return fg ? [to.clone()] : mainLeg(from, to)
  if (!fg && tg) {
    const pts = []
    let cur = from.clone().setY(0)
    if (cur.z > -9.5 && Math.abs(cur.x) > 1.5) {
      pts.push(...mainLeg(cur, HALL))
      cur = HALL
    }
    pts.push(...mainLeg(cur, GATE), BRIDGE_A.clone(), BRIDGE_B.clone(), to.clone())
    return pts
  }
  // 전시 섬 → 메인 플랫폼
  const pts = [BRIDGE_B.clone(), BRIDGE_A.clone(), GATE.clone()]
  let cur = GATE
  if (to.z > -9.5 && Math.abs(to.x) > 1.5) {
    pts.push(HALL.clone())
    cur = HALL
  }
  pts.push(...mainLeg(cur, to))
  return pts
}
