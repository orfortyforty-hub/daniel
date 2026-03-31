import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './BackToParty.module.css';

export default function BackToParty() {
    return (
        <div className={styles.backContainer}>
            <Link href="/party" className={styles.backLink}>
                <ArrowLeft size={20} />
                <span>Back to the party</span>
            </Link>
        </div>
    );
}
