'use client'

import React, { useState } from 'react';
import styles from './RsvpForm.module.css';

export default function RsvpForm() {
    const [name, setName] = useState('');
    const [attendees, setAttendees] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleAddName = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && !attendees.includes(name.trim())) {
            setAttendees([...attendees, name.trim()]);
            setName('');
        }
    };

    const handleRemoveName = (indexToRemove: number) => {
        setAttendees(attendees.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async () => {
        if (attendees.length === 0) return;

        setStatus('loading');
        try {
            const response = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendees }),
            });

            if (response.ok) {
                setStatus('success');
                setAttendees([]);
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <section className={`glass-card fade-in ${styles.rsvpSection}`}>
                <h3 className={styles.successHeading}>תודה רבה!</h3>
                <p className={styles.successText}>האישור התקבל. נתראה במסיבה!</p>
                <button className="gold-btn" onClick={() => setStatus('idle')}>
                    אישור נוסף
                </button>
            </section>
        );
    }

    return (
        <section className={`glass-card fade-in ${styles.rsvpSection}`}>
            <h3 className={styles.heading}>אישור הגעה</h3>
            <p className={styles.subtitle}>נשמח לראות את כולכן!</p>

            <form onSubmit={handleAddName} className={styles.inputGroup}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="הכנס/י שם"
                    className="input-elegant"
                />
                <button type="submit" className={styles.addButton} disabled={!name.trim()}>
                    הוסף
                </button>
            </form>

            {attendees.length > 0 && (
                <div className={styles.attendeesList}>
                    <h4>מאשרים:</h4>
                    <ul>
                        {attendees.map((attendee, index) => (
                            <li key={index} className={styles.attendeeItem}>
                                <span>{attendee}</span>
                                <button
                                    onClick={() => handleRemoveName(index)}
                                    className={styles.removeButton}
                                    aria-label="Remove name"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button
                className="gold-btn"
                onClick={handleSubmit}
                disabled={attendees.length === 0 || status === 'loading'}
                style={{ marginTop: '1.5rem', width: '100%' }}
            >
                {status === 'loading' ? 'שולח...' : 'אשר הגעה'}
            </button>

            {status === 'error' && (
                <p className={styles.errorText}>אירעה שגיאה. אנא נסו שוב.</p>
            )}
        </section>
    );
}
