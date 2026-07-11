import { RevealOnScroll } from '@/app/(components)/RevealOnScroll'

/**
 * Demo video section — a single embedded YouTube player, centered
 * horizontally, sitting right after the Connect section.
 *
 * Background: `bg-white`. The sections above (Hero / Demo / Connect)
 * float over the Hero's dark `CanvasBackground`; Features is the first
 * solid-white band. Inserting this section here means the dark→light
 * transition now lands on the video rather than on Features — the
 * player reads as the opening of the light content area.
 *
 * Sizing: `mx-auto max-w-5xl` centres the frame and caps its width on
 * large screens; `aspect-video` (16:9) + an absolutely-positioned
 * iframe keep the player at the correct ratio while it scales fluidly
 * with the container at every breakpoint.
 *
 * Responsive padding: desktop keeps the wide `px-[10vw] py-24` rhythm
 * shared with the other sections. Mobile gets tighter gutters
 * (`px-4`, so the player is noticeably wider on a phone) and much
 * less vertical room (`pt-12 pb-6`) — the default `py-24` stacked
 * with the Features section's own top padding left a large empty
 * band below the video on small screens.
 *
 * Shown at every breakpoint: the mobile `<DemoSection>` is a blurred
 * screenshot teaser (not the video), so this is the single place the
 * actual product video plays on both mobile and desktop.
 */
const VideoSection = () => {
  return (
    <section className="relative z-30 bg-white px-4 pt-12 pb-6 md:px-[10vw] md:py-24">
      <RevealOnScroll>
        <div className="mx-auto w-full max-w-5xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
            <iframe
              src="https://www.youtube.com/embed/YptDji8Wc5A"
              title="Databerry demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}

export default VideoSection
