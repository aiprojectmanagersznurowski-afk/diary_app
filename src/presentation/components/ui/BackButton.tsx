import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { RoundIconButton } from './RoundIconButton';

/** Przycisk wstecz: chevron w szklanym kółku 40 px, domyślnie cofa stos nawigacji. */
export const BackButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const navigation = useNavigation();
  return (
    <RoundIconButton icon="chevron-left" accessibilityLabel="Wstecz" onPress={onPress ?? (() => navigation.goBack())} />
  );
};
