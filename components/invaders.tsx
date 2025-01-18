'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import styles from '@/styles/spaceinvaders.module.css'

type GameObject = {
  x: number
  y: number
  width: number
  height: number
}

type Player = GameObject & {
  speed: number
}

type Invader = GameObject & {
  direction: number
}

type Bullet = GameObject & {
  speed: number
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 500

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playerImage, setPlayerImage] = useState<HTMLImageElement | null>(null)
  const [enemyImage, setEnemyImage] = useState<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [player, setPlayer] = useState<Player>({
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 60,
    width: 50,
    height: 50,
    speed: 5,
  })
  const [invaders, setInvaders] = useState<Invader[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set())
  const [lastShotTime, setLastShotTime] = useState<number>(0)

  // Load player image
  useEffect(() => {
    const img = new Image()
    const img2 = new Image()
    img.onload = () => {
      setPlayerImage(img2)
      setEnemyImage(img)
      setImageLoaded(true)
    }
    img.onerror = (e) => {
      console.error('Error loading player image:', e)
      setImageLoaded(false)
    }
    img.src = 'face.png'
    img2.src = 'face2.png'
  }, [])

  const initializeInvaders = useCallback(() => {
    const newInvaders: Invader[] = []
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 10; j++) {
        newInvaders.push({
          x: j * 60 + 50,
          y: i * 60 + 50,
          width: 40,
          height: 40,
          direction: 1,
        })
      }
    }
    return newInvaders
  }, [])

  const startGame = useCallback(() => {
    setGameStarted(true)
    setGameOver(false)
    setWin(false)
    setInvaders(initializeInvaders())
    setBullets([])
    setPlayer({
      x: CANVAS_WIDTH / 2 - 25,
      y: CANVAS_HEIGHT - 60,
      width: 50,
      height: 50,
      speed: 5,
    })
    setKeysPressed(new Set())
    setLastShotTime(0)
  }, [initializeInvaders])

  useEffect(() => {
    if (!gameStarted || gameOver || win || !imageLoaded || !playerImage) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let animationFrameId: number
    let lastTime = 0
    const fps = 60
    const frameInterval = 1000 / fps

    const gameLoop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(gameLoop)

      const deltaTime = currentTime - lastTime
      if (deltaTime < frameInterval) return

      lastTime = currentTime - (deltaTime % frameInterval)

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw player image
      try {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height)
      } catch (error) {
        console.error('Error drawing player image:', error)
        // Fallback to rectangle if image drawing fails
        ctx.fillStyle = 'green'
        ctx.fillRect(player.x, player.y, player.width, player.height)
      }

      invaders.forEach(invader => {
        try {
          if (enemyImage) {
            ctx.drawImage(enemyImage, invader.x, invader.y, invader.width, invader.height);
          } else {
            // Fallback to red rectangle if enemy image is not loaded
            ctx.fillStyle = 'red';
            ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
          }
        } catch (error) {
          console.error('Error drawing invader image:', error);
          // Fallback to red rectangle if enemy image drawing fails
          ctx.fillStyle = 'red';
          ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
        }
      });

      ctx.fillStyle = 'yellow'
      bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      })

      updateGameState(currentTime)
    }

    const updateGameState = (currentTime: number) => {
      if (keysPressed.has('ArrowLeft')) {
        setPlayer(prev => ({
          ...prev,
          x: Math.max(0, prev.x - prev.speed),
        }))
      }
      if (keysPressed.has('ArrowRight')) {
        setPlayer(prev => ({
          ...prev,
          x: Math.min(CANVAS_WIDTH - player.width, prev.x + prev.speed),
        }))
      }

      if (keysPressed.has(' ') && currentTime - lastShotTime > 500) {
        setBullets(prev => [
          ...prev,
          {
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            width: 5,
            height: 10,
            speed: 7,
          },
        ])
        setLastShotTime(currentTime)
      }

      let shouldChangeDirection = false
      const updatedInvaders = invaders.map(invader => {
        const newX = invader.x + invader.direction
        if (newX <= 0 || newX + invader.width >= CANVAS_WIDTH) {
          shouldChangeDirection = true
        }
        return { ...invader, x: newX }
      })

      if (shouldChangeDirection) {
        setInvaders(prevInvaders =>
          prevInvaders.map(invader => ({
            ...invader,
            y: invader.y + 20,
            direction: -invader.direction,
          }))
        )
      } else {
        setInvaders(updatedInvaders)
      }

      setBullets(prevBullets =>
        prevBullets
          .map(bullet => ({ ...bullet, y: bullet.y - bullet.speed }))
          .filter(bullet => bullet.y > 0)
      )

      setInvaders(prevInvaders => {
        const remainingInvaders = prevInvaders.filter(invader => {
          const isHit = bullets.some(bullet =>
            bullet.x < invader.x + invader.width &&
            bullet.x + bullet.width > invader.x &&
            bullet.y < invader.y + invader.height &&
            bullet.y + bullet.height > invader.y
          )

          if (isHit) {
            setBullets(prevBullets =>
              prevBullets.filter(
                bullet =>
                  !(
                    bullet.x < invader.x + invader.width &&
                    bullet.x + bullet.width > invader.x &&
                    bullet.y < invader.y + invader.height &&
                    bullet.y + bullet.height > invader.y
                  )
              )
            )
          }
          return !isHit
        })

        if (remainingInvaders.some(invader => invader.y + invader.height >= player.y)) {
          setGameOver(true)
        }

        if (remainingInvaders.length === 0) {
          setWin(true)
        }

        return remainingInvaders
      })
    }

    gameLoop(0)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [gameStarted, gameOver, win, player, invaders, bullets, keysPressed, lastShotTime, playerImage, imageLoaded, enemyImage])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameStarted || gameOver || win) return
    setKeysPressed(prev => new Set(prev).add(e.key))
  }, [gameStarted, gameOver, win])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setKeysPressed(prev => {
      const newSet = new Set(prev)
      newSet.delete(e.key)
      return newSet
    })
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  if (win) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
        <h1 className="text-6xl font-bold">You Win!</h1>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameOverText}>
        Space Invaders! Use Right/Left Arrow Keys to move. Press Space to shoot.
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={styles.canvas}
      />
      {!gameStarted && (
        <button
          onClick={startGame}
          className={styles.startButton}
        >
          Start Game
        </button>
      )}
      {gameOver && (
        <div className={styles.gameOverText}>
          Game Over!
        </div>
      )}
      {gameOver && (
        <button
          onClick={startGame}
          className={styles.playAgainButton}
        >
          Play Again
        </button>
      )}
    </div>
  )
}