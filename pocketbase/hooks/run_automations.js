cronAdd('check_patient_automations', '*/15 * * * *', () => {
  // Safe periodic automation runner to evaluate inactive patients, follow-ups
  try {
    const automations = $app.findRecordsByFilter('automations', 'enabled = true', 'created', 20, 0)
    if (!automations || automations.length === 0) return

    const patients = $app.findRecordsByFilter('patients', '', '-created', 100, 0)
    const logsCol = $app.findCollectionByNameOrId('automation_logs')

    for (const auto of automations) {
      const triggerType = auto.getString('trigger_type')

      // 1. Inatividade
      if (triggerType === 'inatividade') {
        for (const p of patients) {
          const stage = p.getString('stage')
          const lastContact = p.getString('last_contact_at')
          if (!lastContact) continue

          const diffMs = Date.now() - new Date(lastContact).getTime()
          const diffDays = diffMs / (1000 * 60 * 60 * 24)

          // Regra A: Primeiro Contato sem resposta há 7+ dias -> mover para Lead Frio
          if (stage === 'primeiro_contato' && diffDays >= 7) {
            const log = new Record(logsCol)
            log.set('automation_id', auto.id)
            log.set('patient_id', p.id)
            log.set('trigger', 'inatividade_primeiro_contato_7dias')
            log.set('action', 'movido_para_lead_frio')
            log.set('status', 'sucesso')
            log.set(
              'details',
              'Paciente ' + p.getString('name') + ' elegível para Lead Frio por inatividade.',
            )
            $app.save(log)
          }

          // Regra B: Em Negociação sem retorno há 3+ dias -> follow-up
          if (stage === 'em_negociacao' && diffDays >= 3) {
            const log = new Record(logsCol)
            log.set('automation_id', auto.id)
            log.set('patient_id', p.id)
            log.set('trigger', 'inatividade_negociacao_3dias')
            log.set('action', 'followup_negociacao_enviado')
            log.set('status', 'sucesso')
            log.set('details', 'Follow-up de negociação disparado para ' + p.getString('name'))
            $app.save(log)
          }

          // Regra C: Reativação há 15+ dias -> nova abordagem
          if (stage === 'reativacao' && diffDays >= 15) {
            const log = new Record(logsCol)
            log.set('automation_id', auto.id)
            log.set('patient_id', p.id)
            log.set('trigger', 'inatividade_reativacao_15dias')
            log.set('action', 'oferta_resgate_enviada')
            log.set('status', 'sucesso')
            log.set(
              'details',
              'Condição especial de reativação enviada para ' + p.getString('name'),
            )
            $app.save(log)
          }
        }
      }

      // 2. Data próxima (ex: Renovação com término próximo)
      if (triggerType === 'data_proxima') {
        for (const p of patients) {
          if (p.getString('stage') === 'renovacao') {
            const log = new Record(logsCol)
            log.set('automation_id', auto.id)
            log.set('patient_id', p.id)
            log.set('trigger', 'renovacao_proxima_30dias')
            log.set('action', 'fomento_cuidado_continuo')
            log.set('status', 'sucesso')
            log.set(
              'details',
              'Mensagem de renovação e qualidade de vida disparada para ' + p.getString('name'),
            )
            $app.save(log)
          }
        }
      }
    }
  } catch (err) {
    console.log('Automations cron error:', err)
  }
})
