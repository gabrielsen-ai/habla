'use client';

import React from 'react';
import Link from 'next/link';
import './learning-path.css';

const steps = [
    { id: 1, name: 'Kino', avatar: '/avatars/avatar_1.png', interactive: true, link: '/conversation' },
    { id: 2, name: 'Flyplassen', avatar: '/avatars/avatar_2.png', interactive: false },
    { id: 3, name: 'Matbutikken', avatar: '/avatars/avatar_3.png', interactive: false },
    { id: 4, name: 'Hotellet', avatar: '/avatars/avatar_4.png', interactive: false },
    { id: 5, name: 'Skolen', avatar: '/avatars/avatar_5.png', interactive: false },
];

export default function LearningPath() {
    return (
        <div className="learning-path-container">
            <header className="learning-path-header">
                <h1 className="learning-path-title">Læringssti</h1>
            </header>

            <div className="path-area">
                {/* SVG for Winding Path */}
                <svg className="path-svg" viewBox="0 0 400 800" preserveAspectRatio="none">
                    {/* Cubic helper curve. Start bottom left-ish, wind up. */}
                    {/* Kino (20% x, 50px from bot) -> ... -> School top */}
                    {/* Coords assume 400x800 box. */}
                    {/* Node 0: ~80, 750 (bottom-left) */}
                    {/* Node 1: ~320, 580 (right) */}
                    {/* Node 2: ~120, 410 (left) */}
                    {/* Node 3: ~300, 240 (right) */}
                    {/* Node 4: ~60, 70 (top-left) */}

                    <path
                        d="M 80 750 C 200 750, 320 700, 320 580 S 120 500, 120 410 S 300 330, 300 240 S 100 150, 60 70"
                        className="path-line"
                    />
                </svg>

                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`path-node node-${index} ${step.interactive ? 'interactive' : ''}`}
                    >
                        {step.interactive ? (
                            <Link href={step.link}>
                                <div className="node-content">
                                    <img src={step.avatar} alt={step.name} className="avatar-img" />
                                </div>
                            </Link>
                        ) : (
                            <div className="node-content">
                                <img src={step.avatar} alt={step.name} className="avatar-img" style={{ opacity: 0.7, filter: 'grayscale(0.4)' }} />
                            </div>
                        )}
                        <span className="node-label">{step.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
