'use dom';

import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData, getNodeColor } from '../../../domain/models/Graph';

export interface ForceGraphDomProps {
  data: GraphData;
  categoryColors?: Record<string, string>;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  dom?: import('expo/dom').DOMProps;
}

export default function ForceGraphDom({
  data,
  categoryColors,
  width = 350,
  height = 500,
  onNodeClick,
}: ForceGraphDomProps) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#0B0F19' }}>
      <ForceGraph2D
        width={width}
        height={height}
        graphData={data}
        backgroundColor="#0B0F19"
        nodeId="id"
        nodeVal={(node: any) => (node.kind === 'daily' ? 14 : 5)}
        nodeColor={(node: any) => getNodeColor(node, categoryColors)}
        nodeLabel={(node: any) => {
          if (node.kind === 'daily') {
            return `📅 Wpis dnia: ${node.title || node.day}`;
          }
          const cat = node.categoryName ? ` [${node.categoryName}]` : '';
          const type = node.noteType ? ` (${node.noteType})` : '';
          return `${node.title || 'Notatka'}${type}${cat}`;
        }}
        nodeRelSize={4}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const isDaily = node.kind === 'daily';
          const r = Math.sqrt(Math.max(0, isDaily ? 14 : 5)) * 4;

          if (isDaily) {
            // Zewnętrzny pierścień dla węzła centralnego (wpis dnia)
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();

            // Etykieta daty pod węzłem centralnym
            const label = node.day || node.title;
            if (label) {
              const fontSize = Math.max(9, 12 / globalScale);
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = '#E0F2FE';
              ctx.fillText(label, node.x, node.y + r + 4);
            }
          } else {
            // Obwódka notatki
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();

            // Przy zbliżeniu wyświetlamy tytuł notatki
            if (globalScale > 1.2 && node.title) {
              const fontSize = Math.max(8, 10 / globalScale);
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              const displayTitle = node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title;
              ctx.fillText(displayTitle, node.x, node.y + r + 2);
            }
          }
        }}
        linkColor={(link: any) => {
          switch (link.kind) {
            case 'day':
              return 'rgba(56, 189, 248, 0.6)';
            case 'semantic':
              return 'rgba(167, 139, 250, 0.85)';
            case 'wikilink':
              return 'rgba(245, 158, 11, 0.85)';
            case 'manual':
              return 'rgba(52, 211, 153, 0.85)';
            default:
              return 'rgba(148, 163, 184, 0.4)';
          }
        }}
        linkWidth={(link: any) => {
          if (link.kind === 'day') return 1.5;
          if (link.kind === 'semantic') return Math.max(1, Math.min(5, (link.score || 0.5) * 4));
          return 1;
        }}
        linkDirectionalParticles={(link: any) => (link.kind === 'semantic' ? 2 : 0)}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={(link: any) => Math.max(1.5, (link.score || 0.5) * 3)}
        onNodeClick={(node: any) => {
          if (node?.id && onNodeClick) {
            onNodeClick(node.id);
          }
        }}
      />
    </div>
  );
}
