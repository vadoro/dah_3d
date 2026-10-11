import * as THREE from 'three'

// 등각 디오라마에 맞춘 블록형 인물. 얼굴은 모두 같은 오프화이트 — 사람보다 역할과 관계가 먼저 보이도록.
// 학생 몸색 = 트랙 모티브색(D·A·H), 교수 = 밝은 롱코트 + 스카프, 관람객 = 반투명.
// 관절(다리 · 팔 · 머리)의 피벗 위치는 이전 모델과 같아 걷기 · 몸짓 애니메이션을 그대로 쓴다.

const box = (w, h, d, dy = 0) => new THREE.BoxGeometry(w, h, d).translate(0, dy, 0)

const geo = {
  leg: box(0.15, 0.62, 0.17, -0.27),
  arm: box(0.11, 0.46, 0.12, -0.23),
  torso: box(0.42, 0.6, 0.26),
  coat: box(0.48, 0.92, 0.32),
  head: box(0.34, 0.34, 0.32),
  eye: box(0.05, 0.05, 0.02),
  hairTop: box(0.37, 0.1, 0.35),
  hairBack: box(0.37, 0.24, 0.07),
  hairSide: box(0.06, 0.2, 0.3),
  hairLong: box(0.32, 0.36, 0.08),
  bun: box(0.14, 0.14, 0.14),
  curl: box(0.12, 0.12, 0.12),
  scarf: box(0.52, 0.1, 0.36),
  hit: new THREE.CylinderGeometry(0.4, 0.4, 1.95, 8).translate(0, 0.975, 0),
  // 바닥 표시는 정사각 틀 — RingGeometry 4분할을 45° 돌린다
  sel: new THREE.RingGeometry(0.58, 0.68, 4, 1, Math.PI / 4),
  team: new THREE.RingGeometry(0.38, 0.44, 4, 1, Math.PI / 4),
}

export function createAvatar(spec) {
  const ghost = spec.kind === 'visitor'
  const root = new THREE.Group()
  const rig = new THREE.Group()
  rig.scale.setScalar(spec.height ?? 1)
  root.add(rig)

  const M = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.02,
      transparent: ghost,
      opacity: ghost ? 0.62 : 1,
      ...extra,
    })
  const bodyMat = M(spec.body, { emissive: spec.body, emissiveIntensity: ghost ? 0.25 : 0.06 })
  const legMat = M(spec.legs ?? '#2A2238')
  const skinMat = M('#F3EEFB', { emissive: '#F7F5FC', emissiveIntensity: 0.1, roughness: 0.5 })
  const hairMat = M(spec.hair ?? '#2A2038', { roughness: 0.8 })
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#211A31' })

  const add = (g, mat, parent = rig) => {
    const m = new THREE.Mesh(g, mat)
    m.castShadow = !ghost
    parent.add(m)
    return m
  }

  const legL = add(geo.leg, legMat)
  legL.position.set(-0.1, 0.6, 0)
  const legR = add(geo.leg, legMat)
  legR.position.set(0.1, 0.6, 0)

  const torso = add(geo.torso, bodyMat)
  torso.position.y = 0.96
  if (spec.kind === 'prof') {
    const coat = add(geo.coat, bodyMat)
    coat.position.y = 0.86
    const scarf = add(geo.scarf, M(spec.accent, { emissive: spec.accent, emissiveIntensity: 0.3 }))
    scarf.position.y = 1.34
  }

  const armL = add(geo.arm, bodyMat)
  armL.position.set(-0.28, 1.25, 0)
  const armR = add(geo.arm, bodyMat)
  armR.position.set(0.28, 1.25, 0)

  const head = new THREE.Group()
  head.position.y = 1.47
  rig.add(head)
  const skull = add(geo.head, skinMat, head)
  skull.position.y = 0.17
  for (const x of [-0.07, 0.07]) {
    const e = add(geo.eye, eyeMat, head)
    e.position.set(x, 0.18, 0.165)
  }
  const style = spec.hairStyle ?? 'short'
  const hair = (g, x, y, z) => {
    const m = add(g, hairMat, head)
    m.position.set(x, y, z)
    return m
  }
  hair(geo.hairTop, 0, 0.37, -0.01)
  hair(geo.hairBack, 0, 0.26, -0.15)
  if (style === 'bob' || style === 'long') {
    hair(geo.hairSide, -0.175, 0.22, -0.02)
    hair(geo.hairSide, 0.175, 0.22, -0.02)
    if (style === 'long') hair(geo.hairLong, 0, 0.0, -0.17)
  } else if (style === 'bun') {
    hair(geo.bun, 0, 0.47, -0.08)
  } else if (style === 'curly') {
    for (const [x, z] of [
      [-0.13, 0.1],
      [0.13, 0.1],
      [-0.15, -0.08],
      [0.15, -0.08],
      [0, -0.12],
    ]) {
      hair(geo.curl, x, 0.43, z)
    }
  }

  // 발밑 팀 표시 · 선택 표시 (정사각 틀)
  let teamRing = null
  if (spec.team) {
    teamRing = new THREE.Mesh(
      geo.team,
      new THREE.MeshBasicMaterial({ color: spec.team, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    )
    teamRing.rotation.x = -Math.PI / 2
    teamRing.position.y = 0.02
    root.add(teamRing)
  }
  const sel = new THREE.Mesh(
    geo.sel,
    new THREE.MeshBasicMaterial({ color: '#F7F5FC', transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  )
  sel.rotation.x = -Math.PI / 2
  sel.position.y = 0.025
  sel.visible = false
  root.add(sel)

  const hit = new THREE.Mesh(geo.hit, new THREE.MeshBasicMaterial())
  hit.visible = false
  root.add(hit)

  return { root, rig, parts: { legL, legR, armL, armR, head, torso }, hit, sel, teamRing }
}
