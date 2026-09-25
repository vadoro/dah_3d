import * as THREE from 'three'
import { CAMERA_PRESETS } from './config.js'

const ease = (t) => 1 - Math.pow(1 - t, 3)

// 부드러운 카메라 이동 + 인물 따라가기. OrbitControls와 함께 쓴다.
export class CameraRig {
  constructor(camera, controls) {
    this.camera = camera
    this.controls = controls
    this.tween = null
    this.follow = null
    this.lastFollowPos = new THREE.Vector3()
  }

  flyTo(position, target, duration = 1.8) {
    this.tween = {
      p0: this.camera.position.clone(),
      t0: this.controls.target.clone(),
      p1: position.clone(),
      t1: target.clone(),
      k: 0,
      duration,
    }
  }

  preset(name, duration) {
    const p = CAMERA_PRESETS[name]
    if (p) this.flyTo(p[0], p[1], duration)
  }

  // 지점 가까이 — 현재 보는 방향을 유지하며 거리만 줄인다
  closeUp(point, distance = 7.5, height = 3.2) {
    const dir = this.camera.position.clone().sub(this.controls.target).setY(0)
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1)
    dir.setLength(distance)
    const pos = point
      .clone()
      .add(dir)
      .setY(point.y + height)
    this.flyTo(pos, point.clone().setY(point.y + 1.1), 1.6)
  }

  setFollow(agent) {
    this.follow = agent
    if (agent) {
      this.lastFollowPos.copy(agent.position)
      this.closeUp(agent.position.clone(), 6.5, 3)
    }
  }

  cancel() {
    this.tween = null
  }

  update(dt) {
    if (this.follow) {
      const delta = this.follow.position.clone().sub(this.lastFollowPos)
      this.lastFollowPos.copy(this.follow.position)
      if (this.tween) {
        this.tween.p1.add(delta)
        this.tween.t1.add(delta)
      } else {
        this.camera.position.add(delta)
        this.controls.target.add(delta)
      }
    }
    if (this.tween) {
      const tw = this.tween
      tw.k = Math.min(1, tw.k + dt / tw.duration)
      const e = ease(tw.k)
      this.camera.position.lerpVectors(tw.p0, tw.p1, e)
      this.controls.target.lerpVectors(tw.t0, tw.t1, e)
      if (tw.k >= 1) this.tween = null
    }
  }
}
