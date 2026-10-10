import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import NodeTooltip from "./NodeTooltip";
import EdgeLabel from "./EdgeLabel";

export default function GraphCanvas({ nodes, edges, selectedNode, onSelectNode }) {
  const svgRef = useRef();
  const width = 1200;
  const height = 800;
  const [tooltip, setTooltip] = useState({ node: null, position: { x: 0, y: 0 } });

  useEffect(() => {
    if (!nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    
    svg.call(zoom);

    // Força de simulação
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges.map(e => ({
        source: nodes.find(n => n.path === e.from_path),
        target: nodes.find(n => n.path === e.to_path)
      }))).id(d => d.path).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Cores por tipo
    const typeColors = {
      public: "#34a853",
      auth: "#7E57FF",
      admin: "#ea4335",
      superadmin: "#fbbc04"
    };

    // Arestas
    const link = g.append("g")
      .selectAll("line")
      .data(edges.map(e => ({
        source: nodes.find(n => n.path === e.from_path),
        target: nodes.find(n => n.path === e.to_path),
        ...e
      })))
      .enter()
      .append("line")
      .attr("stroke", d => d.is_broken ? "#ef4444" : "#e5e7eb")
      .attr("stroke-width", d => d.count_30d > 100 ? 3 : 1)
      .attr("stroke-dasharray", d => d.action === "redirect" ? "5,5" : "0");

    // Nós
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append("circle")
      .attr("r", d => d.entry_point ? 25 : 20)
      .attr("fill", d => typeColors[d.type] || "#9ca3af")
      .attr("stroke", d => d.id === selectedNode?.id ? "#000" : "#fff")
      .attr("stroke-width", d => d.id === selectedNode?.id ? 4 : 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => onSelectNode(d))
      .on("mouseenter", (event, d) => {
        setTooltip({ node: d, position: { x: event.pageX, y: event.pageY } });
      })
      .on("mouseleave", () => {
        setTooltip({ node: null, position: { x: 0, y: 0 } });
      });

    // Labels
    node.append("text")
      .text(d => d.path.split('/').pop() || 'root')
      .attr("x", 0)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#374151");

    // Performance overlay
    node.filter(d => d.score_perf < 70)
      .append("circle")
      .attr("r", 8)
      .attr("cx", 15)
      .attr("cy", -15)
      .attr("fill", "#ef4444");

    // Atualizar posições
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source?.x || 0)
        .attr("y1", d => d.source?.y || 0)
        .attr("x2", d => d.target?.x || 0)
        .attr("y2", d => d.target?.y || 0);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

  }, [nodes, edges, selectedNode]);

  return (
    <div className="pc-card p-4 bg-gray-50 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Schema Journey (Grafo Interativo)</h3>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#34a853]" /> Público</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#7E57FF]" /> Auth</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#ea4335]" /> Admin</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#fbbc04]" /> SuperAdmin</span>
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} className="border rounded" />
      <NodeTooltip node={tooltip.node} position={tooltip.position} />
    </div>
  );
}