const asCollectionTotal = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null
}

export const extractCollectionTotal = (stats) => {
  if (!stats || typeof stats !== 'object') return null

  const candidates = [
    stats.collections_total,
    stats.storage?.total_collections,
    stats.total_collections,
    stats.collections?.total
  ]

  for (const candidate of candidates) {
    const total = asCollectionTotal(candidate)
    if (total !== null) return total
  }

  return null
}

// Keep partial status responses and a single transient zero from making the KPI flicker.
// A real transition to zero is accepted after it is observed twice consecutively.
export const createStableCollectionTotal = (zeroConfirmations = 2) => {
  let confirmedTotal = null
  let consecutiveZeros = 0

  return {
    observe(stats) {
      const observedTotal = extractCollectionTotal(stats)

      if (observedTotal === null) {
        return confirmedTotal ?? 0
      }

      if (observedTotal > 0) {
        confirmedTotal = observedTotal
        consecutiveZeros = 0
        return confirmedTotal
      }

      if (confirmedTotal === null || confirmedTotal === 0) {
        confirmedTotal = 0
        consecutiveZeros = 0
        return 0
      }

      consecutiveZeros += 1
      if (consecutiveZeros >= zeroConfirmations) {
        confirmedTotal = 0
        consecutiveZeros = 0
      }

      return confirmedTotal
    }
  }
}
