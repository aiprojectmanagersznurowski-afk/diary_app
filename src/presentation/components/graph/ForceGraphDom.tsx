'use dom';

import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData } from '../../../domain/models/Graph';
import { getNoteTypeColor } from '../../../domain/models/NoteDocument';

export interface ForceGraphDomProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  dom?: import('expo/dom').DOMProps;
}

export default function ForceGraphDom({ data, width = 350, height = 500, onNodeClick }: ForceGraphDomProps) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#0B0F19' }}>
      <ForceGraph2D
        width={width}
        height={height}
        graphData={data}
        backgroundColor="#0B0F19"
        nodeId="id"
        nodeLabel={(node: any) =>
          `${node.title || node.day} (${node.kind === 'daily' ? 'Wpis dnia' : node.noteType || 'Notatka'})`
        }
        nodeColor={(node: any) => {
          if (node.kind === 'daily') return '#3B82F6';
          if (node.noteType) return getNoteTypeColor(node.noteType);
          return '#9CA3AF';
        }}
        nodeRelSize={6}
        linkColor={(link: any) => {
          if (link.kind === 'day') return '#38BDF8';
          if (link.kind === 'semantic') return '#A78BFA';
          return '#6B7280';
        }}
        linkWidth={(link: any) => (link.score ? Math.max(1, link.score * 3) : 1)}
        linkDirectionalParticles={(link: any) => (link.kind === 'semantic' ? 2 : 0)}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node: any) => {
          if (node?.id && onNodeClick) {
            onNodeClick(node.id);
          }
        }}
      />
    </div>
  );
}
