import React from 'react';
import { GroundingChunk } from '../types';

interface GroundingSourcesProps {
  chunks: GroundingChunk[];
}

export const GroundingSources: React.FC<GroundingSourcesProps> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;

  // Filter out duplicates based on URI
  const uniqueSources = chunks.reduce((acc, chunk) => {
    if (chunk.web?.uri && !acc.some(s => s.web?.uri === chunk.web?.uri)) {
      acc.push(chunk);
    }
    return acc;
  }, [] as GroundingChunk[]);

  if (uniqueSources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-retro-card">
      <h4 className="text-xs font-mono text-retro-secondary mb-2 uppercase tracking-widest">
        Source Data / Grounding
      </h4>
      <div className="flex flex-wrap gap-2">
        {uniqueSources.map((chunk, index) => (
          <a
            key={index}
            href={chunk.web?.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center bg-retro-bg border border-retro-accent/30 hover:border-retro-accent text-retro-text text-xs px-3 py-1.5 rounded transition-colors duration-200"
          >
            <span className="truncate max-w-[200px]">{chunk.web?.title || chunk.web?.uri}</span>
            <svg className="w-3 h-3 ml-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
};