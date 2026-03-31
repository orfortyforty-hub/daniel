import React from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
    return (
        <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <div className={styles.divider}></div>
        </div>
    );
}
