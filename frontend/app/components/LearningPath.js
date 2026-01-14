'use client';

import React from 'react';
import Link from 'next/link';
import './learning-path.css';

const steps = [
    { id: 1, name: 'El cine', avatar: '/avatars/avatar_1.png', icon: '🎬', interactive: true, link: '/conversation', status: 'current', stars: 0 },
    { id: 2, name: 'Flyplassen', avatar: '/avatars/avatar_2.png', icon: '✈️', interactive: false, status: 'locked', stars: 0 },
    { id: 3, name: 'Matbutikken', avatar: '/avatars/avatar_3.png', icon: '🛒', interactive: false, status: 'locked', stars: 0 },
    { id: 4, name: 'Hotellet', avatar: '/avatars/avatar_4.png', icon: '🏨', interactive: false, status: 'locked', stars: 0 },
    { id: 5, name: 'Skolen', avatar: '/avatars/avatar_5.png', icon: '📚', interactive: false, status: 'locked', stars: 0 },
];

// Stats for header
const userStats = {
    streak: 4,
    gems: 240,
    hearts: 5
};

export default function LearningPath() {
    return (
        <div className="learning-path-container">
            {/* Sky Elements */}
            <div className="sun"></div>
            <div className="butterfly" style={{ top: '25%', left: '-5%' }}></div>
            
            {/* Decorative Trees */}
            <div className="tree-left"></div>
            <div className="tree-right"></div>
            
            {/* Bushes and Flowers */}
            <div className="bush" style={{ top: '55%', left: '2%' }}></div>
            <div className="flower" style={{ top: '68%', right: '8%' }}></div>
            <div className="flower" style={{ top: '45%', left: '8%' }}></div>
            
            {/* Top Header with Stats */}
            <header className="learning-path-header">
                <div className="header-stats">
                    <div className="stat-item">
                        <span className="icon">🇪🇸</span>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-item streak">
                        <span className="icon">🔥</span>
                        <span>{userStats.streak}</span>
                    </div>
                    <div className="stat-item gems">
                        <span className="icon">💎</span>
                        <span>{userStats.gems}</span>
                    </div>
                    <div className="stat-item hearts">
                        <span className="icon">❤️</span>
                        <span>{userStats.hearts}</span>
                    </div>
                </div>
            </header>

            {/* Section Banner */}
            <div className="section-banner">
                <p className="section-label">Seksjon 1</p>
                <h2 className="section-title">Lær spanske samtaler</h2>
            </div>

            {/* Path Area with Nodes */}
            <div className="path-area">
                {/* Dirt Path SVG */}
                <svg className="path-svg" viewBox="0 0 420 900" preserveAspectRatio="none">
                    {/* Main dirt path */}
                    <path
                        d="M 210 850 
                           C 100 800, 80 700, 120 650
                           S 280 550, 280 500
                           S 100 420, 100 350
                           S 280 280, 280 220
                           S 150 150, 210 80"
                        className="path-line"
                    />
                    {/* Inner lighter path */}
                    <path
                        d="M 210 850 
                           C 100 800, 80 700, 120 650
                           S 280 550, 280 500
                           S 100 420, 100 350
                           S 280 280, 280 220
                           S 150 150, 210 80"
                        className="path-line-inner"
                    />
                    {/* Dotted center line */}
                    <path
                        d="M 210 850 
                           C 100 800, 80 700, 120 650
                           S 280 550, 280 500
                           S 100 420, 100 350
                           S 280 280, 280 220
                           S 150 150, 210 80"
                        className="path-dots"
                    />
                </svg>

                {/* Lesson Nodes */}
                {steps.map((step, index) => {
                    const nodeClass = `path-node node-${index} ${step.interactive ? 'interactive' : ''} ${step.status}`;
                    
                    const NodeContent = () => (
                        <div className="node-content">
                            <div className="node-shield">
                                {step.status === 'locked' ? (
                                    <span className="node-icon">🔒</span>
                                ) : (
                                    <img src={step.avatar} alt={step.name} className="avatar-img" />
                                )}
                            </div>
                        </div>
                    );

                    return (
                        <div key={step.id} className={nodeClass}>
                            {step.interactive ? (
                                <Link href={step.link}>
                                    <NodeContent />
                                </Link>
                            ) : (
                                <NodeContent />
                            )}
                            <span className="node-label">{step.name}</span>
                            {/* Stars */}
                            <div className="node-stars">
                                {[1, 2, 3].map((star) => (
                                    <span 
                                        key={star} 
                                        className={`node-star ${star <= step.stars ? 'filled' : ''}`}
                                    >
                                        ⭐
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Decorative pebbles */}
                <div className="pebble" style={{ top: '30%', left: '35%' }} />
                <div className="pebble" style={{ top: '50%', right: '30%' }} />
                <div className="pebble" style={{ top: '70%', left: '40%' }} />
                
                {/* More decorative elements */}
                <div className="grass-patch" style={{ top: '80%', left: '15%' }} />
                <div className="grass-patch" style={{ top: '60%', right: '18%' }} />
            </div>
        </div>
    );
}
