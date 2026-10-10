import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION HELPER: Vincular User → Paciente
 * Executar UMA VEZ para corrigir dados históricos
 * Admin only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins' }, { status: 403 });
    }

    console.log('🔧 [MIGRATION] Iniciando vinculação User→Paciente');

    const todosUsuarios = await base44.asServiceRole.entities.User.list();
    const todosPacientes = await base44.asServiceRole.entities.Paciente.list();

    let vinculados = 0;
    let erros = 0;

    for (const usuario of todosUsuarios) {
      // Pular se já tem paciente_id
      if (usuario.paciente_id) continue;

      // Buscar paciente por email E clinica_id
      const paciente = todosPacientes.find(p => 
        p.email === usuario.email && 
        p.clinica_id === usuario.clinica_id
      );

      if (paciente) {
        try {
          await base44.asServiceRole.entities.User.update(usuario.id, { 
            paciente_id: paciente.id 
          });
          console.log(`✅ Vinculado: ${usuario.email} → paciente ${paciente.id}`);
          vinculados++;
        } catch (err) {
          console.error(`❌ Erro ao vincular ${usuario.email}:`, err);
          erros++;
        }
      }
    }

    console.log('🏁 [MIGRATION] Concluído:', { vinculados, erros });

    return Response.json({ 
      success: true, 
      vinculados, 
      erros,
      total_usuarios: todosUsuarios.length,
      total_pacientes: todosPacientes.length
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});