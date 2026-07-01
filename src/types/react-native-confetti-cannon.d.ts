declare module 'react-native-confetti-cannon' {
  import React from 'react';
  
  export interface ConfettiCannonProps {
    count: number;
    origin: {
      x: number;
      y: number;
    };
    colors?: string[];
    fallSpeed?: number;
    fadeOut?: boolean;
    autoStart?: boolean;
    onAnimationEnd?: () => void;
  }
  
  export default class ConfettiCannon extends React.Component<ConfettiCannonProps> {}
}
