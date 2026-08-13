const FILTER_FIELD_PATTERN = /^[A-Za-z0-9_]+$/
const FILTER_RESERVED_VALUE_PATTERN = /&&|\|\||[()]/

const FILTER_OPERATORS = new Set([
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'contains',
  'starts_with'
])

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''

export const resolveSearchTarget = (collectionName) => {
  const normalizedCollection = String(collectionName || '').trim()

  return {
    collectionName: normalizedCollection,
    searchAllCollections: normalizedCollection === ''
  }
}

export const buildFilterExpression = (filters = []) => {
  const activeFilters = filters.filter((filter) => {
    return String(filter?.field || '').trim() !== '' || hasValue(filter?.value)
  })

  const parts = []

  for (let index = 0; index < activeFilters.length; index += 1) {
    const filter = activeFilters[index]
    const field = String(filter?.field || '').trim()
    const value = hasValue(filter?.value) ? String(filter.value).trim() : ''
    const operator = String(filter?.operator || '=')

    if (!field || !value) {
      return {
        expression: '',
        error: `Filter ${index + 1} requires both a field and a value.`
      }
    }

    if (!FILTER_FIELD_PATTERN.test(field)) {
      return {
        expression: '',
        error: `Filter ${index + 1} has an invalid field name. Use only letters, numbers, and underscores.`
      }
    }

    if (!FILTER_OPERATORS.has(operator)) {
      return {
        expression: '',
        error: `Filter ${index + 1} uses an unsupported operator.`
      }
    }

    if (FILTER_RESERVED_VALUE_PATTERN.test(value)) {
      return {
        expression: '',
        error: `Filter ${index + 1} contains reserved filter syntax (&&, ||, or parentheses).`
      }
    }

    const connector = index > 0 ? ` ${filter?.connector === 'OR' ? '||' : '&&'} ` : ''
    let condition

    if (operator === 'contains') {
      condition = `${field}:*${value}*`
    } else if (operator === 'starts_with') {
      condition = `${field}:${value}*`
    } else {
      condition = `${field}:${operator}${value}`
    }

    parts.push(`${connector}${condition}`)
  }

  return {
    expression: parts.join(''),
    error: null
  }
}
