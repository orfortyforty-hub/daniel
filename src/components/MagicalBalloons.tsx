'use client'

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import styles from './MagicalBalloons.module.css';

export default function MagicalBalloons() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handlePop = (e: React.MouseEvent, index: number) => {
        // Hide balloon on click by finding the clicked element
        const target = e.currentTarget as HTMLElement;
        target.style.display = 'none';

        // Fire confetti from the click coordinates
        const rect = target.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
            particleCount: 80,
            spread: 60,
            origin: { x, y },
            colors: ['#d4af37', '#f1c40f', '#4c1d95', '#ffffff'] // Gold, Yellow, Deep Purple, White
        });
    };

    if (!mounted) return null;

    return (
        <div className={styles.balloonContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className={`${styles.balloonWrapper} ${styles[`balloon-${i}`]}`}
                    onClick={(e) => handlePop(e, i)}
                    title="Click me for magic!"
                >
                    <svg className={styles.balloon} viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <radialGradient id={`grad-${i}`} cx="30%" cy="30%" r="70%">
                                <stop offset="0%" stopColor="#f1c40f" />
                                <stop offset="100%" stopColor="#b38728" />
                            </radialGradient>
                        </defs>
                        <ellipse cx="50" cy="50" rx="40" ry="50" fill={`url(#grad-${i})`} />
                        <path d="M45 100 L55 100 L50 110 Z" fill="#b38728" />
                        <path d="M50 110 Q45 120 55 130" stroke="#f0e6d2" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            ))}
        </div>
    );
}
