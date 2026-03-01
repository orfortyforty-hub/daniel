'use client'

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Carousel.module.css';

const images = [
    '/img/WhatsApp Image 2026-02-25 at 17.40.08 (1).jpeg',
    '/img/WhatsApp Image 2026-02-25 at 17.40.08 (2).jpeg',
    '/img/WhatsApp Image 2026-02-25 at 17.40.08 (3).jpeg',
    '/img/WhatsApp Image 2026-02-25 at 17.40.08 (4).jpeg',
    '/img/WhatsApp Image 2026-02-25 at 17.40.08.jpeg'
];

export default function Carousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 3000); // Change image every 3 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`glass-card ${styles.carouselContainer} fade-in`}>
            <div className={styles.imageBox}>
                {images.map((src, index) => (
                    <div
                        key={src}
                        className={`${styles.imageWrapper} ${index === currentIndex ? styles.active : styles.inactive
                            }`}
                    >
                        <Image
                            src={src}
                            alt={`Daniel moment ${index + 1}`}
                            fill
                            className={styles.image}
                            sizes="(max-width: 600px) 100vw, 500px"
                            priority={index === 0}
                        />
                    </div>
                ))}
            </div>
            <div className={styles.dots}>
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        className={`${styles.dot} ${idx === currentIndex ? styles.activeDot : ''}`}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
