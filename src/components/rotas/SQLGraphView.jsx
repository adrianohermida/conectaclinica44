import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Database, Zap, Component } from 'lucide-react';

/**
 * SQLGraphView - Grafo estilo Supabase SQL Editor
 * Visualiza entities/functions/components como nós conectados
 */
export default function SQLGraphView({ modules }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = React.useRef();

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    Object.entries(modules).forEach(([moduleName, moduleData]) => {
      // Entity nodes
      (moduleData.entities || []).forEach(entity => {
        nodes.push({
          id: `entity:${entity}`,
          label: entity,
          type: 'entity',
          module: moduleName,
          group: 1
        });
      });

      // Function nodes
      (moduleData.functions || []).forEach(func => {
        nodes.push({
          id: `function:${func}`,
          label: func,
          type: 'function',
          module: moduleName,
          group: 2
        });
      });

      // Component nodes
      (moduleData.components || []).forEach(comp => {
        nodes.push({
          id: `component:${comp}`,
          label: comp,
          type: 'component',
          module: moduleName,
          group: 3
        });
      });

      // Links heurísticos: functions → entities
      (moduleData.functions || []).forEach(func => {
        (moduleData.entities || []).forEach(entity => {
          if (func.toLowerCase().includes(entity.toLowerCase().slice(0, 6))) {
            links.push({
              source: `function:${func}`,
              target: `entity:${entity}`,
              type: 'accesses'
            });
          }
        });
      });

      // Links: components → entities
      (moduleData.components || []).forEach(comp => {
        (moduleData.entities || []).forEach(entity => {
          if (comp.toLowerCase().includes(entity.toLowerCase().slice(0, 6))) {
            links.push({
              source: `component:${comp}`,
              target: `entity:${entity}`,
              type: 'uses'
            });
          }
        });
      });
    });

    return { nodes, links };
  }, [modules]);

  React.useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const width = 1400;
    const height = 800;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', '#bdc1c6')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4);

    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on('mouseenter', (event, d) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltip({ x: rect.left, y: rect.top - 10, data: d });
      })
      .on('mouseleave', () => setTooltip(null));

    node.append('rect')
      .attr('width', 80)
      .attr('height', 24)
      .attr('x', -40)
      .attr('y', -12)
      .attr('rx', 4)
      .attr('fill', d => {
        if (d.type === 'entity') return '#34a853';
        if (d.type === 'function') return '#7E57FF';
        return '#0B7A9E';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 9)
      .attr('fill', '#fff')
      .attr('font-weight', 600)
      .text(d => d.label.length > 12 ? d.label.substring(0, 12) + '...' : d.label);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [graphData]);

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🗄️ SQL Graph (Entities/Functions/Components)</h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4" style={{ color: '#34a853' }} />
            <span>Entities ({graphData.nodes.filter(n => n.type === 'entity').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" style={{ color: '#7E57FF' }} />
            <span>Functions ({graphData.nodes.filter(n => n.type === 'function').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Component className="w-4 h-4" style={{ color: '#0B7A9E' }} />
            <span>Components ({graphData.nodes.filter(n => n.type === 'component').length})</span>
          </div>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none'
          }}
        >
          <div className="font-bold">{tooltip.data.label}</div>
          <div className="text-gray-400 mt-1">
            Tipo: {tooltip.data.type} | Módulo: {tooltip.data.module}
          </div>
        </div>
      )}
    </div>
  );
}