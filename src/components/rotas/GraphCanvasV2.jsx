import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * GraphCanvasV2 - D3 Force-Directed Graph REAL
 * Drag completo, edge labels, tooltips ricos
 */
export default function GraphCanvasV2({ nodes, edges, onSelectNode }) {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, window.innerHeight - 300)
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!nodes || nodes.length === 0 || !svgRef.current) return;

    const { width, height } = dimensions;
    
    // VALIDAÇÃO ULTRA-DEFENSIVA
    const validNodes = nodes.filter(n => n && typeof n === 'object' && n.id && n.path);
    if (validNodes.length === 0) {
      console.warn('[GraphCanvasV2] ❌ Nenhum node válido (precisa id + path)');
      return;
    }

    // LIMPAR
    d3.select(svgRef.current).selectAll('*').remove();

    // SVG SETUP
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    // ZOOM
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // CRIAR SET de IDs válidos + MAP path->ID
    const validNodeIds = new Set(validNodes.map(n => n.id));
    const pathToId = new Map(validNodes.map(n => [n.path, n.id]));
    
    // FILTRAR edges - APENAS aqueles com source/target VÁLIDOS
    const validEdges = (edges || [])
      .filter(e => e && e.from_path && e.to_path)
      .map(e => {
        const sourceId = pathToId.get(e.from_path);
        const targetId = pathToId.get(e.to_path);
        
        // Validar que AMBOS os IDs existem no set
        if (!sourceId || !targetId || !validNodeIds.has(sourceId) || !validNodeIds.has(targetId)) {
          return null;
        }
        
        return {
          ...e,
          source: sourceId,
          target: targetId
        };
      })
      .filter(e => e !== null);

    console.log('[GraphCanvasV2] ✅ Nodes:', validNodes.length, 'Edges:', validEdges.length);

    // FORÇA DIRIGIDA com validação
    const simulation = d3.forceSimulation(validNodes)
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Aplicar forceLink APENAS se houver edges válidos
    if (validEdges.length > 0) {
      try {
        simulation.force('link', d3.forceLink(validEdges)
          .id(d => d.id)
          .distance(120)
          .strength(0.5));
      } catch (err) {
        console.error('[GraphCanvasV2] ❌ Erro em forceLink:', err);
        console.log('Nodes IDs:', Array.from(validNodeIds));
        console.log('Sample edge:', validEdges[0]);
      }
    }

    // EDGES
    const link = g.append('g')
      .selectAll('line')
      .data(validEdges)
      .join('line')
      .attr('stroke', d => {
        if (d.is_broken) return '#ea4335';
        if (d.is_loop) return '#fbbc04';
        if (d.drop_off_rate > 20) return '#ff6b6b';
        return '#bdc1c6';
      })
      .attr('stroke-width', d => Math.max(1, Math.min(5, (d.count_30d || 0) / 100)))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // ARROW MARKER
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#bdc1c6');

    // EDGE LABELS
    const edgeLabel = g.append('g')
      .selectAll('text')
      .data(validEdges)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#5f6368')
      .attr('text-anchor', 'middle')
      .text(d => {
        if (d.drop_off_rate > 10) return `⚠️ ${d.drop_off_rate.toFixed(0)}%`;
        if (d.count_30d > 100) return `🔥 ${d.count_30d}`;
        return '';
      });

    // NODES
    const node = g.append('g')
      .selectAll('g')
      .data(validNodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d) => {
        onSelectNode?.(d);
      })
      .on('mouseenter', (event, d) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltip({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY - 10,
          data: d
        });
      })
      .on('mouseleave', () => setTooltip(null));

    // NODE CIRCLES
    node.append('circle')
      .attr('r', d => {
        if (d.entry_point) return 24;
        if (d.visits_30d > 500) return 20;
        return 16;
      })
      .attr('fill', d => {
        if (d.type === 'public') return '#34a853';
        if (d.type === 'superadmin') return '#ea4335';
        if (d.score_perf < 60) return '#ff6b6b';
        return '#7E57FF';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // NODE LABELS
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', '#202124')
      .text(d => d.path.replace('/', '').substring(0, 15));

    // PERFORMANCE BADGE
    node.filter(d => d.score_perf < 70)
      .append('circle')
      .attr('cx', 15)
      .attr('cy', -15)
      .attr('r', 8)
      .attr('fill', '#fbbc04');

    node.filter(d => d.score_perf < 70)
      .append('text')
      .attr('x', 15)
      .attr('y', -11)
      .attr('text-anchor', 'middle')
      .attr('font-size', 8)
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text('⚡');

    // SIMULATION TICK
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      edgeLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // DRAG FUNCTIONS
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [nodes, edges, dimensions, onSelectNode]);

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#34a853' }} />
          <span>Pública</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7E57FF' }} />
          <span>Autenticada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ea4335' }} />
          <span>Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff6b6b' }} />
          <span>Performance Ruim</span>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs max-w-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none'
          }}
        >
          <div className="font-bold mb-2">{tooltip.data.path}</div>
          <div className="space-y-1 text-gray-300">
            <div>Tipo: <span className="text-white">{tooltip.data.type}</span></div>
            <div>Módulo: <span className="text-white">{tooltip.data.module}</span></div>
            <div>Performance: <span className={tooltip.data.score_perf < 60 ? 'text-red-400' : 'text-green-400'}>{tooltip.data.score_perf}/100</span></div>
            <div>TTI: <span className="text-white">{tooltip.data.tti_ms}ms</span></div>
            <div>Visitas 30d: <span className="text-white">{tooltip.data.visits_30d || 0}</span></div>
            <div>Drop-off: <span className={tooltip.data.drop_off_rate > 20 ? 'text-red-400' : 'text-white'}>{tooltip.data.drop_off_rate?.toFixed(1) || 0}%</span></div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400 text-[10px]">
            Clique para mais detalhes
          </div>
        </div>
      )}
    </div>
  );
}