import * as THREE from 'three'
import { CAMERA_PRESETS, ISO } from './config.js'

const ease = (t) => 1 - Math.pow(1 - t, 3)
const clampZoom = (z) => THREE.MathUtils.clamp(z, ISO.minZoom, ISO.maxZoom)

// 등각 카메라: 바라보는 점(target) · 확대(zoom) · 방위(90° 단위)만으로 시점이 정해진다.
// OrbitControls는 이동(드래그)과 확대(휠)만 맡고, 회전은 이 리그가 90°씩 돌린다.
export class CameraRig {
  constructor(camera, controls) {
    this.camera = camera
    this.controls = controls
    this.azimuth = ISO.baseAzimuth
    this.azTarget = ISO.baseAzimuth
    this.tween = null
    this.follow = null
    this.lastFollowPos = new THREE.Vector3()
    this.offset = new THREE.Vector3()
    this.apply()
  }

  // 장면에서 카메라 쪽을 가리키는 수평 단위 벡터(x, z)
  get viewDir() {
    return { x: Math.sin(this.azimuth), z: Math.cos(this.azimuth) }
  }

  apply() {
    const e = ISO.elevation
    this.offset.set(Math.sin(this.azimuth) * Math.cos(e), Math.sin(e), Math.cos(this.azimuth) * Math.cos(e)).multiplyScalar(ISO.distance)
    this.camera.position.copy(this.controls.target).add(this.offset)
    this.camera.lookAt(this.controls.target)
  }

  flyTo(target, zoom = this.camera.zoom, duration = 1.8) {
    this.tween = {
      t0: this.controls.target.clone(),
      t1: target.clone(),
      z0: this.camera.zoom,
      z1: clampZoom(zoom),
      k: 0,
      duration: Math.max(0.01, duration),
    }
  }

  preset(name, duration) {
    const p = CAMERA_PRESETS[name]
    if (p) this.flyTo(p.target, p.zoom, duration)
  }

  // 지점 가까이 — 그 점을 화면 가운데 두고 확대한다
  closeUp(point, zoom = 3.2, lift = 1.1) {
    this.flyTo(point.clone().setY(point.y + lift), zoom, 1.6)
  }

  // 90°씩 회전 (dir: +1 시계 방향, -1 반시계)
  rotate(dir) {
    this.azTarget += dir * (Math.PI / 2)
  }

  setFollow(agent) {
    this.follow = agent
    if (agent) {
      this.lastFollowPos.copy(agent.position)
      this.closeUp(agent.position.clone(), 3.4, 1)
    }
  }

  cancel() {
    this.tween = null
  }

  update(dt) {
    if (this.follow) {
      const delta = this.follow.position.clone().sub(this.lastFollowPos)
      this.lastFollowPos.copy(this.follow.position)
      if (this.tween) this.tween.t1.add(delta)
      else this.controls.target.add(delta)
    }
    if (this.tween) {
      const tw = this.tween
      tw.k = Math.min(1, tw.k + dt / tw.duration)
      const e = ease(tw.k)
      this.controls.target.lerpVectors(tw.t0, tw.t1, e)
      // 확대는 비율로 보간해야 멀어질 때와 가까워질 때 속도가 같게 느껴진다
      this.camera.zoom = tw.z0 * Math.pow(tw.z1 / tw.z0, e)
      this.camera.updateProjectionMatrix()
      if (tw.k >= 1) this.tween = null
    }
    const d = this.azTarget - this.azimuth
    this.azimuth = Math.abs(d) < 1e-4 ? this.azTarget : this.azimuth + d * (1 - Math.exp(-7 * dt))
    this.apply()
  }
}
