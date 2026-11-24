'use client'
import { useEffect, useState } from 'react'
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

/**
 * Sections that let this fixed backdrop show through mark themselves with
 * this attribute. The shader redraws the whole screen every frame, so it
 * only runs while one of them is on (or about to come on) screen — behind
 * the white sections it is invisible and was pure GPU cost.
 */
const WINDOW_SELECTOR = '[data-canvas-window]'
/** Start the shader one screen early so it is already running on arrival. */
const WARM_UP_MARGIN = '100% 0px'

export function CanvasBackground() {
  const visible = useCanvasVisible()

  return (
    // The static gradient is what shows while the shader is stopped or
    // still starting up — same three colours, so the swap is not a flash.
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(135deg,#ff6a1a_0%,#FD4912_55%,#c73c00_100%)]">
      {visible && (
        <ShaderGradientCanvas style={{ width: '100%', height: '100%' }} pixelDensity={1.5} fov={45}>
          <ShaderGradient {...GradientProps} />
        </ShaderGradientCanvas>
      )}
    </div>
  )
}

const useCanvasVisible = () => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const windows = document.querySelectorAll(WINDOW_SELECTOR)
    // A page with no marked sections (e.g. the auth screens) shows the
    // backdrop everywhere — leave it running.
    if (windows.length === 0) return

    const onScreen = new Set<Element>()
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target)
          else onScreen.delete(entry.target)
        }
        setVisible(onScreen.size > 0)
      },
      { rootMargin: WARM_UP_MARGIN },
    )
    windows.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return visible
}
