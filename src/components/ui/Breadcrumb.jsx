import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
      <Link 
        to="/" 
        className="text-gray-500 hover:text-[#0B7A9E] transition-colors flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Início</span>
      </Link>
      
      {items.map((item, idx) => [
        <ChevronRight key={`chevron-${idx}`} className="w-4 h-4 text-gray-400" />,
        item.href ? (
          <Link 
            key={`link-${idx}`}
            to={item.href} 
            className="text-gray-500 hover:text-[#0B7A9E] transition-colors"
          >
            {item.label}
          </Link>
        ) : (
          <span key={`span-${idx}`} className="text-gray-800 font-medium">{item.label}</span>
        )
      ])}
    </nav>
  );
}