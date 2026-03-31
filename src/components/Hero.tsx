'use client'

import React, { useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const rotationRef = useRef(0);
    const velocityRef = useRef(0);
    const isSpinningRef = useRef(false);
    const isDefaultSpinRef = useRef(true);
    const animFrameRef = useRef<number | null>(null);
    const animateRef = useRef<() => void>(() => {});
    const lastTouchXRef = useRef(0);
    const lastTouchTimeRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasDraggedRef = useRef(false);
    const wasPreviouslySpinningRef = useRef(false);

    const FRICTION = 0.985;
    const MIN_VELOCITY = 0.05;
    const DEFAULT_SPEED = 0.15; // Slow constant rotation (deg/frame)

    const animate = useCallback(() => {
        if (!isSpinningRef.current) return;

        if (isDefaultSpinRef.current) {
            // Constant speed, no friction
            rotationRef.current += DEFAULT_SPEED;
        } else {
            // User-initiated: apply friction
            velocityRef.current *= FRICTION;
            rotationRef.current += velocityRef.current;

            if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
                // Drag spin ended, resume default slow spin
                velocityRef.current = 0;
                isDefaultSpinRef.current = true;
            }
        }

        if (wrapperRef.current) {
            wrapperRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
        }

        animFrameRef.current = requestAnimationFrame(() => animateRef.current());
    }, []);

    useEffect(() => {
        animateRef.current = animate;
    }, [animate]);

    const startSpin = useCallback((vel: number, isDefault = false) => {
        velocityRef.current = vel;
        isDefaultSpinRef.current = isDefault;
        if (!isSpinningRef.current) {
            isSpinningRef.current = true;
            animFrameRef.current = requestAnimationFrame(() => animateRef.current());
        }
    }, []);

    const stopSpin = useCallback(() => {
        isSpinningRef.current = false;
        velocityRef.current = 0;
        isDefaultSpinRef.current = false;
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
    }, []);

    // Start with a gentle default spin
    useEffect(() => {
        startSpin(0, true);
    }, [startSpin]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        // --- Touch events (mobile) ---
        const handleTouchStart = (e: TouchEvent) => {
            // Always pause spin and start tracking
            const wasSpinning = isSpinningRef.current;
            stopSpin();
            isDraggingRef.current = true;
            hasDraggedRef.current = false;
            wasPreviouslySpinningRef.current = wasSpinning && !isDefaultSpinRef.current;
            lastTouchXRef.current = e.touches[0].clientX;
            lastTouchTimeRef.current = Date.now();
            velocityRef.current = 0;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDraggingRef.current) return;
            e.preventDefault();
            hasDraggedRef.current = true;
            const x = e.touches[0].clientX;
            const now = Date.now();
            const dx = x - lastTouchXRef.current;
            const dt = Math.max(now - lastTouchTimeRef.current, 1);
            velocityRef.current = (dx / dt) * 8;
            rotationRef.current += dx * 0.5;
            if (wrapperRef.current) {
                wrapperRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
            }
            lastTouchXRef.current = x;
            lastTouchTimeRef.current = now;
        };

        const handleTouchEnd = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            if (hasDraggedRef.current && Math.abs(velocityRef.current) > MIN_VELOCITY) {
                // Fling: friction spin, will resume default when it decays
                startSpin(velocityRef.current, false);
            } else if (!hasDraggedRef.current) {
                // It was a tap — if it was user-spinning, stay stopped. Otherwise resume default.
                if (!wasPreviouslySpinningRef.current) {
                    // Was default-spinning or stopped → toggle: stay stopped (already stopped)
                } else {
                    // Was user-friction-spinning → stop (already stopped)
                }
                // Simple toggle: if it was spinning, we stopped. If stopped, resume.
            } else {
                // Dragged but no velocity — resume default
                startSpin(0, true);
            }
        };

        // --- Mouse events (desktop) ---
        const handleMouseDown = (e: MouseEvent) => {
            const wasSpinning = isSpinningRef.current;
            stopSpin();
            isDraggingRef.current = true;
            hasDraggedRef.current = false;
            wasPreviouslySpinningRef.current = wasSpinning && !isDefaultSpinRef.current;
            lastTouchXRef.current = e.clientX;
            lastTouchTimeRef.current = Date.now();
            velocityRef.current = 0;
            e.preventDefault();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            hasDraggedRef.current = true;
            const x = e.clientX;
            const now = Date.now();
            const dx = x - lastTouchXRef.current;
            const dt = Math.max(now - lastTouchTimeRef.current, 1);
            velocityRef.current = (dx / dt) * 8;
            rotationRef.current += dx * 0.5;
            if (wrapperRef.current) {
                wrapperRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
            }
            lastTouchXRef.current = x;
            lastTouchTimeRef.current = now;
        };

        const handleMouseUp = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            if (hasDraggedRef.current && Math.abs(velocityRef.current) > MIN_VELOCITY) {
                startSpin(velocityRef.current, false);
            } else {
                // Tap or no-velocity drag — resume default
                startSpin(0, true);
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);
        el.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [startSpin, stopSpin]);

    return (
        <section className={styles.heroSection}>
            <div
                ref={wrapperRef}
                className={styles.imageWrapper}
                style={{ cursor: 'grab' }}
            >
                <Image
                    src="/img/center2.png"
                    alt="Danielle Bat Mitzvah"
                    width={525}
                    height={525}
                    priority
                    className={styles.spinningImage}
                    draggable={false}
                />
            </div>
            <div className={styles.textContent}>
                <h2 className={styles.subtitle}>Hey! It&apos;s Danielle&apos;s Bat Mitzvah!</h2>
                <div className={styles.divider}></div>
                <p className={styles.description}>Let&apos;s have some fun!</p>
            </div>
        </section>
    );
}
