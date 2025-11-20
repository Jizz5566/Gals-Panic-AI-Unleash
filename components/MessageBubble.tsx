import React from 'react';
import { ChatMessage } from '../types';
import { GroundingSources } from './GroundingSources';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';

  // Simple formatter to handle markdown bolding and newlines for display
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Handle Headers
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-retro-secondary text-xl font-bold mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-retro-accent text-lg font-bold mt-3 mb-1">{line.replace('### ', '')}</h4>;
      }
      // Handle Bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
         return <li key={i} className="ml-4 list-disc marker:text-retro-accent">{line.replace(/^[\*\-]\s/, '')}</li>
      }
      
      return <p key={i} className="mb-2 min-h-[1.2em] leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[90%] md:max-w-[80%] rounded-lg p-5 border ${
        isModel 
          ? 'bg-retro-card border-retro-secondary/30 text-retro-text' 
          : 'bg-retro-accent/10 border-retro-accent text-white'
      }`}>
        <div className="font-mono text-xs opacity-50 mb-2 uppercase">
          {isModel ? 'ARCHIVE_CORE_AI' : 'USER_INPUT'}
        </div>
        
        <div className="text-sm md:text-base space-y-1">
          {formatText(message.content)}
        </div>

        {isModel && message.groundingChunks && (
          <GroundingSources chunks={message.groundingChunks} />
        )}
      </div>
    </div>
  );
};