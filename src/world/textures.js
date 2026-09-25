import * as THREE from 'three'
import { C, FONT } from '../config.js'

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

export function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function font(weight, size) {
  return `${weight} ${size}px ${FONT}`
}

// 한글은 띄어쓰기 단위로 줄바꿈하고, 한 단어가 너무 길면 글자 단위로 자른다.
export function wrapText(ctx, text, maxWidth) {
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= maxWidth) {
        line = next
        continue
      }
      if (line) out.push(line)
      if (ctx.measureText(word).width <= maxWidth) {
        line = word
      } else {
        line = ''
        for (const ch of word) {
          if (ctx.measureText(line + ch).width > maxWidth) {
            out.push(line)
            line = ch
          } else line += ch
        }
      }
    }
    out.push(line)
  }
  return out
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 부드러운 원형 글로우 (별 · 입자 · 성운)
export function glowTexture(inner = 'rgba(247,245,252,1)', outer = 'rgba(129,95,215,0)', size = 128) {
  const canvas = makeCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

// 스튜디오 표지판: 큰 글자(D/A/H) + 제목 + 설명
export function signTexture({ letter, title, subtitle, lines = [], accent = C.primary }) {
  const W = 1024
  const H = 512
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(23,19,33,0.92)'
  roundRect(ctx, 0, 0, W, H, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(200,185,242,0.35)'
  ctx.lineWidth = 4
  roundRect(ctx, 2, 2, W - 4, H - 4, 16)
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.font = font(800, 220)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(letter, 56, 250)

  ctx.fillStyle = C.text
  ctx.font = font(800, 64)
  ctx.fillText(title, 250, 130)
  ctx.fillStyle = C.textSec
  ctx.font = font(500, 40)
  ctx.fillText(subtitle, 252, 200)

  ctx.fillStyle = C.textMeta
  ctx.font = font(500, 34)
  let y = 330
  for (const l of lines) {
    ctx.fillText(l, 60, y)
    y += 52
  }
  return toTexture(canvas)
}

// 작은 라벨(전시 포스터 캡션 등)
export function captionTexture(top, bottom, { w = 512, h = 160, accent = C.light } = {}) {
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(16,13,24,0.85)'
  roundRect(ctx, 0, 0, w, h, 8)
  ctx.fill()
  ctx.fillStyle = accent
  ctx.font = font(700, 34)
  ctx.textBaseline = 'top'
  ctx.fillText(top, 24, 22)
  ctx.fillStyle = C.text
  ctx.font = font(700, 44)
  const lines = wrapText(ctx, bottom, w - 48)
  ctx.fillText(lines[0] + (lines.length > 1 ? '…' : ''), 24, 78)
  return toTexture(canvas)
}

// 동아리 배너(세로)
export function bannerTexture(name, field) {
  const W = 256
  const H = 768
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(104,68,196,0.95)')
  g.addColorStop(1, 'rgba(33,26,49,0.95)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = C.light
  ctx.font = font(600, 28)
  ctx.textAlign = 'center'
  ctx.fillText('CLUB', W / 2, 70)
  ctx.fillStyle = C.text
  ctx.font = font(800, 44)
  const lines = wrapText(ctx, name, W - 40)
  let y = 160
  for (const l of lines) {
    ctx.fillText(l, W / 2, y)
    y += 56
  }
  ctx.fillStyle = C.textSec
  ctx.font = font(500, 30)
  ctx.fillText(field, W / 2, H - 70)
  return toTexture(canvas)
}
