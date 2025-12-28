import React from 'react';

export const CodenylLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <defs>
            <linearGradient id="codenylGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" stroke="url(#codenylGradient)" strokeWidth="8" />
        <path 
            d="M35 35 L65 35 L65 50 L45 50 L45 65 L65 65" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
        />
        <circle cx="35" cy="35" r="5" fill="white" />
    </svg>
);