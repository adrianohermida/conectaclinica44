import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-xl font-bold text-white">ConectaClínica</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Plataforma completa de gestão para clínicas médicas com IA integrada.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-3">
              <li><a href="#recursos" className="text-sm hover:text-white transition-colors">Recursos</a></li>
              <li><Link to={createPageUrl("PlanosPrecos")} className="text-sm hover:text-white transition-colors">Planos e Preços</Link></li>
              <li><Link to={createPageUrl("Blog")} className="text-sm hover:text-white transition-colors">Blog</Link></li>
              <li><Link to={createPageUrl("StatusSistema")} className="text-sm hover:text-white transition-colors">Status do Sistema</Link></li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h3 className="text-white font-semibold mb-4">Suporte</h3>
            <ul className="space-y-3">
              <li><Link to={createPageUrl("CentralAjudaPublica")} className="text-sm hover:text-white transition-colors">Central de Ajuda</Link></li>
              <li><Link to={createPageUrl("Contato")} className="text-sm hover:text-white transition-colors">Fale Conosco</Link></li>
              <li><a href="mailto:suporte@conectaclinica.com.br" className="text-sm hover:text-white transition-colors">suporte@conectaclinica.com.br</a></li>
              <li><a href="tel:+5511999999999" className="text-sm hover:text-white transition-colors">(11) 99999-9999</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link to={createPageUrl("TermosUso")} className="text-sm hover:text-white transition-colors">Termos de Uso</Link></li>
              <li><Link to={createPageUrl("PoliticaPrivacidade")} className="text-sm hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><Link to={createPageUrl("ComplianceLGPD")} className="text-sm hover:text-white transition-colors">LGPD</Link></li>
              <li><Link to={createPageUrl("SobreNos")} className="text-sm hover:text-white transition-colors">Sobre Nós</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © 2026 ConectaClínica. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>São Paulo, Brasil</span>
          </div>
        </div>
      </div>
    </footer>
  );
}