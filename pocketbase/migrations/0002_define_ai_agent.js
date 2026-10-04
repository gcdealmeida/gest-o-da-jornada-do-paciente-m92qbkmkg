/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'patient-journey-assistant',
      name: 'Assistente da Jornada',
      description:
        'Assistente de IA para qualificação de pacientes, gestão de funil, acompanhamento de jornada e automações clínicas.',
      systemPrompt: `Você é o Assistente da Jornada, um assistente acolhedor, profissional e prestativo em português brasileiro (pt-BR) da clínica médica/multidisciplinar.
Seu objetivo é auxiliar a equipe no controle da jornada completa do paciente (estilo Kommo/HTHUB).
Escopo:
- Qualificar contatos e sugerir pontuação e próximo estágio no funil.
- Responder dúvidas da equipe sobre a jornada e histórico dos pacientes.
- Rastrear follow-ups pendentes, lembretes de consultas e renovações atrasadas.
- Sugerir mensagens de reativação acolhedoras e profissionais.
- Ajudar no agendamento e criação de tarefas para a equipe.

Recusas e limites éticos:
- NUNCA invente informações de pacientes. Se um dado não constar nos registros ou contexto, declare que não encontrou.
- NUNCA forneça diagnósticos, prescrições ou orientações clínicas médicas. O foco é estritamente a jornada, experiência e relacionamento do paciente.
- NUNCA exponha credenciais ou dados sigilosos fora do contexto seguro.
- Seja sempre objetivo, empático e claro nas respostas.
- Cite nomes de pacientes e datas de eventos quando fizer afirmações baseadas nos dados.`,
      tier: 'fast',
      tools: [
        { collection: 'patients', perms: { list: true, read: true } },
        { collection: 'journey_events', perms: { list: true, read: true } },
        { collection: 'tasks', perms: { list: true, read: true, create: true } },
        { collection: 'appointments', perms: { list: true, read: true, create: true } },
        { collection: 'conversations', perms: { list: true, read: true } },
        { collection: 'messages', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: `Os 6 estágios da Jornada do Paciente são:
1. Primeiro Contato: Paciente recém-chegado via WhatsApp, Instagram ou site demonstrando interesse inicial.
2. Avaliação: Consulta ou avaliação inicial agendada ou em andamento para entender as queixas e objetivos.
3. Fechamento de Programa: Proposta de plano de cuidado/tratamento apresentada, negociação e fechamento de valor mensal.
4. Acompanhamento: Paciente em tratamento ativo, sessões regulares e monitoramento da experiência.
5. Renovação: Término de ciclo de tratamento aproximando-se, negociação para continuidade ou manutenção preventiva.
6. Reativação: Paciente inativo por mais de 30-60 dias ou sem retorno, necessitando de contato acolhedor de resgate.`,
          },
        },
        {
          type: 'text',
          payload: {
            text: `Modo Demo do WhatsApp:
Nesta versão, a integração oficial da Meta Business API não está ativada. O sistema opera em Modo Demo com simulação em tempo real de envio, digitação e respostas automáticas baseadas em regras e inteligência artificial para que a equipe teste fluxos completos sem custo ou risco de bloqueio de número comercial.`,
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Como funciona o modo demo do WhatsApp?',
                answer:
                  'O modo demo simula realisticamente o envio e recebimento de mensagens instantâneas pelo WhatsApp com indicador de digitação e disparos de automações de primeiro contato, sem necessitar de aprovação Meta.',
              },
              {
                question: 'O que faz a automação de reativação?',
                answer:
                  'A automação de reativação detecta pacientes em Acompanhamento ou Renovação sem interação há mais de 7 dias e envia uma mensagem carinhosa de retorno, prevenindo evasão do tratamento.',
              },
              {
                question: 'Qual é o foco da plataforma Jornada do Paciente?',
                answer:
                  'O foco da plataforma NÃO é prontuário médico clínico, e sim o controle da experiência do cliente, retenção, agilidade no atendimento WhatsApp e gestão do ciclo de vida do paciente.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'patient-journey-assistant')
    } catch (_) {}
  },
)
