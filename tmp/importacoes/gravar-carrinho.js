(async () => {
  const { planned, current, inserts, updates } = window.cartImportPlan;
  const key = r => [r.day, r.time, r.location].join('|');
  const fresh = await cartImportRequest('cart_assignments?month=eq.10&year=eq.2026&select=*&order=day,time');
  if (JSON.stringify(fresh) !== JSON.stringify(current)) {
    throw Error('A escala mudou desde a conferência; refaça a comparação.');
  }
  window.cartImportResult = { inserted: 0, updated: 0 };
  if (inserts.length) {
    const added = await cartImportRequest('cart_assignments', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(inserts)
    });
    window.cartImportResult.inserted = added.length;
  }
  for (const update of updates) {
    const changed = await cartImportRequest('cart_assignments?id=eq.' + update.id, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ week: update.row.week })
    });
    if (changed.length !== 1) throw Error('Não foi possível atualizar ' + update.id);
    window.cartImportResult.updated++;
  }
  const saved = await cartImportRequest('cart_assignments?month=eq.10&year=eq.2026&select=*&order=day,time');
  const fields = Object.keys(planned[0]);
  const errors = planned.filter(row => {
    const found = saved.filter(r => key(r) === key(row));
    return found.length !== 1 || fields.some(field => found[0][field] !== row[field]);
  });
  if (saved.length !== 43 || errors.length) throw Error('Divergência na verificação: ' + JSON.stringify(errors));
  return {
    ...window.cartImportResult,
    verified: saved.length,
    weeks: [1, 2, 3, 4, 5].map(week => ({ week, count: saved.filter(r => r.week === week).length })),
    leda: saved.filter(r => r.publisher1 === 'Antonia dos Reis Sena' || r.publisher2 === 'Antonia dos Reis Sena').map(r => r.day)
  };
})()
