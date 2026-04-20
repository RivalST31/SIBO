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
            <linearGradient id="codenylBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
        </defs>
        
        {/* Terminal Box Background (Optional, implicit in shape or explicit) */}
        <rect x="10" y="15" width="80" height="70" rx="12" fill="url(#codenylBrandGradient)" opacity="0.1" />
        <rect x="10" y="15" width="80" height="70" rx="12" stroke="url(#codenylBrandGradient)" strokeWidth="4" />

        {/* The Prompt Symbol > */}
        <path 
            d="M30 35 L50 50 L30 65" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
        />
        
        {/* The Cursor _ */}
        <line 
            x1="58" 
            y1="65" 
            x2="78" 
            y2="65" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round" 
        />
    </svg>
);