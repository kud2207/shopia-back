export const getChartPeriodConfig = (periodStr) => {
  const now = new Date()
  let startDate = new Date()
  let isDaily = false
  let labels = []

  if (periodStr.endsWith('d')) {
    const days = parseInt(periodStr) || 7
    startDate.setDate(now.getDate() - days)
    isDaily = true
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }))
    }
  } else if (periodStr.endsWith('w')) {
    const weeks = parseInt(periodStr) || 2
    const days = weeks * 7
    startDate.setDate(now.getDate() - days)
    isDaily = true
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }))
    }
  } else {
    const months = parseInt(periodStr) || 4
    startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    isDaily = false
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(d.toLocaleString('fr-FR', { month: 'short' }))
    }
  }

  const groupBy = isDaily
    ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
    : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }

  const getLabel = (item) => {
    const d = new Date(item._id.year, item._id.month - 1, item._id.day || 1)
    return isDaily
      ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      : d.toLocaleString('fr-FR', { month: 'short' })
  }

  return { startDate, isDaily, labels, groupBy, getLabel }
}