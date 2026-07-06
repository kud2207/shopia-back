import OpenAI from 'openai'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import Setting from 'src/@apiCore/models/setting'
import { resolveAssistantModel } from 'src/@apiCore/helpers/assistant-config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method !== 'POST') {
    return res.status(400).json({ success: false })
  }

  await authenticate(req, res)
  await dbConnect()

  try {
    const setting = await Setting.findOne()
    const selectedModel = resolveAssistantModel(req.body?.model, setting)
    const prompt = req.body?.prompt || ''
    const message = req.body?.message || ''
    const assistantFileId = req.body?.assistantFileId || ''

    if (!message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'message_required'
      })
    }

    const payload = {
      model: selectedModel,
      temperature: 0.2,
      instructions: prompt,
      input: message
    }

    if (assistantFileId) {
      payload.tools = [{ type: 'file_search', vector_store_ids: [assistantFileId] }]
    }

    const response = await openai.responses.create(payload)
    const output = response.output_text?.trim()

    if (!output) {
      return res.status(400).json({ success: false, message: 'generation_failed' })
    }

    return res.status(200).json({
      success: true,
      data: {
        model: selectedModel,
        response: output
      }
    })
  } catch (error) {
    console.log('test prompt error', error)
    return res.status(400).json({ success: false, message: 'server_error' })
  }
}
