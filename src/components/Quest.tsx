'use client';

import React, { useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './Quest.module.css';
import confetti from 'canvas-confetti';
import { CheckCircle, QrCode } from 'lucide-react';

interface Riddle {
    id: number;
    text: string;
    answer: string; // The text encoded in the QR code
}

const RIDDLES: Riddle[] = [
    { id: 1, text: "I'm where the party starts, but I'm not a person. Scan my code!", answer: "PARTY_START" },
    { id: 2, text: "I'm cold and sweet, perfect for a treat. Find my code!", answer: "SWEET_TREAT" },
];

export default function Quest() {
    const [currentStep, setCurrentStep] = useState(0); // 0 to RIDDLES.length + 1
    const [scannerActive, setScannerActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clockTime, setClockTime] = useState({ hours: 12, minutes: 0 });
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const startScanner = () => {
        setScannerActive(true);
        setError(null);
        
        // Wait for element to be available in DOM
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            
            scanner.render((decodedText) => {
                handleScanSuccess(decodedText);
            }, () => {
                // Ignore scan errors, it's just trying to find a code
            });
            
            scannerRef.current = scanner;
        }, 100);
    };

    const handleScanSuccess = (decodedText: string) => {
        const riddle = RIDDLES[currentStep];
        if (decodedText.trim().toUpperCase() === riddle.answer) {
            scannerRef.current?.clear();
            setScannerActive(false);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#5bc8f5', '#f0e6d2', '#ffffff']
            });
            setCurrentStep(prev => prev + 1);
        } else {
            setError("Wrong QR code! Try again.");
        }
    };

    const handleClockChange = (type: 'hours' | 'minutes', delta: number) => {
        setClockTime(prev => {
            let nextVal = prev[type] + delta;
            if (type === 'hours') {
                if (nextVal > 23) nextVal = 0;
                if (nextVal < 0) nextVal = 23;
            } else {
                if (nextVal > 59) nextVal = 0;
                if (nextVal < 0) nextVal = 59;
            }
            return { ...prev, [type]: nextVal };
        });
    };

    const checkClockPuzzle = () => {
        if (clockTime.hours === 8 && clockTime.minutes === 4) {
            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#5bc8f5', '#f0e6d2', '#ffffff', '#FFD700']
            });
            setCurrentStep(RIDDLES.length + 1);
        } else {
            setError("The time is not yet right...");
        }
    };

    return (
        <div className={styles.questContainer}>
            {currentStep < RIDDLES.length && (
                <div className={styles.stepContent}>
                    <h2 className={styles.title}>Quest Step {currentStep + 1}</h2>
                    <div className={styles.riddleCard}>
                        <p className={styles.riddleText}>{RIDDLES[currentStep].text}</p>
                    </div>
                    
                    {!scannerActive ? (
                        <button onClick={startScanner} className="gold-btn">
                            <QrCode className={styles.btnIcon} />
                            Scan QR Code
                        </button>
                    ) : (
                        <div className={styles.scannerWrapper}>
                            <div id="reader"></div>
                            <button 
                                onClick={() => {
                                    scannerRef.current?.clear();
                                    setScannerActive(false);
                                }} 
                                className={styles.cancelBtn}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    
                    {error && <p className={styles.errorText}>{error}</p>}
                </div>
            )}

            {currentStep === RIDDLES.length && (
                <div className={styles.clockPuzzle}>
                    <h2 className={styles.title}>Final Challenge</h2>
                    <p className={styles.riddleText}>Set the time to Danielle&apos;s Special Moment (08:04)</p>
                    
                    <div className={styles.clockDisplay}>
                        <div className={styles.clockDigitGroup}>
                            <button onClick={() => handleClockChange('hours', 1)} className={styles.clockAdjust}>▲</button>
                            <span className={styles.digit}>{String(clockTime.hours).padStart(2, '0')}</span>
                            <button onClick={() => handleClockChange('hours', -1)} className={styles.clockAdjust}>▼</button>
                        </div>
                        <span className={styles.separator}>:</span>
                        <div className={styles.clockDigitGroup}>
                            <button onClick={() => handleClockChange('minutes', 1)} className={styles.clockAdjust}>▲</button>
                            <span className={styles.digit}>{String(clockTime.minutes).padStart(2, '0')}</span>
                            <button onClick={() => handleClockChange('minutes', -1)} className={styles.clockAdjust}>▼</button>
                        </div>
                    </div>
                    
                    <button onClick={checkClockPuzzle} className="gold-btn">
                        Set Time
                    </button>
                    {error && <p className={styles.errorText}>{error}</p>}
                </div>
            )}

            {currentStep > RIDDLES.length && (
                <div className={styles.completed}>
                    <CheckCircle size={64} color="var(--color-accent)" className={styles.completeIcon} />
                    <h2 className={styles.title}>Bravo!</h2>
                    <p className={styles.riddleText}>You have completed the quest!</p>
                    <div className={styles.fireworks}>✨ ✨ ✨</div>
                </div>
            )}
        </div>
    );
}
