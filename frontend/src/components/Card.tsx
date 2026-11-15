import React from 'react';
import { Card as CardType, Rank, Suit } from 'shared';
import { motion } from 'framer-motion';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  scoreValue?: number;
  isWildcardJoker?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  card,
  faceDown = false,
  isSelected = false,
  isPlayable = true,
  disabled = false,
  size = 'md',
  scoreValue,
  isWildcardJoker = false,
  onClick,
  className = '',
}) => {
  // Dimensions
  const sizeClasses = {
    sm: 'w-11 h-16 text-xs rounded-md',
    md: 'w-16 h-24 sm:w-20 sm:h-28 text-sm rounded-lg',
    lg: 'w-20 h-28 sm:w-24 sm:h-36 text-base rounded-xl',
  }[size];

  if (faceDown || !card) {
    return (
      <div
        onClick={!disabled && onClick ? onClick : undefined}
        className={`relative ${sizeClasses} bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 border-2 border-indigo-400/40 shadow-card flex items-center justify-center overflow-hidden cursor-pointer select-none transition-transform ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
        } ${className}`}
      >
        <div className="absolute inset-1 border border-indigo-300/30 rounded flex items-center justify-center">
          <svg className="w-3/5 h-3/5 text-indigo-400/40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" />
          </svg>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'H' || card.suit === 'D';
  const isJoker = card.isJoker || card.suit === 'JOKER' || card.rank === 'JOKER';

  const suitSymbol = (suit: Suit) => {
    switch (suit) {
      case 'S':
        return '♠';
      case 'H':
        return '♥';
      case 'D':
        return '♦';
      case 'C':
        return '♣';
      default:
        return '★';
    }
  };

  const suitColor = isJoker
    ? 'text-amber-500'
    : isRed
    ? 'text-red-600'
    : 'text-slate-900';

  return (
    <motion.div
      onClick={!disabled && onClick ? onClick : undefined}
      animate={{
        y: isSelected ? -14 : 0,
        scale: isSelected ? 1.05 : 1,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`relative ${sizeClasses} bg-white border border-slate-300 shadow-card flex flex-col justify-between p-1.5 sm:p-2 cursor-pointer select-none font-bold overflow-hidden ${
        isSelected
          ? 'ring-4 ring-emerald-500 shadow-emerald-500/30 shadow-xl'
          : disabled
          ? 'opacity-60 cursor-not-allowed'
          : isPlayable
          ? 'hover:-translate-y-1 hover:shadow-card-hover'
          : ''
      } ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`flex flex-col items-center leading-none ${suitColor}`}>
        <span className="font-extrabold tracking-tight">
          {isJoker ? 'JK' : card.rank}
        </span>
        <span className="text-[10px] sm:text-xs">{suitSymbol(card.suit)}</span>
      </div>

      {/* Center Art */}
      <div className={`self-center my-auto ${suitColor} flex flex-col items-center justify-center`}>
        {isJoker ? (
          <div className="flex flex-col items-center">
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 animate-pulse"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
            </svg>
            <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">
              Joker
            </span>
          </div>
        ) : ['J', 'Q', 'K'].includes(card.rank) ? (
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-2xl opacity-90">
              {card.rank === 'K' ? '♚' : card.rank === 'Q' ? '♛' : '♝'}
            </span>
            <span className="text-[9px] sm:text-[10px] opacity-75">{suitSymbol(card.suit)}</span>
          </div>
        ) : (
          <span className="text-xl sm:text-2xl">{suitSymbol(card.suit)}</span>
        )}
      </div>

      {/* Bottom Right Inverted Rank & Suit */}
      <div className={`flex flex-col items-center leading-none rotate-180 self-end ${suitColor}`}>
        <span className="font-extrabold tracking-tight">
          {isJoker ? 'JK' : card.rank}
        </span>
        <span className="text-[10px] sm:text-xs">{suitSymbol(card.suit)}</span>
      </div>

      {/* External Cut Joker Badge */}
      {isWildcardJoker && !isJoker && (
        <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded shadow uppercase tracking-tight leading-none flex items-center space-x-0.5">
          <span>★</span>
          <span>0</span>
        </div>
      )}

      {/* Optional Score Value Pill */}
      {scoreValue !== undefined && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-semibold">
          {scoreValue} pts
        </div>
      )}
    </motion.div>
  );
};

