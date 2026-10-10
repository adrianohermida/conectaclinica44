import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION: Paciente → Contato
 * CRÍTICO: Consolida duplicação arquitetural
 * Executar UMA VEZ - Admin only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    console.log('🔄 [MIGRATION] Iniciando migração Paciente→Contato');

    const todosPacientes = await base44.asServiceRole.entities.Paciente.list();
    const todosContatos = await base44.asServiceRole.entities.Contato.list();
    const todosUsuarios = await base44.asServiceRole.entities.User.list();

    let migrados = 0;
    let pulados = 0;
    let erros = 0;
    let vinculos = 0;

    for (const paciente of todosPacientes) {
      try {
        // CRÍTICO: Pular pacientes órfãos (sem clinica_id)
        if (!paciente.clinica_id) {
          console.warn(`⚠️ Paciente órfão sem clinica_id: ${paciente.email || paciente.nome_completo} (ID: ${paciente.id})`);
          erros++;
          continue;
        }

        // Verificar se já existe contato com mesmo email+clinica
        const contatoExistente = todosContatos.find(c => 
          c.email === paciente.email && 
          c.clinica_id === paciente.clinica_id &&
          c.tipo_contato === 'paciente'
        );

        let contatoId;

        if (contatoExistente) {
          console.log(`⏭️ Contato já existe: ${paciente.email}`);
          contatoId = contatoExistente.id;
          pulados++;
        } else {
          // Criar novo Contato a partir do Paciente
          const novoContato = await base44.asServiceRole.entities.Contato.create({
            clinica_id: paciente.clinica_id,
            tipo_contato: 'paciente',
            nome_completo: paciente.nome_completo,
            cpf: paciente.cpf,
            data_nascimento: paciente.data_nascimento,
            sexo: paciente.sexo,
            telefone: paciente.telefone,
            whatsapp: paciente.whatsapp,
            email: paciente.email,
            endereco_completo: paciente.endereco_completo,
            cidade: paciente.cidade,
            estado: paciente.estado,
            cep: paciente.cep,
            convenio: paciente.convenio,
            numero_carteirinha: paciente.numero_carteirinha,
            status: paciente.status,
            tags: [],
            observacoes: paciente.observacoes,
            historico_medico: paciente.historico_medico,
            alergias: paciente.alergias,
            medicamentos_uso: paciente.medicamentos_uso
          });
          
          contatoId = novoContato.id;
          console.log(`✅ Migrado: ${paciente.email} → Contato ${contatoId}`);
          migrados++;
        }

        // Vincular User → Contato (se existir user com mesmo email)
        const usuario = todosUsuarios.find(u => 
          u.email === paciente.email && 
          u.clinica_id === paciente.clinica_id
        );

        if (usuario && !usuario.contato_id) {
          await base44.asServiceRole.entities.User.update(usuario.id, {
            contato_id: contatoId,
            paciente_id: paciente.id // Manter compatibilidade temporária
          });

          // Atualizar Contato com user_id
          await base44.asServiceRole.entities.Contato.update(contatoId, {
            user_id: usuario.id
          });

          console.log(`🔗 Vinculado User ${usuario.email} ↔ Contato ${contatoId}`);
          vinculos++;
        }

      } catch (err) {
        console.error(`❌ Erro ao migrar ${paciente.email}:`, err);
        erros++;
      }
    }

    console.log('🏁 [MIGRATION] Concluído');

    return Response.json({
      success: true,
      migrados,
      pulados,
      erros,
      vinculos,
      total_pacientes: todosPacientes.length,
      total_contatos_antes: todosContatos.length,
      total_usuarios: todosUsuarios.length
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});