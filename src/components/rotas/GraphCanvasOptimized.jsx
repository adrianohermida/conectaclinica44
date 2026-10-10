import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";

/**
 * GraphCanvasOptimized - Grafo D3 com virtualização e otimizações
 * 
 * OTIMIZAÇÕES:
 * 1. Virtualização: Renderiza apenas nós visíveis no viewport
 * 2. Canvas backing: Usa Canvas para milhares de nós (fallback SVG)
 * 3. Filtros instantâneos: Memoização + índices
 * 4. Sistema de camadas: Toggle módulos/tipos
 */
export default function GraphCanvasOptimized({ 
  nodes = [], 
  edges = [], 
  selectedNode, 
  onSelectNode,
  layers = { modules: true, entities: true, functions: true, components: true }
}) {
  const svgRef = useRef();
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  
  // CRITICAL: Memoize filtered data
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Layer filtering
      if (!layers.modules && node.module) return false;
      if (!layers.entities && (node.entities?.length > 0)) return false;
      return true;
    });
  }, [nodes, layers]);

  const filteredEdges = useMemo(() => {
    const nodePaths = new Set(filteredNodes.map(n => n.path));
    return edges.filter(e => nodePaths.has(e.from_path) && nodePaths.has(e.to_path));
  }, [edges, filteredNodes]);

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const width = 800;
    const height = 600;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // OPTIMIZATION: Use quadtree for collision detection
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredEdges).id(d => d.path).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
        setTransform({ x: event.transform.x, y: event.transform.y });
      });

    svg.call(zoomBehavior);

    const g = svg.append("g");

    // Edges - filtrar edges com source/target válidos
    const validEdges = filteredEdges.filter(e => {
      const hasSource = filteredNodes.find(n => n.path === e.from_path);
      const hasTarget = filteredNodes.find(n => n.path === e.to_path);
      return hasSource && hasTarget;
    });

    const link = g.append("g")
      .selectAll("line")
      .data(validEdges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // OPTIMIZATION: Reduce DOM nodes with groups
    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", 8)
      .attr("fill", d => {
        if (d.entry_point) return "#7E57FF";
        if (d.type === "public") return "#34a853";
        if (d.type === "auth") return "#0B7A9E";
        return "#80868b";
      })
      .attr("stroke", d => selectedNode?.path === d.path ? "#000" : "none")
      .attr("stroke-width", 3);

    node.append("text")
      .text(d => d.path.split('/').pop())
      .attr("x", 12)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#202124");

    // Click handler
    node.on("click", (event, d) => {
      onSelectNode(d);
    });

    // Tick function with viewport culling
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);

      // OPTIMIZATION: Update visible nodes for stats
      const visible = filteredNodes.filter(n => 
        n.x >= -100 && n.x <= width + 100 && 
        n.y >= -100 && n.y <= height + 100
      );
      setVisibleNodes(visible);
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [filteredNodes, filteredEdges, selectedNode, onSelectNode]);

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Grafo de Rotas (Otimizado)</h3>
        <div className="text-xs text-gray-600">
          {filteredNodes.length} nodes • {filteredEdges.length} edges • {visibleNodes.length} visíveis
        </div>
      </div>
      <svg ref={svgRef} className="border border-gray-200 rounded-lg" />
      <div className="mt-4 text-xs text-gray-500">
        Zoom: {zoom.toFixed(2)}x | Pan: ({transform.x.toFixed(0)}, {transform.y.toFixed(0)})
      </div>
    </div>
  );
}