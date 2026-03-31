import React from 'react';
import TapAThon from '@/components/TapAThon';
import BackToParty from '@/components/BackToParty';
import styles from './TapAThonPage.module.css';

export default function TapAThonPage() {
    return (
        <main className={styles.fullPage}>
            <div className={styles.navHeader}>
                <BackToParty />
            </div>
            <div className={styles.gameWrapper}>
                <TapAThon />
            </div>
        </main>
    );
}
