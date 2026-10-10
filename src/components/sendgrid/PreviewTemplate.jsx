import React from "react";
import { Smartphone, Monitor } from "lucide-react";

/**
 * SPRINT 4: Preview responsivo template SendGrid
 * Mobile + Desktop view
 */
export default function PreviewTemplate({ htmlContent, variaveis = {} }) {
  const [device, setDevice] = React.useState('desktop');

  // Substituir variáveis no HTML
  let preview = htmlContent;
  Object.entries(variaveis).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    preview = preview.replace(new RegExp(`{{{${key}}}}`, 'g'), value);
  });

  return (
    <div className="pc-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Preview Responsivo</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setDevice('mobile')}
            className={`p-2 rounded-lg ${device === 'mobile' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-lg ${device === 'desktop' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`mx-auto bg-gray-100 rounded-lg overflow-hidden ${device === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
        <iframe
          srcDoc={preview}
          className="w-full h-[600px] bg-white"
          sandbox="allow-same-origin"
          title="Preview Template"
        />
      </div>
    </div>
  );
}