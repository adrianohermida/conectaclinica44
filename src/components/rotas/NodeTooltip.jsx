import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NodeTooltip({ node, position }) {
  if (!node) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed z-50 bg-white shadow-xl rounded-lg p-4 border-2 border-purple-200 max-w-sm"
        style={{
          left: position.x + 20,
          top: position.y - 100,
          pointerEvents: 'none'
        }}
      >
        <div className="text-sm font-bold mb-2 text-gray-900">{node.path}</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Performance</div>
            <div className="font-bold text-lg">{node.score_perf}/100</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">TTI</div>
            <div className="font-bold text-lg">{node.tti_ms}ms</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">INP</div>
            <div className="font-bold text-lg">{node.inp_ms}ms</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Visitas/30d</div>
            <div className="font-bold text-lg">{node.visits_30d}</div>
          </div>
        </div>

        <div className="mt-2 flex gap-1 flex-wrap">
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{node.type}</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{node.module}</span>
          {node.entry_point && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Entry</span>}
          {node.score_perf < 70 && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">⚠️ Slow</span>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}