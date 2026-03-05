'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  { icon: '📄', text: 'Reading your resume…' },
  { icon: '🔍', text: 'Identifying your skills and expertise…' },
  { icon: '🏷️', text: 'Categorising your domains…' },
  { icon: '✨', text: 'Polishing your professional summary…' },
  { icon: '🎯', text: 'Almost ready…' },
];

export default function ProcessingStep() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const current = MESSAGES[msgIndex];

  return (
    <div className="card text-center py-16 animate-fade-in">
      {/* Animated AI logo */}
      <div className="relative w-20 h-20 mx-auto mb-8">
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        {/* Inner icon */}
        <div className="absolute inset-2 bg-gradient-to-br from-blue-600 to-violet-600 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is reading your resume</h2>
      <p className="text-gray-400 text-sm mb-8">Powered by Claude Haiku 4.5</p>

      {/* Animated status message */}
      <div key={msgIndex} className="animate-fade-in flex items-center justify-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 max-w-xs mx-auto">
        <span className="text-2xl">{current.icon}</span>
        <span className="text-blue-700 font-medium text-sm">{current.text}</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {MESSAGES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i <= msgIndex
                ? 'w-3 h-3 bg-blue-600'
                : 'w-2 h-2 bg-gray-200'
            }`}
          />
        ))}
      </div>

      <p className="text-gray-400 text-xs mt-6">This usually takes 5–10 seconds</p>
    </div>
  );
}
