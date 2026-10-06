import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ACCENTS } from '../ui';

/** Płomień serii (ścieżka z prototypu), kolor bursztynowy. */
export const FlameIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2c1.2 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-3 1.6-4.7 2.8-5.8.2 1.8 1.1 2.9 2.2 3.4.4-3.2-.7-5.8.5-8.6z"
      fill={ACCENTS.amber}
    />
  </Svg>
);
