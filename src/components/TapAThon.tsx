'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TapAThon.module.css';
import confetti from 'canvas-confetti';

const TOTAL_TIME = 45;
const INITIAL_INTERVAL = 1000;
const MIN_INTERVAL = 300;

const GOOD_TARGETS = ['🍰', '🧁', '🍩', '🍪', '🥞', '🍮', '🍦', '🍨', '🍭', '🍬', '🍫', '🥨', '🎂', '🥧'];
const BAD_TARGETS = ['🥦', '🥕', '🥔', '🥚', '🌽', '🍞', '🧅', '🧄', '🌶️', '🥒', '🍄', '🥬', '🍅', '🍆', '🥑', '🍗', '🍖', '👞', '🧤', '🧱', '📦'];

interface Target {
    id: number;
    emoji: string;
    isGood: boolean;
    x: number;
    y: number;
    active: boolean;
}

interface HighScore {
    name: string;
    score: number;
    timestamp: string;
}

export default function TapAThon() {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver' | 'submitting' | 'leaderboard'>('idle');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
    const [targets, setTargets] = useState<Target[]>([]);
    const [playerName, setPlayerName] = useState('');
    const [highScores, setHighScores] = useState<HighScore[]>([]);
    
    // Refs to store state for the game loop to avoid dependency-related issues
    const gameStateRef = useRef(gameState);
    const timeLeftRef = useRef(timeLeft);
    const scoreRef = useRef(score);
    
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { scoreRef.current = score; }, [score]);

    const gameAreaRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const spawnTargetRef = useRef<() => void>(() => {});

    const spawnTarget = useCallback(() => {
        if (!gameAreaRef.current || gameStateRef.current !== 'playing') return;

        const rect = gameAreaRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            timeoutRef.current = setTimeout(() => spawnTargetRef.current(), 100);
            return;
        }

        const size = 60; 
        const padding = 20;
        const maxX = Math.max(0, rect.width - size - padding * 2);
        const maxY = Math.max(0, rect.height - size - padding * 2);

        const x = Math.random() * maxX + padding;
        const y = Math.random() * maxY + padding;

        const isGood = Math.random() > 0.3;
        const emoji = isGood 
            ? GOOD_TARGETS[Math.floor(Math.random() * GOOD_TARGETS.length)]
            : BAD_TARGETS[Math.floor(Math.random() * BAD_TARGETS.length)];

        const newTarget: Target = {
            id: Date.now() + Math.random(),
            emoji,
            isGood,
            x,
            y,
            active: true
        };

        setTargets(prev => [...prev.filter(t => t.active), newTarget]);

        // Auto-remove target after 2 seconds if not tapped
        setTimeout(() => {
            setTargets(prev => prev.map(t => t.id === newTarget.id ? { ...t, active: false } : t));
        }, 2000);

        // Schedule next spawn with increasing speed
        const timePassed = TOTAL_TIME - timeLeftRef.current;
        const progress = timePassed / TOTAL_TIME;
        const currentInterval = INITIAL_INTERVAL - (INITIAL_INTERVAL - MIN_INTERVAL) * progress;
        timeoutRef.current = setTimeout(() => spawnTargetRef.current(), Math.max(MIN_INTERVAL, currentInterval));
    }, []);

    useEffect(() => {
        spawnTargetRef.current = spawnTarget;
    }, [spawnTarget]);

    const startGame = () => {
        gameStateRef.current = 'playing';
        setGameState('playing');
        setScore(0);
        setTimeLeft(TOTAL_TIME);
        setTargets([]);
        
        // Use a separate timer for spawns
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => spawnTargetRef.current(), INITIAL_INTERVAL);

        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!);
                    setGameState('gameOver');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTap = (target: Target) => {
        if (target.isGood) {
            setScore(prev => prev + 10);
            confetti({
                particleCount: 20,
                spread: 30,
                origin: { 
                    x: (target.x + 30) / (gameAreaRef.current?.clientWidth || 1), 
                    y: (target.y + 30) / (gameAreaRef.current?.clientHeight || 1) 
                },
                colors: ['#5bc8f5', '#f0e6d2']
            });
        } else {
            setScore(prev => Math.max(0, prev - 15));
        }

        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, active: false } : t));
    };

    const submitScore = async () => {
        if (!playerName.trim()) return;
        setGameState('submitting');

        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playerName, score })
            });
            fetchLeaderboard();
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    };

    const fetchLeaderboard = async () => {
        setGameState('leaderboard');
        try {
            const res = await fetch('/api/scores');
            const data = await res.json();
            setHighScores(data.scores || []);
        } catch (err) {
            console.error('Failed to fetch leaderboard', err);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    return (
        <div className={styles.tapAThonContainer}>
            {gameState === 'idle' && (
                <div className={styles.overlay}>
                    <h2 className={styles.title}>Tap-A-Thon</h2>
                    <p className={styles.rules}>
                        Tap the cakes! 🍰 Avoid everything else! 🥦
                        <br />Speed increases over time!
                    </p>
                    <button onClick={startGame} className="gold-btn">Start Game!</button>
                    <button onClick={fetchLeaderboard} className={styles.secondaryBtn}>View Leaderboard</button>
                </div>
            )}

            {gameState === 'playing' && (
                <div className={styles.gameContent}>
                    <div className={styles.hud}>
                        <div className={styles.scoreBoard}>Score: {score}</div>
                        <div className={styles.timerBoard}>Time: {timeLeft}s</div>
                    </div>
                    <div ref={gameAreaRef} className={styles.gameArea}>
                        {targets.filter(t => t.active).map(target => (
                            <button
                                key={target.id}
                                className={styles.target}
                                style={{ left: target.x, top: target.y }}
                                onClick={() => handleTap(target)}
                            >
                                {target.emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gameState === 'gameOver' && (
                <div className={styles.overlay}>
                    <h2 className={styles.title}>Game Over!</h2>
                    <p className={styles.finalScore}>Final Score: {score}</p>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="input-elegant"
                        style={{ marginBottom: '1rem', width: '200px' }}
                    />
                    <button onClick={submitScore} className="gold-btn">Submit Score</button>
                    <button onClick={startGame} className={styles.secondaryBtn} style={{ marginTop: '0.5rem' }}>Try Again</button>
                </div>
            )}

            {gameState === 'leaderboard' && (
                <div className={styles.overlay}>
                    <h2 className={styles.title}>Top Players</h2>
                    <div className={styles.leaderboardTable}>
                        {highScores.map((s, idx) => (
                            <div 
                                key={idx} 
                                className={`${styles.leaderboardRow} ${idx === 0 ? styles.firstPlace : ''}`}
                            >
                                <span className={styles.rank}>{idx + 1}</span>
                                <span className={styles.name}>{s.name}</span>
                                <span className={styles.score}>{s.score}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setGameState('idle')} className="gold-btn">Back</button>
                </div>
            )}
        </div>
    );
}
