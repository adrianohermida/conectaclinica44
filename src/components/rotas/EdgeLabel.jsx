import React from "react";

export default function EdgeLabel({ edge, x, y }) {
  if (!edge || edge.drop_off_rate === undefined) return null;

  const isHighDropOff = edge.drop_off_rate > 10;
  const isBroken = edge.is_broken;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="-20"
        y="-10"
        width="40"
        height="20"
        fill={isBroken ? "#ef4444" : isHighDropOff ? "#f97316" : "#10b981"}
        rx="4"
        opacity="0.9"
      />
      <text
        x="0"
        y="5"
        textAnchor="middle"
        fontSize="10"
        fill="white"
        fontWeight="bold"
      >
        {isBroken ? '❌' : `${edge.drop_off_rate.toFixed(1)}%`}
      </text>
    </g>
  );
}