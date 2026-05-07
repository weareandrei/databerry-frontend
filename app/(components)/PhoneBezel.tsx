const CORNER_PATH = 'M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z'

/**
 * Decorative phone-frame border around the auth + landing pages.
 *
 * Hidden on mobile (`hidden md:block`): a phone-frame border around
 * an actual phone is redundant chrome that just eats viewport
 * height. On mobile the page sits directly on the device's edges,
 * which is what the design wants.
 */
export function PhoneBezel() {
  return (
    <div className="hidden md:block pointer-events-none fixed inset-0 z-[9999]">
      {/* Straight border edges */}
      <div className="fixed top-0 left-0 right-0 h-3 bg-white" />
      <div className="fixed bottom-0 left-0 right-0 h-3 bg-white" />
      <div className="fixed top-0 left-0 bottom-0 w-3 bg-white" />
      <div className="fixed top-0 right-0 bottom-0 w-3 bg-white" />

      {/* Top-left */}
      <svg
        className="absolute bottom-3 left-3"
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>

      {/* Top-right — mirror X */}
      <svg
        className="absolute bottom-3 right-3 -scale-x-100"
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>

      {/* Bottom-left — mirror Y */}
      <svg
        className="absolute top-3 left-3 -scale-y-100"
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>

      {/* Bottom-right — mirror both */}
      <svg
        className="absolute top-3 right-3 -scale-x-100 -scale-y-100"
        width="50"
        height="50"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden="true"
      >
        <path d={CORNER_PATH} fill="white" />
      </svg>
    </div>
  )
}
