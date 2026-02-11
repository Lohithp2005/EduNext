'use client'

import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Volume2, Square, BookOpen } from 'lucide-react'
import { useLanguage } from '@/app/context/LanguageContext';

type Page = {
  text: string
  image?: string | null
}

export default function StoryPage() {
  const { messages } = useLanguage();
  const t = messages.StoryPage;
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(false)
  const [numPages, setNumPages] = useState(5)
  const [currentPage, setCurrentPage] = useState(0)

  /* ---------- CANVAS SETUP ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()

    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    clearCanvas()
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const endDraw = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPos.current) return

    const pos = getPos(e)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  /* ---------- STORY GENERATION ---------- */
  const generateStory = async () => {
    if (!prompt.trim()) {
      alert(t.storyPrompt)
      return
    }

    setLoading(true)
    try {
      const canvas = canvasRef.current
      const drawing = canvas ? canvas.toDataURL('image/png') : null

      const res = await fetch('http://localhost:8000/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          drawing: drawing,
          num_pages: numPages,
        }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const data = await res.json()
      setPages(data.pages || [])
      setCurrentPage(0)
    } catch (err) {
      console.error(err)
      alert('Backend not reachable at http://localhost:8000')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- SPEECH ---------- */
  const speak = (text: string) => {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utter)
  }

  useEffect(() => {
    if (pages[currentPage]?.text) speak(pages[currentPage].text)
  }, [currentPage, pages])

  const bookStyles = {
    cover: {
      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.5)',
      borderRadius: '1.5rem',
    } as React.CSSProperties,
    innerPage: {
      backgroundColor: '#ffffff',
      backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    } as React.CSSProperties,
    spine: {
      background: 'linear-gradient(90deg, rgba(0,0,0,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.1) 100%)',
      width: '12px',
    } as React.CSSProperties,
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8">
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-black text-purple-600 mb-4">{t.title}</h1>
        <p className="text-purple-700 text-xl font-medium">
          {t.subtitle}
        </p>
      </header>

      <main className="max-w-4xl mx-auto h-full flex flex-col items-center">
        {/* Input Section */}
        <section className="w-full flex flex-col gap-8 mb-16">
          {/* Canvas */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-purple-600">{t.drawHere}</h2>
              <button
                onClick={clearCanvas}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={24} />
              </button>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full aspect-[16/9] border-2 border-dashed border-gray-200 rounded-2xl bg-white touch-none cursor-default"
              onMouseDown={startDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onMouseMove={draw}
              onTouchStart={(e) => {
                e.preventDefault()
                startDraw(e)
              }}
              onTouchEnd={endDraw}
              onTouchMove={(e) => {
                e.preventDefault()
                draw(e)
              }}
            />
          </div>

          {/* Prompt */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-white flex flex-col">
            <h2 className="text-2xl font-bold text-purple-600 mb-4">
              {t.storyPrompt}
            </h2>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-purple-400 text-lg resize-none min-h-[120px] focus:outline-none transition-all"
              placeholder={t.storyPlaceholder}
            />

            <div className="mt-4 flex items-center gap-3">
              <label className="font-semibold text-purple-600">{t.numberOfPages}</label>
              <input
                type="number"
                min={1}
                max={10}
                value={numPages}
                onChange={(e) => setNumPages(Number(e.target.value))}
                className="w-20 p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
              />
            </div>

            <button
              onClick={generateStory}
              disabled={loading}
              className="mt-6 w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-purple-600 text-white rounded-2xl text-xl font-bold shadow-lg disabled:opacity-50 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {loading ? `✨ ${t.generating}` : `✨ ${t.generateStory}`}
            </button>
          </div>
        </section>

        {/* Story View */}
        {pages.length > 0 && (
          <section className="w-full mb-16 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-8 px-6 py-2 rounded-full">
              <BookOpen className="text-indigo-600 animate-pulse" />
              <h2 className="text-3xl font-black text-indigo-600 font-serif">
                Your Story Begins!
              </h2>
            </div>

            <div className="relative w-full flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="hidden md:flex p-4 bg-white rounded-full shadow-xl text-purple-600 disabled:opacity-20 hover:scale-110 transition-all border-4 border-purple-200"
              >
                <ChevronLeft size={32} />
              </button>

              <div style={bookStyles.cover} className="flex-1 p-2 md:p-3 max-w-5xl ">
                <div className="flex bg-white rounded-2xl overflow-hidden min-h-[400px] md:min-h-[500px]">
                  {/* Left Page */}
                  <div
                    className="w-1/2 p-6 md:p-12 flex flex-col items-center justify-center text-center border-r border-dashed border-purple-100"
                    style={bookStyles.innerPage}
                  >
                    <div className="mb-4 text-indigo-400 font-black tracking-widest text-xs uppercase">
                      {t.page} {currentPage + 1} / {pages.length}
                    </div>
                    <p className="text-xl md:text-3xl font-medium text-slate-800 leading-snug font-serif italic">
                      "{pages[currentPage]?.text}"
                    </p>
                  </div>

                  {/* Spine */}
                  <div style={bookStyles.spine} />

                  {/* Right Page */}
                  <div
                    className="w-1/2 p-4 md:p-8 flex items-center justify-center relative"
                    style={bookStyles.innerPage}
                  >
                    {pages[currentPage]?.image ? (
                      <div className="w-full h-full rounded-2xl overflow-hidden border-8 border-yellow-400 shadow-lg rotate-1 hover:rotate-0 transition-transform duration-500">
                        <img
                          src={pages[currentPage].image!}
                          className="w-full h-full object-cover"
                          alt="Story illustration"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-2xl border-8 border-yellow-400 bg-gradient-to-br from-purple-100 to-blue-50 flex items-center justify-center">
                        <p className="text-purple-400 font-medium animate-pulse">
                          Generating art...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage >= pages.length - 1}
                className="hidden md:flex p-4 bg-white rounded-full shadow-xl text-purple-600 disabled:opacity-20 hover:scale-110 transition-all border-4 border-purple-200"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Mobile Controls + Audio */}
            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="flex md:hidden gap-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-4 bg-white rounded-full shadow-lg disabled:opacity-30 text-purple-600"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                  disabled={currentPage >= pages.length - 1}
                  className="p-4 bg-white rounded-full shadow-lg disabled:opacity-30 text-purple-600"
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => speak(pages[currentPage].text)}
                  className="px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-full font-black text-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                  <Volume2 /> {t.readAloud}
                </button>
                <button
                  onClick={() => window.speechSynthesis.cancel()}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-full font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-2"
                >
                  <Square size={16} fill="currentColor" /> {t.stopReading}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
