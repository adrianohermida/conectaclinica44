import React from "react";
import { CheckCircle, AlertCircle, XIcon, Eye, Zap, Clock, ArrowRight, Calendar } from "lucide-react";

export default function EmailResultItem({ msg }) {
  const eventos = msg.events || [];
  const ultimoEvento = eventos[eventos.length - 1] || {};

  const getStatusBadge = (status) => {
    const config = {
      delivered: { bg: '#e6f7ed', color: '#137333', label: 'Entregue', icon: CheckCircle },
      bounce: { bg: '#fef2f2', color: '#991b1b', label: 'Bounce', icon: AlertCircle },
      dropped: { bg: '#fef9e5', color: '#854d0e', label: 'Descartado', icon: XIcon },
      open: { bg: '#e0f2fe', color: '#075985', label: 'Aberto', icon: Eye },
      click: { bg: '#f5f3ff', color: '#7E57FF', label: 'Clicado', icon: Zap },
      processed: { bg: '#f8f9fa', color: '#5f6368', label: 'Processado', icon: Clock },
      deferred: { bg: '#fef9e5', color: '#854d0e', label: 'Adiado', icon: Clock },
      spam_report: { bg: '#fef2f2', color: '#991b1b', label: 'Spam', icon: AlertCircle }
    };

    const style = config[status] || { bg: '#f8f9fa', color: '#5f6368', label: status, icon: Clock };
    const Icon = style.icon;
    
    return (
      <span className="text-xs px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1" style={{ backgroundColor: style.bg, color: style.color }}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  };

  return (
    <div className="border rounded-xl p-4 space-y-3" style={{ borderColor: '#e8eaed', backgroundColor: 'white' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate mb-1">{msg.to_email || msg.email}</p>
          <p className="text-xs text-gray-600 truncate">{msg.subject}</p>
        </div>
        {getStatusBadge(ultimoEvento.event || msg.status)}
      </div>

      {/* Timeline de Eventos */}
      {eventos.length > 0 && (
        <div className="space-y-2 pl-3 border-l-2" style={{ borderColor: '#e8eaed' }}>
          {eventos.map((evento, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                {new Date(evento.timestamp * 1000).toLocaleString('pt-BR')}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              {getStatusBadge(evento.event)}
              {evento.reason && (
                <span className="text-gray-500 truncate">• {evento.reason}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1.5">
        {msg.msg_id && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-gray-600 flex-shrink-0">Message ID:</span>
            <code className="text-gray-700 break-all font-mono text-[10px]">{msg.msg_id}</code>
          </div>
        )}
        {msg.from_email && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">De:</span>
            <span className="text-gray-700">{msg.from_email}</span>
          </div>
        )}
        {msg.opens_count > 0 && (
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-blue-600" />
            <span className="text-gray-700">{msg.opens_count} abertura(s)</span>
          </div>
        )}
        {msg.clicks_count > 0 && (
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-purple-600" />
            <span className="text-gray-700">{msg.clicks_count} clique(s)</span>
          </div>
        )}
        {msg.last_event_time && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">
              Último evento: {new Date(msg.last_event_time * 1000).toLocaleString('pt-BR')}
            </span>
          </div>
        )}
      </div>

      {/* Bounce/Spam Details */}
      {(ultimoEvento.event === 'bounce' || ultimoEvento.event === 'spam_report') && ultimoEvento.reason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-800 mb-1">❌ Motivo da Falha:</p>
          <p className="text-xs text-red-700">{ultimoEvento.reason}</p>
        </div>
      )}
    </div>
  );
}