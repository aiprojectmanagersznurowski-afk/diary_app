import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import ForceGraphDom from './ForceGraphDom';
import { GraphData } from '../../../domain/models/Graph';

interface ForceGraphViewProps {
  data: GraphData;
  categoryColors?: Record<string, string>;
  onNodeClick?: (nodeId: string) => void;
}

export const ForceGraphView: React.FC<ForceGraphViewProps> = ({ data, categoryColors, onNodeClick }) => {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <ForceGraphDom
        data={data}
        categoryColors={categoryColors}
        width={width}
        height={Math.max(300, height - 120)}
        onNodeClick={onNodeClick}
        dom={{ matchContents: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});
