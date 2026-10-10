import React, { useState, useRef, useEffect } from "react";
import { X, Tag, Plus } from "lucide-react";
import { toast } from "sonner";

/**
 * TagInput - Sistema de tags customizáveis
 * - Auto-complete com tags existentes
 * - Cores automáticas por hash
 * - Validação (max 20 chars, lowercase)
 */
const tagColors = [
  { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  { bg: '#f0fdfa', text: '#115e59', border: '#99f6e4' },
  { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
  { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe' }
];

export function getTagColor(tag) {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tagColors[hash % tagColors.length];
}

export default function TagInput({ tags = [], onChange, suggestions = [] }) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);


  const addTag = (tag) => {
    const normalized = tag.trim().toLowerCase();
    
    if (!normalized) return;
    
    if (normalized.length > 20) {
      toast.error('Tag muito longa (max 20 caracteres)');
      return;
    }

    if (tags.includes(normalized)) {
      toast.error('Tag já adicionada');
      return;
    }

    onChange([...tags, normalized]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const filteredSuggestions = suggestions
    .filter(s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      {/* Tags atuais */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const color = getTagColor(tag);
            return (
              <div
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{ 
                  backgroundColor: color.bg, 
                  color: color.text,
                  borderColor: color.border
                }}
              >
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite uma tag..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(inputValue);
              }
              if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            maxLength={20}
          />
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim()}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto"
            style={{ borderColor: '#e8eaed' }}
          >
            {filteredSuggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-all text-sm border-b last:border-b-0"
                style={{ borderColor: '#f1f3f4' }}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-gray-400" />
                  {suggestion}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Pressione Enter ou clique + para adicionar. Max 20 caracteres.
      </p>
    </div>
  );
}