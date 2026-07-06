import moment from 'moment'
import mongoose from 'mongoose'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Campaign from 'src/@apiCore/models/campaign'

export default async function stats(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  await dbConnect()

  switch (method) {
    case 'GET': {
      const { shopId, campaignId } = req.query

      if (!shopId) return res.status(400).json({ success: false, message: 'Missing shopId' })

      const fileStore = await createFileStore(shopId)
      const campaignMessages = await fileStore.getCampaignMessages(campaignId)
      const totalSend = campaignMessages.length
      const totalDelivered = campaignMessages.filter(m => m.status >= 1).length
      const totalRead = campaignMessages.filter(m => m.status > 1).length
      const totalRespond = campaignMessages.filter(m => m.isRespond).length
      // Build match condition
      const grouped = {}
      const groupedByBlock = {}
      const pollResultsByBlock = {}

      campaignMessages.forEach(msg => {
        //All Stats
        const blockId = msg.blockId

        const date = timestampToDate(msg.messageTimestamp)
        if (!grouped[date]) {
          grouped[date] = { totalSend: 0, totalDelivered: 0, totalRead: 0, totalRespond: 0 }
        }

        grouped[date].totalSend += 1

        if (msg.status >= 1) grouped[date].totalDelivered += 1
        if (msg.status > 1) grouped[date].totalRead += 1
        if (msg.isRespond) {
          grouped[date].totalRespond += 1
        }

        //Block content stat
        if (!groupedByBlock[blockId]) {
          groupedByBlock[blockId] = { totalSend: 0, totalDelivered: 0, totalRead: 0, totalRespond: 0 }
        }
        groupedByBlock[blockId].totalSend += 1

        if (msg.status >= 1) groupedByBlock[blockId].totalDelivered += 1
        if (msg.status > 1) groupedByBlock[blockId].totalRead += 1
        if (msg.isRespond) {
          groupedByBlock[blockId].totalRespond += 1
        }

        // Poll stats
        if (!msg.votes || !Array.isArray(msg.votes)) return

        if (!pollResultsByBlock[blockId]) {
          pollResultsByBlock[blockId] = {}
        }

        msg.votes.forEach(vote => {
          const option = vote.name
          const count = Array.isArray(vote.voters) ? vote.voters.length : 0

          if (!pollResultsByBlock[blockId][option]) {
            pollResultsByBlock[blockId][option] = 0
          }

          pollResultsByBlock[blockId][option] += count
        })
      })

      const result = Object.entries(grouped).map(([date, stats]) => ({ date, ...stats }))
      const resultBolck = Object.entries(groupedByBlock).map(([blockId, group]) => {
        const readRate = group.totalSend > 0 ? Math.round((group.totalRead / group.totalSend) * 100) : 0

        return {
          blockId,
          readRate: `${readRate}%`,
          ...group
        }
      })
      console.log("pollResultsByBlock",pollResultsByBlock)
      const formatted = Object.entries(pollResultsByBlock).map(([blockId, optionCounts]) => {
        const totalVotes = Object.values(optionCounts).reduce((sum, val) => sum + val, 0)

        const results = {}
        for (const [option, count] of Object.entries(optionCounts)) {
          const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) + '%' : '0%'
          results[option] = {
            count,
            percent
          }
        }

        return {
          blockId: Number(blockId),
          results
        }
      })
      const campaign = await fileStore.getCampaign(campaignId) || {}
      const totalSendParticipants = await fileStore.getTotalSendParticipants(campaignId)
      const totalErrorParticipants = await fileStore.getTotalErrorParticipants(campaignId)
      const totalParticipants = await fileStore.getTotalParticipants(campaignId)
      campaign.totalSend = totalSendParticipants
      campaign.totalError = totalErrorParticipants
      campaign.total = totalParticipants

      const formatRate = (numerator, denominator) =>
        denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) + '%' : '0%'

      const { lastDateItems, otherItems } = splitByLastDate(campaignMessages)
      const currentStats = computeStats(lastDateItems)
      const previousStats = computeStats(otherItems)

      const trends = {
        sendTrend: calcTrend(currentStats.totalSend, previousStats.totalSend),
        deliveryTrend: calcTrend(currentStats.deliveryRate, previousStats.deliveryRate),
        readTrend: calcTrend(currentStats.readRate, previousStats.readRate),
        responseTrend: calcTrend(currentStats.responseRate, previousStats.responseRate)
      }
      res.status(200).json({
        success: true,
        totalSend,
        totalDelivered,
        totalRead,
        totalRespond,
        variations: result,
        blockVariation: resultBolck,
        pollStats: formatted,
        campaign,
        deliveryRate: formatRate(totalDelivered, totalSend),
        readRate: formatRate(totalRead, totalSend),
        replyRate: formatRate(totalRespond, totalSend),
        trends
      })
      break
    }

    default:
      res.status(400).json({ success: false })
      break
  }
}

function timestampToDate(ts) {
  // Convertir le champ `low` en millisecondes (WHATSAPP timestamp * 1000)
  return new Date(ts.low * 1000).toISOString().split('T')[0]
}

function splitByLastDate(messages) {
  if (messages.length === 0) return { lastDateItems: [], otherItems: [] }

  // Extraire toutes les dates uniques (au format YYYY-MM-DD)
  const dates = messages.map(msg => {
    const timestamp = msg.messageTimestamp.low * 1000 // timestamp en ms
    return new Date(timestamp).toISOString().split('T')[0]
  })

  // Trouver la dernière date
  const uniqueDates = [...new Set(dates)]
  uniqueDates.sort() // tri croissant
  const lastDate = uniqueDates[uniqueDates.length - 1]
  const predate = new Date(lastDate)
  predate.setDate(predate.getDate() - 1)
  const predateStr = predate.toISOString().split('T')[0]

  // Séparer les messages
  const lastDateItems = []
  const otherItems = []

  messages.forEach((msg, i) => {
    const timestamp = msg.messageTimestamp.low * 1000
    const dateStr = new Date(timestamp).toISOString().split('T')[0]
    if (dateStr === lastDate) {
      lastDateItems.push(msg)
    } else if (dateStr === predateStr) {
      otherItems.push(msg)
    }
  })

  return { lastDateItems, otherItems }
}

function calcRate(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0
}

function calcTrend(current, previous) {
  if (previous === 0 && current > 0) return '+100%'
  if (previous === 0 && current === 0) return '0%'

  const delta = ((current - previous) / previous) * 100
  const sign = delta >= 0 ? '+' : '-'
  return `${sign}${delta.toFixed(1)}%`
}

function computeStats(messages) {
  const totalSend = messages.length
  const totalDelivered = messages.filter(m => m.status >= 1).length
  const totalRead = messages.filter(m => m.status > 1).length
  const totalRespond = messages.filter(m => m.isRespond).length

  return {
    totalSend,
    deliveryRate: calcRate(totalDelivered, totalSend),
    readRate: calcRate(totalRead, totalSend),
    responseRate: calcRate(totalRespond, totalSend)
  }
}
