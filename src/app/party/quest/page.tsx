import React from 'react';
import Quest from '@/components/Quest';
import BackToParty from '@/components/BackToParty';
import styles from './QuestPage.module.css';

export default function QuestPage() {
    return (
        <main className={styles.fullPage}>
            <div className={styles.navHeader}>
                <BackToParty />
            </div>
            <div className={styles.gameWrapper}>
                <Quest />
            </div>
        </main>
    );
}
