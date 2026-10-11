import * as THREE from 'three'
import { LAYOUT } from '../config.js'

// 간단한 길찾기: 원탁 · 전시 토템 우회 + 전시 섬은 H 게이트 → 다리를 거쳐 간다.
const V = (x, z) => new THREE.Vector3(x, 0, z)
const G = LAYOUT.zones.gallery.center
const GATE = V(0, -19.8)
const BRIDGE_A = V(0, -24.5)
const BRIDGE_B = V(0, -37.2)
const HALL = V(0, -9)

// 돌아가야 하는 둥근 장애물: 아고라 원탁, 전시 섬 가운데 토템
const OBSTACLES = [
  { c: V(0, 0), r: 3.1 },
  { c: V(G.x, G.z), r: 2.0 },
]

export function onGallery(p) {
  const h = LAYOUT.galleryHalf + 0.6
  return Math.abs(p.x - G.x) < h && Math.abs(p.z - G.z) < h
}

function closestOnSegment(a, b, o) {
  const ab = b.clone().sub(a)
  const len2 = ab.lengthSq() || 1
  const t = THREE.MathUtils.clamp(o.clone().sub(a).dot(ab) / len2, 0, 1)
  return a.clone().addScaledVector(ab, t)
}

// a→b가 장애물을 가로지르면 장애물 바깥으로 돌아가는 점을 끼워 넣는다
function avoid(a, b, ob, depth = 0) {
  if (depth > 2) return [b]
  if (a.distanceTo(ob.c) < ob.r || b.distanceTo(ob.c) < ob.r) return [b]
  const p = closestOnSegment(a, b, ob.c)
  if (p.distanceTo(ob.c) >= ob.r) return [b]
  let dir = p.clone().sub(ob.c)
  if (dir.lengthSq() < 1e-4) dir = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x)
  const w = ob.c.clone().add(dir.setLength(ob.r + 1.3))
  return [...avoid(a, w, ob, depth + 1), ...avoid(w, b, ob, depth + 1)]
}

function leg(from, to) {
  let pts = [to.clone().setY(0)]
  let start = from.clone().setY(0)
  for (const ob of OBSTACLES) {
    const out = []
    let cur = start
    for (const p of pts) {
      out.push(...avoid(cur, p, ob))
      cur = p
    }
    pts = out
    start = from.clone().setY(0)
  }
  return pts
}

export function route(from, to) {
  const fg = onGallery(from)
  const tg = onGallery(to)
  if (fg === tg) return leg(from, to)
  if (!fg && tg) {
    const pts = []
    let cur = from.clone().setY(0)
    if (cur.z > -9.5 && Math.abs(cur.x) > 1.5) {
      pts.push(...leg(cur, HALL))
      cur = HALL
    }
    pts.push(...leg(cur, GATE), BRIDGE_A.clone(), BRIDGE_B.clone(), ...leg(BRIDGE_B, to))
    return pts
  }
  // 전시 섬 → 메인 플랫폼
  const pts = [...leg(from, BRIDGE_B), BRIDGE_A.clone(), GATE.clone()]
  let cur = GATE
  if (to.z > -9.5 && Math.abs(to.x) > 1.5) {
    pts.push(HALL.clone())
    cur = HALL
  }
  pts.push(...leg(cur, to))
  return pts
}
