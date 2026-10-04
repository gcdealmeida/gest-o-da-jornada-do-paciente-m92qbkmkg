cronAdd('check_patient_automations', '*/15 * * * *', () => {
  // Safe periodic automation runner to evaluate inactive patients, follow-ups
  try {
    const automations = $app.findRecordsByFilter('automations', 'enabled = true', 'created', 10, 0)
    if (!automations || automations.length === 0) return

    const patients = $app.findRecordsByFilter('patients', '', '-created', 50, 0)
    const logsCol = $app.findCollectionByNameOrId('automation_logs')

    for (const auto of automations) {
      const triggerType = auto.getString('trigger_type')

      if (triggerType === 'inatividade') {
        // check inactive patients in acompanhamento
        for (const p of patients) {
          if (p.getString('stage') === 'acompanhamento') {
            const lastContact = p.getString('last_contact_at')
            if (lastContact) {
              const diffMs = Date.now() - new Date(lastContact).getTime()
              const diffDays = diffMs / (1000 * 60 * 60 * 24)
              if (diffDays >= 7) {
                // Log execution
                const log = new Record(logsCol)
                log.set('automation_id', auto.id)
                log.set('patient_id', p.id)
                log.set('trigger', 'inatividade_7dias')
                log.set('action', 'lembrete_enviado')
                log.set('status', 'sucesso')
                log.set('details', 'Alerta gerado para paciente ' + p.getString('name'))
                $app.save(log)
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('Automations cron error:', err)
  }
})
