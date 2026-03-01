import React from 'react';
import styles from './Details.module.css';

export default function Details() {
    return (
        <section className="glass-card fade-in">
            <h3 className={styles.heading}>פרטי האירוע</h3>

            <div className={styles.timeline}>
                <div className={styles.event}>
                    <div className={styles.icon}>✨</div>
                    <div className={styles.eventText}>
                        <strong>מתי?</strong>
                        <span>23.4.2026 - לכל החברות!</span>
                    </div>
                </div>

                <div className={styles.event}>
                    <div className={styles.icon}>🚌</div>
                    <div className={styles.eventText}>
                        <strong>איך מגיעים?</strong>
                        <span>נדאג להסעה לכולם! נפגש בזרקור בשעה 18:00.</span>
                    </div>
                </div>

                <div className={styles.event}>
                    <div className={styles.icon}>🌊</div>
                    <div className={styles.eventText}>
                        <strong>לאן נוסעים?</strong>
                        <span>חוגגים ליד הים בהרצליה!</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
