import { base44 } from "@/api/base44Client";

/**
 * SECURITY P0: Wrapper que FORÇA clinica_id em TODAS as queries multi-tenant
 * Previne vazamento de dados entre clínicas (LGPD Art. 46)
 * 
 * USO: import { secureEntities } from "@/components/security/SecureEntityWrapper";
 *       const contatos = await secureEntities.Contato.list();
 */

const MULTI_TENANT_ENTITIES = [
  'Contato', 'Agendamento', 'Prontuario', 'DocumentoPaciente', 
  'Venda', 'Fatura', 'Produto', 'Ticket', 'MensagemInterna',
  'MovimentacaoEstoque', 'ContaReceber', 'ContaPagar', 'Medico',
  'EmailTemplate', 'ConfiguracaoClinica', 'PreferenciaMenu',
  'PlanoTratamento', 'PrescricaoEletronica', 'DocumentoCompliance',
  'PastaCompliance', 'MensagemTicket', 'NotaInterna', 'AssinaturaDigitalLog',
  'ConexaoDocumentos', 'NotificacaoSistema', 'ConfiguracaoEmail', 
  'HistoricoVersaoDocumento', 'PermissaoCompliance', 'AgenteIAClinica',
  'ConfiguracaoWidget', 'SessaoWidget', 'ConsumoWidgetIA', 'CreditoIA',
  'AssinaturaClinica', 'Clinica', 'UsuarioClinica', 'ConviteUsuario'
];

class SecureEntityProxy {
  constructor(entityName, baseClient) {
    this.entityName = entityName;
    this.baseClient = baseClient;
  }

  async _getClinicaId() {
    const user = await base44.auth.me();
    if (!user?.clinica_id && user?.role !== 'admin') {
      throw new Error(`[SECURITY] Usuário sem clinica_id tentou acessar ${this.entityName}`);
    }
    return user.clinica_id;
  }

  async list(sort, limit) {
    const clinica_id = await this._getClinicaId();
    
    // Admin global pode listar tudo
    if (!clinica_id) {
      return this.baseClient.list(sort, limit);
    }

    // Força filtro por clinica_id
    return this.baseClient.filter({ clinica_id }, sort, limit);
  }

  async filter(query, sort, limit) {
    const clinica_id = await this._getClinicaId();
    
    // Admin global pode filtrar sem restrição
    if (!clinica_id) {
      return this.baseClient.filter(query, sort, limit);
    }

    // CRÍTICO: Sempre adicionar clinica_id ao filtro
    const secureQuery = { ...query, clinica_id };
    return this.baseClient.filter(secureQuery, sort, limit);
  }

  async get(id) {
    const clinica_id = await this._getClinicaId();
    
    // CRÍTICO: Filter com id + clinica_id para validar ownership
    const results = clinica_id 
      ? await this.baseClient.filter({ id, clinica_id })
      : await this.baseClient.filter({ id });
    
    if (!results || results.length === 0) {
      throw new Error(`[SECURITY] ${this.entityName} não encontrado ou acesso negado`);
    }
    
    return results[0];
  }

  async create(data) {
    const clinica_id = await this._getClinicaId();
    
    if (!clinica_id) {
      throw new Error(`[SECURITY] Tentativa de criar ${this.entityName} sem clinica_id`);
    }

    // CRÍTICO: Sempre injetar clinica_id
    const secureData = { ...data, clinica_id };
    return this.baseClient.create(secureData);
  }

  async bulkCreate(dataArray) {
    const clinica_id = await this._getClinicaId();
    
    if (!clinica_id) {
      throw new Error(`[SECURITY] Tentativa de bulkCreate ${this.entityName} sem clinica_id`);
    }

    // CRÍTICO: Injetar clinica_id em TODOS os registros
    const secureData = dataArray.map(item => ({ ...item, clinica_id }));
    return this.baseClient.bulkCreate(secureData);
  }

  async update(id, data) {
    // Verificar propriedade antes de atualizar
    const clinica_id = await this._getClinicaId();
    
    if (clinica_id) {
      const existing = await this.baseClient.filter({ id, clinica_id });
      if (!existing || existing.length === 0) {
        throw new Error(`[SECURITY] Tentativa de update em ${this.entityName} de outra clínica`);
      }
    }

    return this.baseClient.update(id, data);
  }

  async delete(id) {
    // Verificar propriedade antes de deletar
    const clinica_id = await this._getClinicaId();
    
    if (clinica_id) {
      const existing = await this.baseClient.filter({ id, clinica_id });
      if (!existing || existing.length === 0) {
        throw new Error(`[SECURITY] Tentativa de delete em ${this.entityName} de outra clínica`);
      }
    }

    return this.baseClient.delete(id);
  }

  // Passar métodos não críticos diretamente
  schema() {
    return this.baseClient.schema();
  }
}

// Criar wrapper seguro
const secureEntities = {};

MULTI_TENANT_ENTITIES.forEach(entityName => {
  Object.defineProperty(secureEntities, entityName, {
    get() {
      return new SecureEntityProxy(entityName, base44.entities[entityName]);
    }
  });
});

export { secureEntities };
export default secureEntities;