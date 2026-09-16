import { SHIFTS } from '../src/game/shifts.js'
import { validateAllShifts } from '../src/game/shiftValidator.js'

const result = validateAllShifts(SHIFTS)

for (const r of result.perShift) {
  const status = r.ok ? 'OK  ' : 'FAIL'
  console.log(`[${status}] ${r.shiftId} — ${r.nome}`)
  console.log(
    `       status=${r.summary.status} reputação=${r.summary.reputation}/${r.summary.reputationTarget} ` +
      `score=${r.summary.score} servidos=${r.summary.served} perdidos=${r.summary.lost} erros=${r.summary.errors}`,
  )
  for (const problem of r.problems) {
    console.log(`       - ${problem}`)
  }
}

console.log('')
if (result.missingCoverage.length > 0) {
  console.log(`Cobertura de regras incompleta: ${result.missingCoverage.join(', ')} nunca é o motivo de uma recusa correta em nenhum turno.`)
} else {
  console.log('Cobertura de regras: OK (todas as 6 regras são exercitadas em pelo menos um turno).')
}

for (const warning of result.warnings) {
  console.log(`Aviso: ${warning}`)
}

console.log('')
console.log(result.ok ? 'Todos os turnos passaram na validação.' : 'Alguns turnos falharam na validação.')

process.exit(result.ok ? 0 : 1)
