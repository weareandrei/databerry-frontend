'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Navbar from '@/app/(components)/navbar'
import { CanvasBackground } from '@/components/CanvasBackground'

export default function WishlistPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('wishlist').insert({ email })

    if (error) {
      if (error.code === '23505') {
        toast.error("You're already on the list!")
      } else {
        toast.error('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      <CanvasBackground />

      <Navbar />

      {/* Centered card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 min-h-screen">
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-md">
          {/* Outer semi-transparent wrapper */}
          <div className="bg-white/35 backdrop-blur-sm p-4">
            {/* Inner fully white form area */}
            <div className="bg-white rounded-xl px-8 py-10">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h2
                    className="text-2xl font-semibold text-gray-900"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    You're on the list!
                  </h2>
                  <p className="text-sm text-gray-500">
                    We'll reach out to <span className="font-medium text-gray-700">{email}</span> when
                    Databerry is ready for you.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <p className="text-xs font-medium text-orange-500 uppercase tracking-widest mb-2">
                      Early access
                    </p>
                    <h2
                      className="text-3xl font-semibold tracking-tight text-gray-900 leading-[1.1]"
                      style={{ fontFamily: 'var(--font-bricolage)' }}
                    >
                      Join the wishlist
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                      Databerry is in private beta. Leave your email and we'll let you know when
                      your spot is ready.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Adding you…' : 'Add me to the wishlist'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
