"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useLanguage } from '@/app/context/LanguageContext';

/* ================================================================================
   COMPREHENSIVE NEURODIVERGENCE SCREENING - ALL AGES
   ================================================================================
   6 Fun Gamified Tests for Complete Cognitive Assessment
   
   🎯 COGNITIVE SKILLS TESTED (Progressive Order):
   1. Visual-Spatial Memory - Architect Builder
   2. Working Memory + Processing - Secret Agent Code Breaker
   3. Reaction Time - Whack-a-Hamster
   4. Attention & Impulse Control - Gem Collector
   5. Auditory Processing - Sound Memory
   6. Logical Reasoning - Detective Mystery Solver
   ================================================================================
*/

type CognitiveProfile = {
  visualSpatial: number
  workingMemory: number
  reactionTime: number
  attention: number
  auditoryProcessing: number
  reasoning: number
}

type GameResult = {
  game: number
  question: number
  correct: boolean
  time: number
  difficulty: number
}

export default function ComprehensiveCognitiveScreening() {
  const { messages } = useLanguage();
  const t = messages.DotPage;
  
  const [stage, setStage] = useState<"intro" | "info" | "games" | "profile" | "recommendations">("intro")
  const [currentGame, setCurrentGame] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  
  // User info
  const [name, setName] = useState("")
  const [age, setAge] = useState(10)
  
  // Cognitive scores
  const [cognitiveScores, setCognitiveScores] = useState<CognitiveProfile>({
    visualSpatial: 0,
    workingMemory: 0,
    reactionTime: 0,
    attention: 0,
    auditoryProcessing: 0,
    reasoning: 0
  })
  
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [feedback, setFeedback] = useState<{correct: boolean; message?: string; gemMetrics?: any} | null>(null)
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false)
  
  // Game 1: Visual-Spatial - Architect Builder
  const [architectPattern, setArchitectPattern] = useState<number[][]>([])
  const [architectBuilt, setArchitectBuilt] = useState<number[][]>([])
  const [showPattern, setShowPattern] = useState(true)
  
  // Game 2: Working Memory - Secret Agent Code Breaker
  const [codeSequence, setCodeSequence] = useState<string[]>([])
  const [codeInput, setCodeInput] = useState<string[]>([])
  const [listeningPhase, setListeningPhase] = useState(true)
  
  // Game 3: Reaction Time - Whack-a-Hamster
  const [hamsterHoles, setHamsterHoles] = useState<boolean[]>(Array(4).fill(false))
  const [hamsterScore, setHamsterScore] = useState(0)
  const [hamsterMisses, setHamsterMisses] = useState(0)
  const [hamsterTimer, setHamsterTimer] = useState(15)
  const [hamsterActive, setHamsterActive] = useState(true)
  const [hamsterGameEnded, setHamsterGameEnded] = useState(false)
  const [showHammer, setShowHammer] = useState(false)
  const [hammerPosition, setHammerPosition] = useState({ x: 0, y: 0 })
  const [hamsterHitIndex, setHamsterHitIndex] = useState<number | null>(null)
  const [currentHamsterId, setCurrentHamsterId] = useState<number>(-1)
  const hamsterIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hamsterHitRef = useRef<Set<number>>(new Set())
  const hamsterSessionRef = useRef(0)
  const hamsterScoreRef = useRef(0)
  const hamsterMissesRef = useRef(0)
  const hamsterFinalizedRef = useRef(false)
  const [hamsterStarted, setHamsterStarted] = useState(false)

  useEffect(() => {
  setHamsterStarted(false)
}, [currentGame])

  
  // Game 4: Attention & Impulse Control - Gem Collector
  const [gemTrials, setGemTrials] = useState<any[]>([])
  const [gemCurrentTrialIdx, setGemCurrentTrialIdx] = useState(0)
  const [gemCurrentStimulus, setGemCurrentStimulus] = useState<string | null>(null)
  const [gemCorrectClicks, setGemCorrectClicks] = useState(0)
  const [gemOmissionErrors, setGemOmissionErrors] = useState(0)
  const [gemCommissionErrors, setGemCommissionErrors] = useState(0)
  const [gemReactionTimes, setGemReactionTimes] = useState<number[]>([])
  const [gemScore, setGemScore] = useState(0)
  const [gemStartTime, setGemStartTime] = useState<number | null>(null)
  const [gemPerformanceByMinute, setGemPerformanceByMinute] = useState([
    { minute: 1, correct: 0, total: 0 },
    { minute: 2, correct: 0, total: 0 },
    { minute: 3, correct: 0, total: 0 }
  ])
  const [showGemFeedback, setShowGemFeedback] = useState({ type: "", show: false })
  const gemTrialStartTimeRef = useRef<number | null>(null)
  const gemGameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const gemCurrentTrialRef = useRef<any>(null)
  // FIXED: Add refs to track current values for gem game
  const gemCorrectClicksRef = useRef(0)
  const gemCommissionErrorsRef = useRef(0)
  const gemReactionTimesRef = useRef<number[]>([])
  const gemTrialsRef = useRef<any[]>([])
  const gemPerformanceRef = useRef([
    { minute: 1, correct: 0, total: 0 },
    { minute: 2, correct: 0, total: 0 },
    { minute: 3, correct: 0, total: 0 }
  ])
  
  // Game 5: Auditory Discrimination - Sound Detective
  const [soundPair, setSoundPair] = useState<{sound1: string; sound2: string; same: boolean}>({
    sound1: "",
    sound2: "",
    same: false
  })
  const [soundListeningPhase, setSoundListeningPhase] = useState(true)
  const [soundsPlayed, setSoundsPlayed] = useState(false)
  
  // Game 6: Reasoning - Detective Mystery
  const [mysteryClues, setMysteryClues] = useState<string[]>([])
  const [mysteryQuestion, setMysteryQuestion] = useState("")
  const [mysteryOptions, setMysteryOptions] = useState<string[]>([])
  const [mysteryAnswer, setMysteryAnswer] = useState("")
  
  const startTimeRef = useRef(0)
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const games = [
    {
      id: 1,
      name: "🏗️ Architect Builder",
      skill: "Visual-Spatial Memory",
      description: "Remember and recreate patterns you see!",
      color: "from-cyan-500 to-blue-600",
      icon: "🏗️",
      instructions: "Memorize the pattern, then rebuild it!",
      academicUse: "📚 Geometry, maps, diagrams, spatial reasoning",
      rounds: 3
    },
    {
      id: 2,
      name: "🕵️ Secret Agent Code Breaker",
      skill: "Working Memory + Processing",
      description: "Remember codes and enter them backwards!",
      color: "from-indigo-500 to-purple-600",
      icon: "🕵️",
      instructions: "Listen to the code, then enter it in REVERSE!",
      academicUse: "📚 Mental math, multi-step problems, reversing operations",
      rounds: 3
    },
    {
      id: 3,
      name: "🐹 Whack-a-Hamster",
      skill: "Reaction Time & Motor Speed",
      description: "Tap the hamsters as fast as they pop up!",
      color: "from-pink-500 to-rose-600",
      icon: "🐹",
      instructions: "Click the hamsters when they appear!",
      academicUse: "📚 Quick responses, hand-eye coordination, motor skills",
      rounds: 1
    },
    {
      id: 4,
      name: "💎 Gem Collector",
      skill: "Attention & Impulse Control",
      description: "Collect gems but avoid distractors!",
      color: "from-emerald-500 to-teal-600",
      icon: "💎",
      instructions: "Tap ONLY the gems when they appear. Don't tap anything else!",
      academicUse: "📚 Sustained attention, impulse control, vigilance in class",
      rounds: 1
    },
    {
      id: 5,
      name: "🔊 Sound Detective",
      skill: "Auditory Discrimination",
      description: "Detect if two sounds are the same or different!",
      color: "from-violet-500 to-purple-600",
      icon: "🔊",
      instructions: "Listen carefully to two sounds - are they the SAME or DIFFERENT?",
      academicUse: "📚 Speech perception, phoneme awareness, language development",
      rounds: 3
    },
    {
      id: 6,
      name: "🔍 Mystery Solver",
      skill: "Logical Reasoning",
      description: "Use logic clues to solve mysteries!",
      color: "from-slate-500 to-gray-700",
      icon: "🔍",
      instructions: "Analyze the clues and deduce the correct answer!",
      academicUse: "📚 Word problems, critical thinking, inference",
      rounds: 2
    }
  ]

  // ========== SPEECH CONTROL ==========
  
  const stopAllSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      speechUtteranceRef.current = null
    }
  }

  const speak = (text: string, onEnd?: () => void) => {
    stopAllSpeech()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      if (onEnd) utterance.onend = onEnd
      speechUtteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }

  const speakDigits = (digits: string[], onEnd?: () => void) => {
    stopAllSpeech()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      let i = 0
      const speakNext = () => {
        if (i < digits.length) {
          const utterance = new SpeechSynthesisUtterance(digits[i])
          utterance.rate = 0.8
          utterance.onend = () => {
            i++
            setTimeout(speakNext, 800)
          }
          speechUtteranceRef.current = utterance
          window.speechSynthesis.speak(utterance)
        } else {
          speechUtteranceRef.current = null
          onEnd && onEnd()
        }
      }
      speakNext()
    }
  }

  const speakWords = (words: string[], onEnd?: () => void) => {
    stopAllSpeech()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      let i = 0
      const speakNext = () => {
        if (i < words.length) {
          const utterance = new SpeechSynthesisUtterance(words[i])
          utterance.rate = 0.7  // Slower for better discrimination
          utterance.pitch = 1.0
          utterance.onend = () => {
            i++
            setTimeout(speakNext, 1200)  // Longer pause between words
          }
          speechUtteranceRef.current = utterance
          window.speechSynthesis.speak(utterance)
        } else {
          speechUtteranceRef.current = null
          onEnd && onEnd()
        }
      }
      speakNext()
    }
  }

  // ========== CLEANUP ==========
  
  const clearAllIntervals = () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current)
    if (hamsterIntervalRef.current) clearInterval(hamsterIntervalRef.current)
    if (gemGameIntervalRef.current) clearInterval(gemGameIntervalRef.current)
  }

  useEffect(() => {
    return () => {
      stopAllSpeech()
      clearAllIntervals()
    }
  }, [])

  // FIXED: Update gem timer to use refs for current values
  useEffect(() => {
    if (currentGame === 3 && gemStartTime && gemTrials.length > 0) {
      console.log("=== GEM TIMER STARTED ===")
      console.log("Start time:", gemStartTime, "Trials:", gemTrials.length)
      
      const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gemStartTime) / 1000)
        if (elapsed >= 100) {
          console.log("=== 100 SECONDS ELAPSED - COMPLETING GAME ===")
          console.log("Ref values being passed:")
          console.log("- trials:", gemTrialsRef.current.length)
          console.log("- correctClicks:", gemCorrectClicksRef.current)
          console.log("- commissionErrors:", gemCommissionErrorsRef.current)
          console.log("- reactionTimes:", gemReactionTimesRef.current.length)
          
          clearInterval(timerInterval)
          if (gemGameIntervalRef.current) clearInterval(gemGameIntervalRef.current)
          gemGameIntervalRef.current = null
          
          // Use ref values instead of stale state
          handleGemGameComplete(
            gemTrialsRef.current,
            gemCorrectClicksRef.current,
            gemCommissionErrorsRef.current,
            gemReactionTimesRef.current,
            gemPerformanceRef.current,
            gemStartTime
          )
        }
      }, 1000)
      
      gemGameIntervalRef.current = timerInterval
      
      return () => {
        clearInterval(timerInterval)
        if (gemGameIntervalRef.current === timerInterval) {
          gemGameIntervalRef.current = null
        }
      }
    }
  }, [currentGame, gemStartTime, gemTrials.length])

  // ========== GAME DATA GENERATORS ==========
  
  const generateArchitectPattern = (round: number) => {
    // Guaranteed progressive difficulty
    // Round 0 (Easy): 3 columns × 3 rows = 9 cells, 40% filled
    // Round 1 (Medium): 4 columns × 3 rows = 12 cells, 50% filled
    // Round 2 (Hard): 5 columns × 5 rows = 25 cells, 50% filled
    let rows, cols, fillRate
    
    if (round === 0) {
      rows = 3
      cols = 3
      fillRate = 0.4  // About 3-4 blocks filled
    } else if (round === 1) {
      rows = 3
      cols = 4
      fillRate = 0.5  // About 6 blocks filled
    } else {
      rows = 5
      cols = 5
      fillRate = 0.5  // About 12-13 blocks filled
    }
    
    const pattern: number[][] = []
    const totalCells = rows * cols
    const targetFilled = Math.floor(totalCells * fillRate)
    
    // Create empty grid
    for (let i = 0; i < rows; i++) {
      const row = []
      for (let j = 0; j < cols; j++) {
        row.push(0)
      }
      pattern.push(row)
    }
    
    // Fill random cells to meet target
    let filled = 0
    while (filled < targetFilled) {
      const r = Math.floor(Math.random() * rows)
      const c = Math.floor(Math.random() * cols)
      if (pattern[r][c] === 0) {
        pattern[r][c] = 1
        filled++
      }
    }
    
    return pattern
  }

  const generateCodeSequence = (round: number): string[] => {
    // Round 0: 3 digits
    // Round 1: 4 digits
    // Round 2: 5 digits
    // All digits must be unique (no repeats)
    const length = 3 + round
    const digits = []
    const usedDigits = new Set<string>()
    
    while (digits.length < length) {
      const newDigit = Math.floor(Math.random() * 10).toString()
      if (!usedDigits.has(newDigit)) {
        digits.push(newDigit)
        usedDigits.add(newDigit)
      }
    }
    
    return digits
  }

  const generateSoundPair = (round: number): {sound1: string; sound2: string; same: boolean} => {
    // Clinical phoneme pairs - minimal pairs testing auditory discrimination
    const phonemePairs = [
      // Easy (Round 0): Similar ending sounds
      { pair: ["cat", "bat"], difficulty: 0 },
      { pair: ["sun", "fun"], difficulty: 0 },
      { pair: ["pen", "ten"], difficulty: 0 },
      { pair: ["lake", "lake"], difficulty: 0, same: true },
      { pair: ["mad", "bad"], difficulty: 0 },
      { pair: ["hop", "pop"], difficulty: 0 },
      
      // Medium (Round 1): Minimal pairs - single phoneme difference
      { pair: ["bat", "pat"], difficulty: 1 },
      { pair: ["pin", "bin"], difficulty: 1 },
      { pair: ["ship", "chip"], difficulty: 1 },
      { pair: ["rake", "rake"], difficulty: 1, same: true },
      { pair: ["fan", "van"], difficulty: 1 },
      { pair: ["coat", "goat"], difficulty: 1 },
      
      // Hard (Round 2): Very subtle phonetic differences (voicing)
      { pair: ["den", "ten"], difficulty: 2 },
      { pair: ["gate", "Kate"], difficulty: 2 },
      { pair: ["sip", "zip"], difficulty: 2 },
      { pair: ["rice", "rice"], difficulty: 2, same: true },
      { pair: ["pear", "bear"], difficulty: 2 },
      { pair: ["pie", "buy"], difficulty: 2 }
    ]
    
    const validPairs = phonemePairs.filter(p => p.difficulty === round)
    const selected = validPairs[Math.floor(Math.random() * validPairs.length)]
    
    // 40% chance of same sounds
    const isSame = selected.same || Math.random() < 0.4
    
    return {
      sound1: selected.pair[0],
      sound2: isSame ? selected.pair[0] : selected.pair[1],
      same: isSame
    }
  }

  const finalizeHamsterGame = () => {
    if (hamsterFinalizedRef.current) return
    hamsterFinalizedRef.current = true
    stopAllSpeech()
    clearAllIntervals()

    const total = hamsterScoreRef.current + hamsterMissesRef.current
    const accuracy = total > 0 ? hamsterScoreRef.current / total : 0
    const correct = accuracy > 0.6
    const score = Math.round(accuracy * 100)
    const time = (Date.now() - startTimeRef.current) / 1000

    setCognitiveScores(prev => ({
      ...prev,
      reactionTime: prev.reactionTime + (correct ? score : score * 0.3)
    }))

    setGameResults(prev => [...prev, {
      game: currentGame,
      question: currentQuestion,
      correct,
      time,
      difficulty: currentQuestion
    }])

    setFeedback({
      correct,
      message: correct ? "🎉 Great reactions!" : "💪 Keep practicing!"
    })

    setTimeout(() => {
      const nextGame = currentGame + 1
      if (nextGame < games.length) {
        setCurrentGame(nextGame)
        setCurrentQuestion(0)
        setupGame(nextGame, 0)
      } else {
        normalizeAndFinish()
      }
    }, 2000)
  }

  const startHamsterGame = () => {
    let timeLeft = 15
    let hamsterCount = 0
    let lastHole = -1
    let holeSequence: number[] = []
    let gameEnded = false

    if (hamsterIntervalRef.current) {
      clearInterval(hamsterIntervalRef.current)
      hamsterIntervalRef.current = null
    }

    hamsterSessionRef.current += 1
    const sessionId = hamsterSessionRef.current

    setHamsterActive(true)
    setHamsterGameEnded(false)
    hamsterHitRef.current = new Set()
    hamsterScoreRef.current = 0
    hamsterMissesRef.current = 0
    setHamsterTimer(15)

    hamsterIntervalRef.current = setInterval(() => {
      // Check if this session is still valid
      if (sessionId !== hamsterSessionRef.current || gameEnded || timeLeft <= 0) {
        if (hamsterIntervalRef.current) {
          clearInterval(hamsterIntervalRef.current)
          hamsterIntervalRef.current = null
        }
        return
      }

      let randomHole = Math.floor(Math.random() * 4)

      const allowSameHole = Math.random() < 0.3
      if (!allowSameHole && randomHole === lastHole) {
        randomHole = (lastHole + 1 + Math.floor(Math.random() * 3)) % 4
      }

      holeSequence.push(randomHole)
      if (holeSequence.length > 5) holeSequence.shift()
      lastHole = randomHole

      const newHamsterId = hamsterCount
      hamsterCount++
      setCurrentHamsterId(newHamsterId)

      setHamsterHoles(() => {
        const newHoles = Array(4).fill(false)
        newHoles[randomHole] = true
        return newHoles
      })

      const elapsedTime = 15 - timeLeft
      const visibilityTime = Math.max(800, 1000 - elapsedTime * 10)

      const timeoutId = setTimeout(() => {
        if (sessionId !== hamsterSessionRef.current || gameEnded) return

        const wasHit = hamsterHitRef.current.has(newHamsterId)
        if (!wasHit) {
          hamsterMissesRef.current += 1
          setHamsterMisses(m => m + 1)
        } else {
          hamsterHitRef.current.delete(newHamsterId)
        }

        setHamsterHoles(prev => {
          if (prev[randomHole]) {
            return Array(4).fill(false)
          }
          return prev
        })
        setCurrentHamsterId(-1)
      }, visibilityTime)

      timeLeft -= 1
      setHamsterTimer(timeLeft)

      if (timeLeft <= 0) {
        gameEnded = true
        setHamsterGameEnded(true)
        if (hamsterIntervalRef.current) {
          clearInterval(hamsterIntervalRef.current)
          hamsterIntervalRef.current = null
        }
        clearTimeout(timeoutId)
        setHamsterActive(false)
        setHamsterHoles(Array(4).fill(false))
        setCurrentHamsterId(-1)

        setTimeout(() => {
          if (sessionId !== hamsterSessionRef.current) return
          finalizeHamsterGame()
        }, 500)
      }
    }, 1500)
  }

  const startGemGame = () => {
    const trials = generateGemSequence()
    setGemTrials(trials)
    gemTrialsRef.current = trials // FIXED: Store in ref
    
    const startTime = Date.now()
    setGemStartTime(startTime)
    setGemCurrentTrialIdx(0)
    setGemCorrectClicks(0)
    setGemOmissionErrors(0)
    setGemCommissionErrors(0)
    setGemReactionTimes([])
    setGemScore(0)
    setGemPerformanceByMinute([
      { minute: 1, correct: 0, total: 0 },
      { minute: 2, correct: 0, total: 0 },
      { minute: 3, correct: 0, total: 0 }
    ])
    
    // FIXED: Reset refs
    gemCorrectClicksRef.current = 0
    gemCommissionErrorsRef.current = 0
    gemReactionTimesRef.current = []
    gemPerformanceRef.current = [
      { minute: 1, correct: 0, total: 0 },
      { minute: 2, correct: 0, total: 0 },
      { minute: 3, correct: 0, total: 0 }
    ]
    
    gemTrialStartTimeRef.current = null
    
    let trialIdx = 0
    const presentTrial = () => {
      // Check if 100 seconds have elapsed
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (elapsed >= 100) {
        console.log("=== 100 SECONDS ELAPSED - COMPLETING GAME ===")
        handleGemGameComplete(
          gemTrialsRef.current,
          gemCorrectClicksRef.current,
          gemCommissionErrorsRef.current,
          gemReactionTimesRef.current,
          gemPerformanceRef.current,
          startTime
        )
        return
      }
      
      if (trialIdx >= trials.length) {
        console.log("=== PRESENT TRIAL: All trials completed, completing game ===")
        handleGemGameComplete(
          gemTrialsRef.current,
          gemCorrectClicksRef.current,
          gemCommissionErrorsRef.current,
          gemReactionTimesRef.current,
          gemPerformanceRef.current,
          startTime
        )
        return
      }
      
      const trial = trials[trialIdx]
      gemCurrentTrialRef.current = trial
      
      setGemCurrentStimulus(trial.stimulus)
      gemTrialStartTimeRef.current = Date.now()
      
      setTimeout(() => {
        setGemCurrentStimulus(null)
        
        if (trial.type === "target" && !trial.clicked) {
          setGemOmissionErrors(e => e + 1)
        }
        
        trialIdx++
        
        setTimeout(presentTrial, 1500)
      }, 2000)
    }
    
    // Add 3-second initial delay before first gem appears
    setTimeout(presentTrial, 3000)
  }

  const generateGemSequence = () => {
    const numTrials = 51
    const targetPercentage = 0.30
    const numTargets = Math.floor(numTrials * targetPercentage)
    const numDistractors = numTrials - numTargets
    
    const distractors = ["💠", "🔷", "🔹", "⭐", "✨"]
    const trials = []
    
    for (let i = 0; i < numTargets; i++) {
      trials.push({ type: "target", stimulus: "💎", timeMs: 0, clicked: false })
    }
    
    for (let i = 0; i < numDistractors; i++) {
      const distractor = distractors[Math.floor(Math.random() * distractors.length)]
      trials.push({ type: "distractor", stimulus: distractor, timeMs: 0, clicked: false })
    }
    
    for (let i = trials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trials[i], trials[j]] = [trials[j], trials[i]]
    }
    
    let cumulativeTime = 0
    for (let i = 0; i < trials.length; i++) {
      trials[i].timeMs = cumulativeTime
      cumulativeTime += 3500
    }
    
    return trials
  }

  const generateMystery = (difficulty: number) => {
    const mysteries = [
      {
        clues: [
          "🔍 There are chocolate crumbs on the floor",
          "👣 Small footprints lead to the backyard",
          "🐕 The dog has chocolate on its nose",
          "😊 The dog looks very happy"
        ],
        question: "Who ate the cake?",
        options: ["🐕 The Dog", "🐱 The Cat", "👦 The Boy", "👧 The Girl"],
        answer: "🐕 The Dog"
      },
      {
        clues: [
          "⚽ A soccer ball is near the broken window",
          "👟 Muddy footprints outside",
          "🎮 Tom was playing video games inside",
          "⚽ Sarah was playing soccer in the yard"
        ],
        question: "Who broke the window?",
        options: ["Tom", "Sarah", "The Wind", "A Bird"],
        answer: "Sarah"
      },
      {
        clues: [
          "📚 The library book is wet",
          "☔ It was raining yesterday",
          "🎒 Amy's backpack has a hole in it",
          "😟 Amy looked worried this morning"
        ],
        question: "Why is the book wet?",
        options: ["Someone spilled water", "Rain got through the hole", "The book fell in a puddle", "The sprinkler hit it"],
        answer: "Rain got through the hole"
      },
      {
        clues: [
          "🍪 The cookie jar is empty",
          "🪜 A chair is under the kitchen cabinet",
          "😋 Max has cookie crumbs on his shirt",
          "🚫 Max said he didn't eat any cookies"
        ],
        question: "Who took the cookies?",
        options: ["Max", "The cat", "Nobody", "Mom"],
        answer: "Max"
      }
    ]
    return mysteries[currentQuestion % mysteries.length]
  }

  // ========== GAME SETUP ==========
  
  const startGames = () => {
    setStage("games")
    setCurrentGame(0)
    setCurrentQuestion(0)
    setupGame(0, 0)
  }

  const setupGame = (gameIdx: number, questionIdx: number) => {
    stopAllSpeech()
    clearAllIntervals()
    setFeedback(null)
    startTimeRef.current = Date.now()
    
    // Reset all game states
    setArchitectBuilt([])
    setShowPattern(true)
    setCodeInput([])
    setListeningPhase(true)
    setHamsterHoles(Array(4).fill(false))
    setHamsterScore(0)
    setHamsterMisses(0)
    hamsterScoreRef.current = 0
    hamsterMissesRef.current = 0
    setHamsterTimer(15)
    setHamsterGameEnded(false)
    hamsterFinalizedRef.current = false
    setCurrentHamsterId(-1)
    setGemTrials([])
    setGemCurrentTrialIdx(0)
    setGemCurrentStimulus(null)
    setGemCorrectClicks(0)
    setGemOmissionErrors(0)
    setGemCommissionErrors(0)
    setGemReactionTimes([])
    setGemScore(0)
    setGemStartTime(null)
    setSoundPair({ sound1: "", sound2: "", same: false })
    setSoundListeningPhase(true)
    setSoundsPlayed(false)
    
    switch(gameIdx) {
      case 0: // Visual-Spatial - Architect Builder
        const pattern = generateArchitectPattern(questionIdx)
        setArchitectPattern(pattern)
        const emptyBuilt = pattern.map(row => row.map(() => 0))
        setArchitectBuilt(emptyBuilt)
        setTimeout(() => setShowPattern(false), 3000)
        break
        
      case 1: // Working Memory - Secret Agent Code Breaker
        const code = generateCodeSequence(questionIdx)
        setCodeSequence(code)
        setTimeout(() => speakDigits(code, () => setListeningPhase(false)), 500)
        break
        
      case 2: // Reaction Time - Hamster Game
        startHamsterGame()
        break
        
      case 3: // Attention & Impulse Control - Gem Collector
        startGemGame()
        break
        
      case 4: // Auditory Discrimination - Sound Detective
        const pair = generateSoundPair(questionIdx)
        setSoundPair(pair)
        setSoundsPlayed(false)
        setTimeout(() => {
          speakWords([pair.sound1], () => {
            setTimeout(() => {
              speakWords([pair.sound2], () => {
                setSoundListeningPhase(false)
                setSoundsPlayed(true)
              })
            }, 600)
          })
        }, 500)
        break
        
      case 5: // Reasoning - Detective Mystery
        const mystery = generateMystery(questionIdx)
        setMysteryClues(mystery.clues)
        setMysteryQuestion(mystery.question)
        setMysteryOptions(mystery.options)
        setMysteryAnswer(mystery.answer)
        break
    }
  }

  // ========== ANSWER CHECKING ==========
  
  const handleGemGameComplete = (trials: any[], correctClicks: number, commissionErrors: number, reactionTimes: number[], performancePerMinute: any[], startTime: number | null) => {
    console.log("=== GEM GAME COMPLETE ===")
    console.log("Trials:", trials.length, "Correct Clicks:", correctClicks, "Commission Errors:", commissionErrors)
    console.log("Ref values - correctClicks:", gemCorrectClicksRef.current, "commissionErrors:", gemCommissionErrorsRef.current)
    
    // Calculate how many trials were actually presented based on time elapsed
    const timeElapsed = startTime ? (Date.now() - startTime) / 1000 : 0
    const trialsPerSecond = 1 / 3.5 // Each trial takes 3.5 seconds (2s showing + 1.5s gap)
    const maxTrialsPresented = Math.min(Math.floor(timeElapsed * trialsPerSecond), trials.length)
    
    // Only count targets that were actually presented
    const presentedTrials = trials.slice(0, maxTrialsPresented)
    const totalTargets = presentedTrials.filter(t => t.type === "target").length
    const totalDistractors = presentedTrials.filter(t => t.type === "distractor").length
    
    console.log("Time elapsed:", timeElapsed, "s")
    console.log("Trials presented:", maxTrialsPresented, "of", trials.length)
    console.log("Targets presented:", totalTargets, "Total Distractors:", totalDistractors)
    
    const accuracy = totalTargets > 0 ? (correctClicks / totalTargets) * 100 : 0
    console.log("Calculated Accuracy:", accuracy, "=", correctClicks, "/", totalTargets, "* 100")
    const correct = accuracy >= 70 && commissionErrors < 10
    
    let avgRT = 0
    let rtVariability = 0
    if (reactionTimes.length > 0) {
      avgRT = reactionTimes.reduce((a: number, b: number) => a + b, 0) / reactionTimes.length
      const variance = reactionTimes.reduce((sum: number, rt: number) => sum + Math.pow(rt - avgRT, 2), 0) / reactionTimes.length
      rtVariability = Math.sqrt(variance)
    }
    
    const consistency = rtVariability < 200 ? "High" : rtVariability < 350 ? "Medium" : "Low"
    
    const totalTime = (Date.now() - (startTime || Date.now())) / 1000
    let updatedPerformance = [
      { minute: 1, correct: 0, total: 0 },
      { minute: 2, correct: 0, total: 0 },
      { minute: 3, correct: 0, total: 0 }
    ]
    
    // Only count presented trials for performance metrics
    presentedTrials.forEach(trial => {
      const minute = Math.floor(trial.timeMs / 60000)
      if (minute < 3) {
        updatedPerformance[minute].total++
        if (trial.type === "target" && trial.clicked) {
          updatedPerformance[minute].correct++
        }
      }
    })
    
    setGemPerformanceByMinute(updatedPerformance)
    
    const m1Acc = updatedPerformance[0].total > 0 ? updatedPerformance[0].correct / updatedPerformance[0].total : 0
    const m3Acc = updatedPerformance[2].total > 0 ? updatedPerformance[2].correct / updatedPerformance[2].total : 0
    const trend = m3Acc < m1Acc * 0.8 ? "Declining" : "Steady"
    
    setFeedback({
      correct,
      message: correct ? "🎉 Great attention!" : "💪 Keep practicing!",
      gemMetrics: {
        accuracy: Math.round(accuracy),
        omissionErrors: totalTargets - correctClicks,
        commissionErrors: commissionErrors,
        avgReactionTime: Math.round(avgRT),
        consistency,
        trend,
        performanceByMinute: updatedPerformance
      }
    })
    
    const points = Math.min(100, Math.round(accuracy))
    console.log("=== CALLING checkAnswer ===")
    console.log("Correct:", correct, "Skill: attention, Points:", points)
    checkAnswer(correct, "attention", points)
  }

  const handleGemStimulus = (stimulus: string | null) => {
    if (stimulus === null) return
    
    const isTarget = stimulus === "💎"
    const isCorrectClick = isTarget
    const rt = gemTrialStartTimeRef.current ? Date.now() - gemTrialStartTimeRef.current : 0
    
    console.log("=== GEM CLICK ===")
    console.log("Stimulus:", stimulus, "Is Target:", isTarget, "Is Correct:", isCorrectClick)
    console.log("Before update - correctClicks:", gemCorrectClicksRef.current, "commissionErrors:", gemCommissionErrorsRef.current)
    
    if (gemCurrentTrialRef.current) {
      gemCurrentTrialRef.current.clicked = true
      
      // FIXED: Update the trial in both state and ref
      setGemTrials(prevTrials => {
        const updated = prevTrials.map((trial, idx) => {
          if (trial === gemCurrentTrialRef.current) {
            return { ...trial, clicked: true }
          }
          return trial
        })
        gemTrialsRef.current = updated // FIXED: Update ref
        return updated
      })
    }
    
    if (isCorrectClick) {
      setGemCorrectClicks(c => {
        const newVal = c + 1
        gemCorrectClicksRef.current = newVal // FIXED: Update ref
        console.log("Updated correctClicks:", c, "->", newVal, "(ref:", gemCorrectClicksRef.current, ")")
        return newVal
      })
      setGemScore(s => s + 5)
      setGemReactionTimes(rts => {
        const newRts = [...rts, rt]
        gemReactionTimesRef.current = newRts // FIXED: Update ref
        return newRts
      })
      
      setShowGemFeedback({ type: "correct", show: true })
      setTimeout(() => setShowGemFeedback({ type: "", show: false }), 300)
    } else {
      setGemCommissionErrors(e => {
        const newVal = e + 1
        gemCommissionErrorsRef.current = newVal // FIXED: Update ref
        console.log("Updated commissionErrors:", e, "->", newVal, "(ref:", gemCommissionErrorsRef.current, ")")
        return newVal
      })
      setGemScore(s => s - 2)
      
      setShowGemFeedback({ type: "error", show: true })
      setTimeout(() => setShowGemFeedback({ type: "", show: false }), 300)
      
      if ("vibrate" in navigator) {
        navigator.vibrate(100)
      }
    }
    
    console.log("After update - correctClicks:", gemCorrectClicksRef.current, "commissionErrors:", gemCommissionErrorsRef.current)
  }

  const checkAnswer = (correct: boolean, skillKey: keyof CognitiveProfile, score: number) => {
    console.log("CHECK ANSWER - Skill:", skillKey, "Score:", score, "Correct:", correct)
    stopAllSpeech()
    clearAllIntervals()
    const time = (Date.now() - startTimeRef.current) / 1000
    
    if (currentGame === 1 && correct) {
      setShowUnlockAnimation(true)
      setTimeout(() => setShowUnlockAnimation(false), 2000)
    }
    
    // Add score to running total
    setCognitiveScores(prev => {
      const updated = {
        ...prev,
        [skillKey]: prev[skillKey] + score
      }
      console.log("Updated cognitive scores:", updated)
      return updated
    })
    
    setGameResults(prev => [...prev, {
      game: currentGame,
      question: currentQuestion,
      correct,
      time,
      difficulty: currentQuestion
    }])
    
    setFeedback({
      correct,
      message: correct ? "🎉 Perfect!" : "💪 Good try! Keep going!"
    })
    
    setTimeout(() => {
      const maxRounds = games[currentGame].rounds
      
      if (currentQuestion < maxRounds - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setupGame(currentGame, currentQuestion + 1)
      } else if (currentGame < games.length - 1) {
        setCurrentGame(currentGame + 1)
        setCurrentQuestion(0)
        setupGame(currentGame + 1, 0)
      } else {
        normalizeAndFinish()
      }
    }, 2000)
  }

  const saveReportToBackend = async () => {
    try {
      const reportData = {
        name,
        age,
        date: new Date().toISOString(),
        cognitiveScores
      }

      const response = await fetch('/api/save-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        console.error('Failed to save report:', await response.text())
      } else {
        console.log('Report saved successfully')
      }
    } catch (error) {
      console.error('Error saving report:', error)
    }
  }

  const normalizeAndFinish = () => {
    stopAllSpeech()
    clearAllIntervals()
    
    // Average scores for multi-round games
    // Game indices: 0=Visual(3), 1=Working(3), 2=Reaction(1), 3=Attention(1), 4=Audio(3), 5=Reasoning(2)
    const skillKeys: (keyof CognitiveProfile)[] = [
      "visualSpatial", "workingMemory", "reactionTime", "attention",
      "auditoryProcessing", "reasoning"
    ]
    
    const normalized: CognitiveProfile = {
      visualSpatial: 0,
      workingMemory: 0,
      reactionTime: 0,
      attention: 0,
      auditoryProcessing: 0,
      reasoning: 0
    }
    
    skillKeys.forEach((skill, idx) => {
      const game = games[idx]
      const rounds = game.rounds
      const total = cognitiveScores[skill]
      
      // Average if multiple rounds, otherwise use as-is
      const finalScore = rounds > 1 ? Math.round(total / rounds) : total
      normalized[skill] = Math.min(100, Math.max(0, finalScore))
      
      console.log(`${skill}: total=${total}, rounds=${rounds}, final=${normalized[skill]}`)
    })
    
    console.log("Final normalized scores:", normalized)
    setCognitiveScores(normalized)
    setStage("profile")
  }

  const skipCurrentTest = () => {
    stopAllSpeech()
    clearAllIntervals()
    
    const skillKeys: (keyof CognitiveProfile)[] = [
      "visualSpatial", "workingMemory", "reactionTime", "attention",
      "auditoryProcessing", "reasoning"
    ]
    
    const currentSkill = skillKeys[currentGame]
    
    console.log("=== SKIP TEST ===")
    console.log("Current game:", currentGame, "Skill:", currentSkill)
    
    // No partial credit for any skipped tests - give 0 points
    setCognitiveScores(prev => ({
      ...prev,
      [currentSkill]: prev[currentSkill] + 0
    }))
    
    setGameResults(prev => [...prev, {
      game: currentGame,
      question: currentQuestion,
      correct: false,
      time: 0,
      difficulty: currentQuestion
    }])
    
    const maxRounds = games[currentGame].rounds
    
    // Add delay to ensure speech is fully stopped before next game
    setTimeout(() => {
      if (currentQuestion < maxRounds - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setupGame(currentGame, currentQuestion + 1)
      } else if (currentGame < games.length - 1) {
        setCurrentGame(currentGame + 1)
        setCurrentQuestion(0)
        setupGame(currentGame + 1, 0)
      } else {
        normalizeAndFinish()
      }
    }, 300)
  }

  // ========== GAME HANDLERS ==========
  
  const handleArchitectToggle = (row: number, col: number) => {
    setArchitectBuilt(prev => {
      const newBuilt = prev.map(r => [...r])
      newBuilt[row][col] = newBuilt[row][col] === 1 ? 0 : 1
      return newBuilt
    })
  }

  const handleArchitectSubmit = () => {
    const correct = architectPattern.every((row, i) =>
      row.every((cell, j) => cell === architectBuilt[i][j])
    )
    checkAnswer(correct, "visualSpatial", 100)
  }

  const handleCodeDigit = (digit: string) => {
    const newInput = [...codeInput, digit]
    setCodeInput(newInput)
    
    if (newInput.length === codeSequence.length) {
      const reversed = [...codeSequence].reverse()
      const correct = newInput.join("") === reversed.join("")
      checkAnswer(correct, "workingMemory", 100)
    }
  }

  const handleHamsterClick = (index: number, e: React.MouseEvent) => {
    if (hamsterHoles[index] && currentHamsterId >= 0) {
      hamsterScoreRef.current += 1
      setHamsterScore(prev => prev + 1)
      hamsterHitRef.current.add(currentHamsterId)
      setHamsterHitIndex(index)
      setHamsterHoles(prev => {
        const newHoles = [...prev]
        newHoles[index] = false
        return newHoles
      })
      
      setHammerPosition({ x: e.clientX, y: e.clientY })
      setShowHammer(true)
      setTimeout(() => setShowHammer(false), 300)
      setTimeout(() => setHamsterHitIndex(null), 350)
    }
  }

  const handleSoundDiscrimination = (userAnswer: "same" | "different") => {
    const correct = (userAnswer === "same" && soundPair.same) || (userAnswer === "different" && !soundPair.same)
    const actualAnswer = soundPair.same ? "SAME" : "DIFFERENT"
    
    setFeedback({
      correct,
      message: correct 
        ? `🎉 Correct! The sounds were ${actualAnswer}\n\n🔊 Sound 1: "${soundPair.sound1}"\n🔊 Sound 2: "${soundPair.sound2}"`
        : `💪 Not quite! The sounds were ${actualAnswer}\n\n🔊 Sound 1: "${soundPair.sound1}"\n🔊 Sound 2: "${soundPair.sound2}"`
    })
    
    // Wait 3 seconds so user can read the words, then advance without changing feedback
    setTimeout(() => {
      stopAllSpeech()
      clearAllIntervals()
      const time = (Date.now() - startTimeRef.current) / 1000
      
      setCognitiveScores(prev => ({
        ...prev,
        auditoryProcessing: prev.auditoryProcessing + (correct ? 100 : 30)
      }))
      
      setGameResults(prev => [...prev, {
        game: currentGame,
        question: currentQuestion,
        correct,
        time,
        difficulty: currentQuestion
      }])
      
      setTimeout(() => {
        const maxRounds = games[currentGame].rounds
        if (currentQuestion < maxRounds - 1) {
          setCurrentQuestion(currentQuestion + 1)
          setupGame(currentGame, currentQuestion + 1)
        } else if (currentGame < games.length - 1) {
          setCurrentGame(currentGame + 1)
          setCurrentQuestion(0)
          setupGame(currentGame + 1, 0)
        } else {
          normalizeAndFinish()
        }
      }, 1000)
    }, 3000)
  }

  const handleMysteryAnswer = (answer: string) => {
    const correct = answer === mysteryAnswer
    checkAnswer(correct, "reasoning", 100)
  }

  // ========== RENDER GAMES ==========
  
  const renderGame = () => {
    switch(currentGame) {
      case 0: // Visual-Spatial - Architect Builder
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-2">🏗️</div>
              <h3 className="text-xl md:text-2xl font-bold">
                {showPattern ? "Memorize this pattern!" : "Recreate the pattern!"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Level {currentQuestion + 1}: {architectPattern.length}×{architectPattern[0]?.length || 0} grid
              </p>
            </div>
            
            {showPattern ? (
              <div className="bg-cyan-100 p-4 rounded-xl flex justify-center items-center h-[calc(100vh-320px)] min-h-[500px]">
                <div className="grid gap-3 w-full h-full max-w-[95vw]" style={{ 
                  gridTemplateColumns: `repeat(${architectPattern[0]?.length || 3}, 1fr)`,
                  gridTemplateRows: `repeat(${architectPattern.length}, 1fr)`
                }}>
                  {architectPattern.map((row, i) => (
                    row.map((cell, j) => (
                      <div
                        key={`${i}-${j}`}
                        className={`rounded-lg ${cell === 1 ? 'bg-blue-600' : 'bg-white'} w-full h-full`}
                      />
                    ))
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-cyan-100 p-4 rounded-xl flex justify-center items-center h-[calc(100vh-320px)] min-h-[500px]">
                  <div className="grid gap-3 w-full h-full max-w-[95vw]" style={{ 
                    gridTemplateColumns: `repeat(${architectBuilt[0]?.length || 3}, 1fr)`,
                    gridTemplateRows: `repeat(${architectBuilt.length}, 1fr)`
                  }}>
                    {architectBuilt.map((row, i) => (
                      row.map((cell, j) => (
                        <button
                          key={`${i}-${j}`}
                          onClick={() => handleArchitectToggle(i, j)}
                          disabled={!!feedback}
                          className={`rounded-lg transition ${
                            cell === 1 ? 'bg-blue-600' : 'bg-white'
                          } hover:scale-105 active:scale-95 w-full h-full`}
                        />
                      ))
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleArchitectSubmit}
                  disabled={!!feedback}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-xl text-xl font-bold"
                >
                  Check Pattern
                </button>
              </div>
            )}
          </div>
        )
        
      case 1: // Working Memory - Secret Agent Code Breaker
        return (
          <div className="space-y-6">
            {showUnlockAnimation ? (
              <div className="text-center space-y-6 py-12">
                <div className="text-9xl animate-bounce">💼</div>
                <div className="relative">
                  <div className="text-6xl animate-pulse">🔓</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-green-600 animate-pulse">
                  ✨ CODE CRACKED! ✨
                </h3>
              </div>
            ) : listeningPhase ? (
              <div className="text-center space-y-4">
                <div className="text-8xl">🕵️</div>
                <h3 className="text-2xl font-bold">Listen to the Secret Code...</h3>
                <div className="animate-pulse text-4xl">🔊</div>
                <p className="text-lg text-slate-600">Level {currentQuestion + 1}: {codeSequence.length} digits</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-7xl mb-4">💼</div>
                  <h3 className="text-2xl font-bold mb-2">Enter Code in REVERSE!</h3>
                  <p className="text-lg text-slate-600 mb-4">Level {currentQuestion + 1}: {codeSequence.length} digits</p>
                  <div className="bg-indigo-100 rounded-xl p-6 mb-4 border-4 border-indigo-300">
                    <p className="text-5xl font-mono tracking-widest text-indigo-900">
                      {codeInput.length > 0 
                        ? codeInput.map((d, i) => <span key={i} className="inline-block mx-1">{d}</span>)
                        : Array(codeSequence.length).fill("_").map((_, i) => (
                          <span key={i} className="inline-block mx-1 text-indigo-300">_</span>
                        ))
                      }
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-3">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(digit => (
                    <button
                      key={digit}
                      onClick={() => handleCodeDigit(digit)}
                      disabled={!!feedback || codeInput.length >= codeSequence.length}
                      className="aspect-square bg-indigo-600 text-white text-3xl font-bold rounded-xl hover:bg-indigo-700 hover:scale-105 transition disabled:opacity-50"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setCodeInput([])}
                    disabled={!!feedback}
                    className="flex-1 border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition"
                  >
                    🔄 Clear
                  </button>
                  <button
                    onClick={() => {
                      setListeningPhase(true)
                      setCodeInput([])
                      setTimeout(() => speakDigits(codeSequence, () => setListeningPhase(false)), 500)
                    }}
                    disabled={!!feedback}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                  >
                    🔊 Hear Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )
        
      case 2: // Whack-a-Hamster
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🐹🔨</div>
              <h3 className="text-2xl font-bold">Whack the Hamsters!</h3>
              <div className="text-4xl font-bold text-pink-600">⏱️ {hamsterTimer}s</div>
              <div className="text-lg">Score: {hamsterScore} | Missed: {hamsterMisses}</div>
            </div>
            
            <div className="relative">
              <div
                className="w-full h-[500px] rounded-xl p-8 relative overflow-hidden bg-cover bg-center flex items-end justify-center"
                style={{ 
                  backgroundImage: "url(/bg2.png)",
                  cursor: "url(/hammer.png) 16 16, auto"
                }}
              >
                <div className="grid grid-cols-4 gap-16 mb-10">
                  {hamsterHoles.map((hasHamster, index) => (
                    <button
                      key={index}
                      onClick={(e) => handleHamsterClick(index, e)}
                      disabled={!hamsterActive}
                      className="relative w-[140px] h-[140px] bg-transparent border-none outline-none p-0 flex items-end justify-center"
                      style={{ cursor: "url(/hammer.png) 16 16, auto" }}
                    >
                      <div
                        className="absolute bottom-0 w-full h-full bg-center bg-no-repeat bg-contain"
                        style={{ backgroundImage: "url(/hole.png)" }}
                      />

                      {hasHamster && (
                        <img
                          src="/hamster.png"
                          alt="hamster"
                          className={`absolute bottom-[25px] w-[150px] max-w-none right-[0px] h-auto transition-transform duration-200 ${hamsterHitIndex === index ? 'scale-125' : ''}`}
                          style={{ objectFit: "contain" }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {showHammer && (
                  <div
                    className="fixed pointer-events-none z-50"
                    style={{ left: hammerPosition.x - 40, top: hammerPosition.y - 40 }}
                  >
                    <Image
                      src="/hammer.png"
                      alt="Hammer"
                      width={80}
                      height={80}
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        
      case 3: // Gem Collector
        const gemElapsedTime = gemStartTime ? Math.floor((Date.now() - gemStartTime) / 1000) : 0
        const gemTimeRemaining = Math.max(0, 100 - gemElapsedTime)
        const gemProgressPercent = ((100 - gemTimeRemaining) / 100) * 100
        
        return (
          <div className="space-y-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${gemProgressPercent}%` }}
              ></div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold">💎 Collect the Gems!</h3>
              <p className="text-lg text-slate-600">Tap ONLY the gem (💎) when you see it.</p>
              <p className="text-sm text-slate-500">Don't tap anything else! Focus matters more than speed.</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2 bg-emerald-50 p-4 rounded-xl border-2 border-emerald-300">
              <div className="text-center text-sm">
                <p className="text-slate-600">Time</p>
                <p className="text-2xl font-bold text-blue-600">{gemTimeRemaining}s</p>
              </div>
              <div className="text-center text-sm">
                <p className="text-slate-600">Correct</p>
                <p className="text-2xl font-bold text-green-600">{gemCorrectClicks}</p>
              </div>
              <div className="text-center text-sm">
                <p className="text-slate-600">Missed</p>
                <p className="text-2xl font-bold text-yellow-600">{gemOmissionErrors}</p>
              </div>
              <div className="text-center text-sm">
                <p className="text-slate-600">Wrong</p>
                <p className="text-2xl font-bold text-red-600">{gemCommissionErrors}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center min-h-96 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-4 border-emerald-200">
              {gemCurrentStimulus ? (
                <button
                  onClick={() => handleGemStimulus(gemCurrentStimulus!)}
                  className={`text-9xl transform transition-all duration-100 active:scale-90 ${
                    showGemFeedback.type === "correct" ? "scale-125" : ""
                  }`}
                  style={{
                    filter: showGemFeedback.type === "correct" ? "brightness(1.5) drop-shadow(0 0 20px #22c55e)" : 
                            showGemFeedback.type === "error" ? "brightness(1.3) drop-shadow(0 0 15px #ef4444)" : "none"
                  }}
                >
                  {gemCurrentStimulus}
                </button>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-6xl opacity-30 animate-pulse">💎</div>
                  <p className="text-slate-400">Waiting for next stimulus...</p>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">Score: {gemScore}</p>
            </div>
          </div>
        )
        
      case 4: // Auditory Discrimination - Sound Detective
        return (
          <div className="space-y-6">
            {soundListeningPhase ? (
              <div className="text-center space-y-6 py-12">
                <div className="text-9xl">👂</div>
                <h3 className="text-3xl font-bold">🔊 Sound Detective Challenge</h3>
                <div className="bg-violet-100 rounded-xl p-6 border-2 border-violet-300 max-w-2xl mx-auto">
                  <p className="text-lg text-violet-900 font-semibold mb-3">📋 Clinical Auditory Discrimination Test</p>
                  <p className="text-sm text-violet-700">This test measures your ability to distinguish similar sounds - a core skill for speech perception and language development.</p>
                </div>
                <div className="animate-pulse text-6xl">🔊</div>
                <p className="text-xl text-slate-600 font-bold">Listen to TWO sounds...</p>
                <p className="text-lg text-slate-500">Level {currentQuestion + 1}: {currentQuestion === 0 ? "Easy" : currentQuestion === 1 ? "Medium" : "Hard"} Discrimination</p>
              </div>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">🔊🎯</div>
                  <h3 className="text-2xl font-bold">Were the sounds SAME or DIFFERENT?</h3>
                  <p className="text-lg text-slate-600 mt-2">Level {currentQuestion + 1}: {currentQuestion === 0 ? "Clear Differences" : currentQuestion === 1 ? "Similar Sounds" : "Minimal Differences"}</p>
                  
                  <div className="bg-violet-100 rounded-xl p-8 mt-4 border-4 border-violet-300">
                    <div className="flex items-center justify-center gap-8 mb-4">
                      <div className="text-center">
                        <div className="text-5xl mb-2">🔊</div>
                        <p className="text-sm text-violet-600 font-semibold">Sound 1</p>
                      </div>
                      <div className="text-4xl text-violet-400">vs</div>
                      <div className="text-center">
                        <div className="text-5xl mb-2">🔊</div>
                        <p className="text-sm text-violet-600 font-semibold">Sound 2</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-violet-900">Make your choice below</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <button
                    onClick={() => handleSoundDiscrimination("same")}
                    disabled={!!feedback}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-12 rounded-2xl text-3xl font-bold hover:scale-105 transition disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    <div className="text-6xl mb-3">✅</div>
                    <div>SAME</div>
                  </button>
                  <button
                    onClick={() => handleSoundDiscrimination("different")}
                    disabled={!!feedback}
                    className="bg-gradient-to-br from-orange-500 to-red-600 text-white py-12 rounded-2xl text-3xl font-bold hover:scale-105 transition disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    <div className="text-6xl mb-3">❌</div>
                    <div>DIFFERENT</div>
                  </button>
                </div>
                
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => {
                      setSoundListeningPhase(true)
                      setSoundsPlayed(false)
                      setTimeout(() => {
                        speakWords([soundPair.sound1], () => {
                          setTimeout(() => {
                            speakWords([soundPair.sound2], () => {
                              setSoundListeningPhase(false)
                              setSoundsPlayed(true)
                            })
                          }, 600)
                        })
                      }, 500)
                    }}
                    disabled={!!feedback}
                    className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition text-lg"
                  >
                    🔊 Hear Again
                  </button>
                </div>
              </>
            )}
          </div>
        )
        
      case 5: // Mystery Solver
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍🕵️</div>
              <h3 className="text-2xl font-bold">{mysteryQuestion}</h3>
            </div>
            
            <div className="bg-slate-100 rounded-xl p-6 space-y-3">
              <h4 className="font-bold text-lg">Clues:</h4>
              {mysteryClues.map((clue, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border-l-4 border-blue-500">
                  {clue}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {mysteryOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleMysteryAnswer(option)}
                  disabled={!!feedback}
                  className="bg-gradient-to-r from-slate-500 to-gray-700 text-white py-6 rounded-xl text-xl font-bold hover:scale-105 transition disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )
        
      default:
        return <div>Game {currentGame + 1}</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      {/* INTRO */}
      {stage === "intro" && (
        <div className="max-w-5xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🧠 {t.title}
            </h1>
            <p className="text-2xl text-slate-600">{t.subtitle}</p>
            <p className="text-lg text-slate-500">6 fun games • 1-3 rounds each • ~10 minutes total</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {games.map((game, i) => (
              <div key={i} className={`bg-gradient-to-br ${game.color} text-white rounded-xl p-6 text-center space-y-3`}>
                <div className="text-6xl">{game.icon}</div>
                <h3 className="text-lg font-bold">{t.games[Object.keys(t.games)[i] as keyof typeof t.games].name}</h3>
                <p className="text-xs opacity-90">{game.rounds} {t.round}{game.rounds > 1 ? 's' : ''}</p>
                <p className="text-xs opacity-90">📚 {t.games[Object.keys(t.games)[i] as keyof typeof t.games].academicUse}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-3">{t.introBenefits}</h3>
            <ul className="space-y-2 text-blue-800">
              <li>✓ {t.benefit1}</li>
              <li>✓ {t.benefit2}</li>
              <li>✓ {t.benefit3}</li>
              <li>✓ {t.benefit4}</li>
            </ul>
          </div>

          <button
            onClick={() => setStage("info")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-xl text-2xl font-bold hover:shadow-xl transition transform hover:scale-105"
          >
            {t.startAdventure}
          </button>
        </div>
      )}

      {/* INFO */}
      {stage === "info" && (
        <div className="max-w-2xl mx-auto space-y-6 py-8">
          <h2 className="text-3xl font-bold text-center">{t.letsGetStarted}</h2>
          
          <div className="bg-white rounded-xl p-6 border-2 border-slate-200 space-y-6">
            <div>
              <label className="block font-bold mb-2">{t.yourName}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-3 border-2 rounded-lg text-lg"
                placeholder={t.enterYourName}
              />
            </div>
            
            <div>
              <label className="block font-bold mb-2">{t.yourAge}</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(Number(e.target.value))}
                min="5"
                max="100"
                className="w-full p-3 border-2 rounded-lg text-lg"
              />
            </div>
          </div>
          
          <button
            onClick={startGames}
            disabled={!name || age < 5}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl text-xl font-bold disabled:opacity-50"
          >
            {t.beginGames}
          </button>
        </div>
      )}

      {/* GAMES */}
      {stage === "games" && (
        <div className="max-w-4xl mx-auto space-y-4 py-4 md:py-8">
          <div className={`bg-gradient-to-r ${games[currentGame].color} text-white rounded-xl p-4 md:p-6`}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{t.games[Object.keys(t.games)[currentGame] as keyof typeof t.games].name}</h2>
                <p className="text-base md:text-lg mt-1">{t.games[Object.keys(t.games)[currentGame] as keyof typeof t.games].instructions}</p>
                <p className="text-xs md:text-sm mt-1 opacity-90">📚 {t.games[Object.keys(t.games)[currentGame] as keyof typeof t.games].academicUse}</p>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">{t.game} {currentGame + 1}/{games.length}</div>
                <div className="text-sm opacity-90">{t.round} {currentQuestion + 1}/{games[currentGame].rounds}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={skipCurrentTest}
              className="text-slate-500 hover:text-slate-700 underline text-sm font-semibold transition"
            >
              {t.skipThisTest} →
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-8 border-2 border-slate-200">
            {renderGame()}
          </div>

          {feedback && !showUnlockAnimation && (
            <div className={`text-center text-xl md:text-2xl font-bold py-6 rounded-xl whitespace-pre-line ${
              feedback.correct ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
            }`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {/* PROFILE */}
      {stage === "profile" && (
        <div className="max-w-5xl mx-auto space-y-8 py-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold">🎨 {name}'s Cognitive Profile</h2>
            <p className="text-xl text-slate-600 mt-2">Your Brain's Superpowers!</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(cognitiveScores).map(([skill, score]) => {
              const level = score >= 75 ? "🌟 Superstar" : score >= 50 ? "💪 Strong" : "🌱 Growing"
              const colorClass = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-blue-500" : "bg-orange-500"
              
              return (
                <div key={skill} className="bg-white rounded-xl p-6 border-2 border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg capitalize">
                      {skill.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <span className="text-sm font-semibold">{level}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-6">
                    <div 
                      className={`h-6 rounded-full ${colorClass} transition-all`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-slate-600 mt-2 font-bold">{score}%</p>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              setStage("recommendations")
              saveReportToBackend()
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl text-xl font-bold"
          >
            {t.seeRecommendations} 📚
          </button>
        </div>
      )}

      {/* RECOMMENDATIONS */}
      {stage === "recommendations" && (
        <div className="max-w-6xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold">📚 {name}{t.recommendationsTitle}</h2>
            <p className="text-xl text-slate-600">{t.recommendationsSubtitle}</p>
          </div>

          {/* Test Summary */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-3">📋 {t.assessmentSummary}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{gameResults.length}/{games.reduce((sum, g) => sum + g.rounds, 0)}</p>
                <p className="text-slate-600">{t.testsCompleted}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{gameResults.filter(r => r.correct).length}</p>
                <p className="text-slate-600">{t.correctAnswers}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{gameResults.filter(r => !r.correct).length}</p>
                <p className="text-slate-600">{t.needsPractice}</p>
              </div>
            </div>
          </div>

          {/* Cognitive Summary - Ranked */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-4">🌟 {t.cognitiveStrengths}</h3>
            <div className="space-y-3">
              {Object.entries(cognitiveScores)
                .sort(([, a], [, b]) => b - a)
                .map(([skill, score]) => {
                  const skillName = skill.replace(/([A-Z])/g, ' $1').trim()
                  const emoji = score >= 75 ? "⭐" : score >= 50 ? "💪" : "🌱"
                  return (
                    <div key={skill} className="flex items-center justify-between pb-2 border-b border-white border-opacity-30">
                      <span className="text-lg font-semibold flex items-center gap-2">
                        <span>{emoji}</span>
                        <span>{skillName}</span>
                      </span>
                      <span className="font-bold text-2xl">{score}%</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Detailed Recommendations by Skill */}
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-center">📖 {t.customizedStrategies}</h3>
            
            {[
              {
                skill: "visualSpatial",
                name: "Visual-Spatial Reasoning",
                icon: "🏗️",
                strategies: [
                  "Use diagrams, charts, and visual representations",
                  "Practice mental rotation exercises",
                  "Build with blocks, LEGOs, or 3D modeling",
                  "Study maps and geography regularly",
                  "Sketch concepts to understand relationships"
                ]
              },
              {
                skill: "workingMemory",
                name: "Working Memory + Processing",
                icon: "🧠",
                strategies: [
                  "Break tasks into smaller, manageable chunks",
                  "Use visual organizers and mind maps",
                  "Practice repetition with spaced intervals",
                  "Create memory anchors (mnemonics)",
                  "Teach concepts to others to strengthen retention"
                ]
              },
              {
                skill: "reactionTime",
                name: "Reaction Time & Motor Skills",
                icon: "🎯",
                strategies: [
                  "Practice quick response activities daily",
                  "Use hand-eye coordination exercises",
                  "Play reaction-based games and sports",
                  "Practice typing and handwriting drills",
                  "Take short movement breaks during studies"
                ]
              },
              {
                skill: "attention",
                name: "Attention & Impulse Control",
                icon: "💎",
                strategies: [
                  "Use Pomodoro technique (25 min focus, 5 min break)",
                  "Minimize distractions in study environment",
                  "Create a daily checklist of tasks",
                  "Practice meditation and mindfulness",
                  "Use visual timers for focused work sessions"
                ]
              },
              {
                skill: "auditoryProcessing",
                name: "Auditory Discrimination",
                icon: "🔊",
                strategies: [
                  "Practice phoneme awareness exercises (sound matching)",
                  "Use speech therapy apps for sound discrimination",
                  "Listen in quiet environments to improve perception",
                  "Practice minimal pairs (bat/pat, ship/chip)",
                  "Consider auditory training programs if scores are low",
                  "Work with speech-language pathologist if needed"
                ]
              },
              {
                skill: "reasoning",
                name: "Logical Reasoning",
                icon: "🔍",
                strategies: [
                  "Solve logic puzzles and riddles regularly",
                  "Practice explaining reasoning out loud",
                  "Create cause-effect and mind maps",
                  "Study real-world problem-solving examples",
                  "Play strategy games (chess, checkers, Sudoku)"
                ]
              }
            ].map(({ skill, name, icon, strategies }) => {
              const score = cognitiveScores[skill as keyof CognitiveProfile]
              const level = score >= 75 ? "Superstar" : score >= 50 ? "Strong" : "Growing"
              const levelColor = score >= 75 ? "text-green-600" : score >= 50 ? "text-blue-600" : "text-orange-600"
              
              return (
                <div key={skill} className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl">{icon}</div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold">{name}</h4>
                      <p className={`${levelColor} font-semibold text-lg`}>{level} Level ({score}%)</p>
                    </div>
                  </div>
                  <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                    <p className="font-bold text-slate-700 mb-3">✓ Recommended Strategies:</p>
                    <ul className="space-y-2">
                      {strategies.map((strategy, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-green-500 font-bold mt-1">•</span>
                          <span className="text-slate-700">{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overall Guidelines */}
          <div className="bg-gradient-to-r from-green-400 to-emerald-600 text-white rounded-xl p-8 space-y-4">
            <h3 className="text-2xl font-bold">🌟 General Learning Guidelines</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-bold text-lg">⏱️ Study Schedule</p>
                <p>30-45 minutes per session with 5-10 minute breaks</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg">🧬 Learning Styles Mix</p>
                <p>Combine visual, auditory, and kinesthetic activities</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg">📊 Progress Tracking</p>
                <p>Review weekly progress and adjust strategies</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg">😴 Sleep & Rest</p>
                <p>8+ hours of sleep for optimal brain function</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setStage("intro")
              setName("")
              setAge(10)
              setCognitiveScores({
                visualSpatial: 0,
                workingMemory: 0,
                reactionTime: 0,
                attention: 0,
                auditoryProcessing: 0,
                reasoning: 0
              })
              setGameResults([])
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl text-xl font-bold hover:shadow-lg transition"
          >
            🔄 Take Assessment Again
          </button>
        </div>
      )}
    </div>
  )
}