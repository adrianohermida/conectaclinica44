import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function Sitemap() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    const gerarSitemap = async () => {
      const posts = await base44.entities.Blog.filter({ publicado: true });
      
      const urls = [
        { loc: window.location.origin + createPageUrl("Home"), priority: "1.0" },
        { loc: window.location.origin + createPageUrl("PlanosPrecos"), priority: "0.9" },
        { loc: window.location.origin + createPageUrl("SobreNos"), priority: "0.8" },
        { loc: window.location.origin + createPageUrl("Blog"), priority: "0.8" },
        { loc: window.location.origin + createPageUrl("Contato"), priority: "0.7" },
        ...posts.map(p => ({
          loc: window.location.origin + `${createPageUrl("BlogPost")}?id=${p.id}`,
          priority: "0.6",
          lastmod: p.updated_date
        }))
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <priority>${url.priority}</priority>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

      // Display XML
      document.body.innerHTML = `<pre>${xml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
      document.body.style.fontFamily = 'monospace';
      document.body.style.padding = '20px';
    };

    gerarSitemap();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden" style={{ backgroundColor: '#F4F7FA' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#7E57FF' }} aria-label="Carregando sitemap" />
          <p style={{ color: '#5f6368', fontSize: '16px' }}>Gerando sitemap...</p>
        </div>
      </div>
    );
  }

  return <div className="p-8 overflow-x-hidden" style={{ fontSize: '14px' }} role="main" aria-label="Sitemap XML">Gerando sitemap...</div>;
}