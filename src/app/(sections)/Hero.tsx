'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Xarrow from 'react-xarrows'
// import { ArcherContainer, ArcherElement } from 'react-archer'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

const LOGOS = [
  { src: '/landing/logos/stripe_logo.png', alt: 'Stripe' },
  { src: '/landing/logos/calendly_logo.png', alt: 'Calendly' },
  { src: '/landing/logos/posthog_logo.png', alt: 'PostHog' },
  { src: '/landing/logos/ga4_logo.png', alt: 'Google Analytics' },
  { src: '/landing/logos/gmail_logo.png', alt: 'Gmail' },
  { src: '/landing/logos/mailchimp_logo.png', alt: 'Mailchimp' },
  { src: '/landing/logos/notion_logo.png', alt: 'Notion' },
]

export function Hero() {
  return (
    <section className="relative w-full h-screen">
      {/* Gradient background — overflow-hidden kept here so it clips properly */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <ShaderGradientCanvas style={{ width: '100%', height: '100%' }} pixelDensity={1.5} fov={45}>
          <ShaderGradient
            animate="on"
            bgColor1="#000000"
            bgColor2="#000000"
            brightness={1.2}
            cAzimuthAngle={180}
            cDistance={2.4}
            cPolarAngle={95}
            cameraZoom={1}
            color1="#ff6a1a"
            color2="#c73c00"
            color3="#FD4912"
            destination="onCanvas"
            embedMode="off"
            envPreset="city"
            format="gif"
            fov={45}
            frameRate={10}
            gizmoHelper="hide"
            grain="off"
            lightType="3d"
            pixelDensity={1}
            positionX={0}
            positionY={-2.1}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.1}
            rotationX={0}
            rotationY={0}
            rotationZ={225}
            shader="defaults"
            type="waterPlane"
            uAmplitude={0}
            uDensity={1.8}
            uFrequency={5.5}
            uSpeed={0.2}
            uStrength={3}
            uTime={0.2}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>

      {/* Bottom fade to white */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-[15vh] z-20 bg-gradient-to-t from-white to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-6 overflow-y-auto">
        {/* Badge */}
        <div className="mb-6 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Business Intelligence for founders
        </div>

        {/* H1 */}
        <h1
          className="max-w-4xl text-6xl font-semibold leading-[1] tracking-[-0.06em] text-white"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          <span className="text-black">Track </span>
          all <span className="text-black">your business data in a</span>
          <br />
          single dashboard
        </h1>

        {/* H4 subheader */}
        <h4
          className="mt-5 max-w-xl text-lg font-normal leading-[1.4] tracking-[0.01em] text-black"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          Integrate business data from any platform you work with into a single page. See only data
          that matters.
        </h4>

        {/* Integrations diagram — hidden below md */}
        <div className="hidden md:block mt-12 w-full max-w-3xl">
          {/* Logo row */}
          <div className="flex items-center justify-center gap-12">
            {LOGOS.map((logo, i) => (
              <div
                key={logo.alt}
                id={`logo-${i}`}
                className="rounded-[18px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={60}
                  height={60}
                  className="rounded-[10px]"
                />
              </div>
            ))}
          </div>

          {/* Centre hub dot */}
          <div className="flex justify-center mt-10">
            <div
              id="hub-dot"
              className="h-4 w-4 rounded-full bg-[#e85c20] border-2 border-white shadow-[0_0_0_4px_rgba(255,255,255,0.25)]"
            />
          </div>

          {/* Xarrows */}
          {LOGOS.map((logo, i) => (
            <Xarrow
              key={logo.alt}
              start={`logo-${i}`}
              end="hub-dot"
              color="rgba(255,255,255,0.7)"
              strokeWidth={2.5}
              headSize={0}
              curveness={0.6}
              startAnchor="bottom"
              endAnchor="top"
              path="grid"
            />
          ))}

          {/* Line going down from hub dot to demo card */}
          <div className="flex justify-center">
            <div className="h-8 w-0.5 bg-white/70" />
          </div>

          {/* Anchor — marks the exact bottom of the connector line */}
          <div id="demo-anchor" />

          {/* Space reserved for the demo */}
          <div className="h-[150px]"></div>
        </div>
      </div>
    </section>
  )
}
