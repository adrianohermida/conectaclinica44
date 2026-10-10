import React from "react";
import { Pencil, User, Calendar, Globe, Briefcase, Heart, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

export default function DadosPacienteCard({ contato, onEdit, isMedico, isAdmin }) {
  const telefones = contato.telefones || [];
  const emails = contato.emails || [];
  const endereco = contato.endereco || {};

  const telefonePrincipal = telefones.find(t => t.principal) || telefones[0];
  const emailPrincipal = emails.find(e => e.principal) || emails[0];

  const estadoCivilMap = {
    solteiro: "Solteiro(a)",
    casado: "Casado(a)",
    divorciado: "Divorciado(a)",
    viuvo: "Viúvo(a)",
    uniao_estavel: "União Estável"
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6" style={{ borderColor: '#e8eaed' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-bold" style={{ color: '#202124' }}>Dados do Paciente</h3>
        {(isMedico || isAdmin) && (
          <Button variant="outline" size="sm" onClick={onEdit} className="min-h-[48px]">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados Pessoais */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase mb-3" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
            Informações Pessoais
          </h4>

          {contato.cpf && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm" style={{ color: '#5f6368' }}>CPF</p>
                <p className="text-sm md:text-base font-medium" style={{ color: '#202124' }}>{contato.cpf}</p>
              </div>
            </div>
          )}

          {contato.data_nascimento && (
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#5f6368' }}>Data de Nascimento</p>
                <p className="text-sm font-medium" style={{ color: '#202124' }}>
                  {format(new Date(contato.data_nascimento), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          )}

          {contato.nacionalidade && (
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#5f6368' }}>Nacionalidade</p>
                <p className="text-sm font-medium" style={{ color: '#202124' }}>{contato.nacionalidade}</p>
              </div>
            </div>
          )}

          {contato.estado_civil && (
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#5f6368' }}>Estado Civil</p>
                <p className="text-sm font-medium" style={{ color: '#202124' }}>
                  {estadoCivilMap[contato.estado_civil] || contato.estado_civil}
                </p>
              </div>
            </div>
          )}

          {contato.profissao && (
            <div className="flex items-start gap-3">
              <Briefcase className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#5f6368' }}>Profissão</p>
                <p className="text-sm font-medium" style={{ color: '#202124' }}>{contato.profissao}</p>
              </div>
            </div>
          )}
        </div>

        {/* Contato */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase mb-3" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
            Contato
          </h4>

          {telefones.length > 0 && (
            <div className="space-y-2">
              {telefones.map((tel, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: '#5f6368' }}>
                      {tel.tipo} {tel.principal && '(Principal)'}
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#202124' }}>{tel.numero}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {emails.length > 0 && (
            <div className="space-y-2">
              {emails.map((em, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: '#5f6368' }}>
                      {em.tipo} {em.principal && '(Principal)'}
                    </p>
                    <p className="text-sm font-medium truncate" style={{ color: '#202124' }}>{em.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {endereco.cep && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#80868b' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#5f6368' }}>Endereço</p>
                <p className="text-sm font-medium" style={{ color: '#202124' }}>
                  {endereco.logradouro}, {endereco.numero}
                  {endereco.complemento && ` - ${endereco.complemento}`}
                </p>
                <p className="text-xs" style={{ color: '#5f6368' }}>
                  {endereco.bairro} - {endereco.cidade}/{endereco.uf}
                </p>
                <p className="text-xs" style={{ color: '#5f6368' }}>CEP: {endereco.cep}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}