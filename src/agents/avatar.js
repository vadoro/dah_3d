import * as THREE from 'three'

// 단순한 도형으로 만든 인물. 얼굴은 모두 같은 오프화이트 — 사람보다 역할과 관계가 먼저 보이도록.
// 학생 몸색 = 트랙 모티브색(D·A·H), 교수 = 밝은 롱코트 + 스카프, 관람객 = 반투명.

const geo = {
  leg: new THREE.CapsuleGeometry(0.085, 0.4, 4, 8).translate(0, -0.285, 0),
  arm: new THREE.CapsuleGeometry(0.058, 0.36, 4, 8).translate(0, -0.24, 0),
  torso: new THREE.CapsuleGeometry(0.2, 0.34, 4, 14),
  coat: new THREE.CylinderGeometry(0.21, 0.32, 0.95, 20),
  head: new THREE.SphereGeometry(0.19, 24, 18),
  eye: new THREE.SphereGeometry(0.022, 8, 6),
  capShort: new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  capBob: new THREE.SphereGeometry(0.207, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.64),
  tail: new THREE.CapsuleGeometry(0.12, 0.26, 4, 10),
  bun: new THREE.SphereGeometry(0.09, 12, 10),
  curl: new THREE.SphereGeometry(0.085, 10, 8),
  scarf: new THREE.TorusGeometry(0.16, 0.05, 8, 20),
  hit: new THREE.CylinderGeometry(0.4, 0.4, 1.95, 8).translate(0, 0.975, 0),
  sel: new THREE.RingGeometry(0.46, 0.53, 40),
  team: new THREE.RingGeometry(0.3, 0.345, 32),
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
      roughness: 0.55,
      metalness: 0.05,
      transparent: ghost,
      opacity: ghost ? 0.62 : 1,
      ...extra,
    })
  const bodyMat = M(spec.body, { emissive: spec.body, emissiveIntensity: ghost ? 0.25 : 0.06 })
  const legMat = M(spec.legs ?? '#2A2238')
  const skinMat = M('#F3EEFB', { emissive: '#F7F5FC', emissiveIntensity: 0.1, roughness: 0.4 })
  const hairMat = M(spec.hair ?? '#2A2038', { roughness: 0.75 })
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
  torso.position.y = 0.97
  if (spec.kind === 'prof') {
    const coat = add(geo.coat, bodyMat)
    coat.position.y = 0.86
    const scarf = add(geo.scarf, M(spec.accent, { emissive: spec.accent, emissiveIntensity: 0.3 }))
    scarf.rotation.x = Math.PI / 2
    scarf.position.y = 1.32
  }

  const armL = add(geo.arm, bodyMat)
  armL.position.set(-0.27, 1.28, 0)
  const armR = add(geo.arm, bodyMat)
  armR.position.set(0.27, 1.28, 0)

  const head = new THREE.Group()
  head.position.y = 1.56
  rig.add(head)
  add(geo.head, skinMat, head)
  for (const x of [-0.066, 0.066]) {
    const e = add(geo.eye, eyeMat, head)
    e.position.set(x, 0.02, 0.172)
  }
  const style = spec.hairStyle ?? 'short'
  if (style === 'short' || style === 'bun') {
    const cap = add(geo.capShort, hairMat, head)
    cap.rotation.x = -0.35
    cap.scale.set(1.04, 1.02, 1.06)
    if (style === 'bun') {
      const b = add(geo.bun, hairMat, head)
      b.position.set(0, 0.2, -0.1)
    }
  } else if (style === 'bob' || style === 'long') {
    const cap = add(geo.capBob, hairMat, head)
    cap.rotation.x = -0.5
    cap.scale.set(1.05, 1.05, 1.05)
    if (style === 'long') {
      const t = add(geo.tail, hairMat, head)
      t.position.set(0, -0.2, -0.11)
    }
  } else if (style === 'curly') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const c = add(geo.curl, hairMat, head)
      c.position.set(Math.cos(a) * 0.13, 0.13 + Math.sin(i) * 0.02, Math.sin(a) * 0.13 - 0.03)
    }
    const top = add(geo.curl, hairMat, head)
    top.position.set(0, 0.19, -0.02)
    top.scale.setScalar(1.3)
  }

  // 발밑 팀 링 · 선택 링
  let teamRing = null
  if (spec.team) {
    teamRing = new THREE.Mesh(
      geo.team,
      new THREE.MeshBasicMaterial({ color: spec.team, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
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
