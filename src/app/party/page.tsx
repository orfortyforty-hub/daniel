import React from 'react';
import Link from 'next/link';
import Hero from '@/components/Hero';
import SectionHeader from '@/components/SectionHeader';
import SharedCanvas from '@/components/SharedCanvas';
import styles from './party.module.css';

export default function PartyPage() {
    return (
        <main className={styles.partyMain}>
            
            <div className="container">
                <Hero />
                
                <section className={styles.gameSection}>
                    <div className={styles.linksGrid}>
                        <a href="https://kahoot.it" target="_blank" rel="noopener noreferrer" className={styles.gameCard}>
                            <div className={styles.cardIcon}>🎮</div>
                            <h3 className={styles.cardTitle}>Quiz</h3>
                            <p className={styles.cardDescription}>Join the Kahoot!</p>
                        </a>

                        <Link href="/party/tap-a-thon" className={styles.gameCard}>
                            <div className={styles.cardIcon}>🎂</div>
                            <h3 className={styles.cardTitle}>Tap-A-Thon</h3>
                            <p className={styles.cardDescription}>Tap the cakes!</p>
                        </Link>

                        <Link href="/party/quest" className={styles.gameCard}>
                            <div className={styles.cardIcon}>🗺️</div>
                            <h3 className={styles.cardTitle}>Quest</h3>
                            <p className={styles.cardDescription}>Solve the mystery!</p>
                        </Link>
                    </div>
                </section>
            </div>
            
            <section className={styles.canvasSection}>
                <div className="container" style={{ gap: '1rem', paddingBottom: '1rem' }} dir="rtl">
                    <SectionHeader title="תאחלו לי משהו" />
                </div>
                <SharedCanvas />
            </section>
        </main>
    );
}
