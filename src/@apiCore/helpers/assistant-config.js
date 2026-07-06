const FALLBACK_MODEL = 'gpt-4o-mini'
const FALLBACK_SUPPORTED_MODELS = [{ value: FALLBACK_MODEL, label: FALLBACK_MODEL }]

const normalizeSupportedModels = rawModels => {
  if (!Array.isArray(rawModels)) {
    return FALLBACK_SUPPORTED_MODELS
  }

  const normalized = rawModels
    .map(item => {
      if (typeof item === 'string') {
        const value = item.trim()
        return value ? { value, label: value } : null
      }

      if (item && typeof item === 'object') {
        const value = typeof item.value === 'string' ? item.value.trim() : ''
        if (!value) return null

        const label =
          typeof item.label === 'string' && item.label.trim() ? item.label.trim() : value

        return { value, label }
      }

      return null
    })
    .filter(Boolean)

  return normalized.length ? normalized : FALLBACK_SUPPORTED_MODELS
}

export const getAssistantConfig = setting => {
  const supportedModels = normalizeSupportedModels(setting?.content?.supportedModels)
  const defaultModel = supportedModels.some(item => item.value === setting?.content?.defaultModel)
    ? setting.content.defaultModel
    : supportedModels[0]?.value || FALLBACK_MODEL

  return {
    supportedModels,
    defaultModel
  }
}

export const resolveAssistantModel = (requestedModel, setting) => {
  const { supportedModels, defaultModel } = getAssistantConfig(setting)
  const normalizedRequestedModel =
    typeof requestedModel === 'string' ? requestedModel.trim() : ''

  if (normalizedRequestedModel && supportedModels.some(item => item.value === normalizedRequestedModel)) {
    return normalizedRequestedModel
  }

  return defaultModel
}
