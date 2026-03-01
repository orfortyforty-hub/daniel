import React from 'react';
import Hero from '@/components/Hero';
import Details from '@/components/Details';
import Carousel from '@/components/Carousel';
import RsvpForm from '@/components/RsvpForm';
import MagicalBalloons from '@/components/MagicalBalloons';

export default function Home() {
    return (
        <main className="container">
            <MagicalBalloons />
            <Hero />
            <Details />
            <Carousel />
            <RsvpForm />

            <footer style={{
                textAlign: 'center',
                marginTop: '2rem',
                paddingBottom: '2rem',
                opacity: 0.7,
                fontSize: '0.9rem'
            }}>
                <p dir="rtl">✨ מחכה לחגוג איתכן! ✨</p>
            </footer>
        </main>
    );
}
