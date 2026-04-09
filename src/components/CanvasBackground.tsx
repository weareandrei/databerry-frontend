'use client'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

const GradientProps = {
  animate: 'on',
  brightness: 1.2,
  cAzimuthAngle: 180,
  cDistance: 2.4,
  cPolarAngle: 95,
  cameraZoom: 1,
  color1: '#ff6a1a',
  color2: '#c73c00',
  color3: '#FD4912',
  destination: 'onCanvas',
  embedMode: 'off',
  envPreset: 'city',
  format: 'gif',
  fov: 45,
  frameRate: 10,
  gizmoHelper: 'hide',
  grain: 'off',
  lightType: '3d',
  pixelDensity: 1,
  positionX: 0,
  positionY: -2.1,
  positionZ: 0,
  range: 'disabled',
  rangeEnd: 40,
  rangeStart: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 225,
  shader: 'defaults',
  type: 'waterPlane',
  uAmplitude: 0,
  uDensity: 1.8,
  uFrequency: 5.5,
  uSpeed: 0.2,
  uStrength: 3,
  uTime: 0.2,
  wireframe: false,
} as any

export function CanvasBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <ShaderGradientCanvas style={{ width: '100%', height: '100%' }} pixelDensity={1.5} fov={45}>
        <ShaderGradient {...GradientProps} />
      </ShaderGradientCanvas>
    </div>
  )
}
