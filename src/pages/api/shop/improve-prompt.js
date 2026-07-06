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
    const globalPrompt = req.body?.globalPrompt || ''
    const currentPrompt = req.body?.currentPrompt || ''
    const shopName = req.body?.shopName || ''
    const shopType = req.body?.shopType || 'product'
    const businessDescription = req.body?.businessDescription || ''

    const promptToImprove = currentPrompt || globalPrompt

    if (!promptToImprove) {
      return res.status(400).json({
        success: false,
        message: 'prompt_required'
      })
    }

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                "Tu es un expert en prompt engineering pour assistants commerciaux WhatsApp. Tu améliores un prompt existant pour le rendre plus clair, plus robuste et mieux adapté au modèle IA choisi. Tu conserves l'intention métier, tu élimines les ambiguïtés, tu gardes un ton professionnel et orienté conversion. Réponds uniquement avec le prompt final, sans markdown, sans explication, sans titre."
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Modèle choisi: ${selectedModel}
Type de boutique: ${shopType}
Nom de la boutique: ${shopName}
Description métier: ${businessDescription}

Prompt global actuel:
${globalPrompt || '(vide)'}

Prompt à améliorer:
${promptToImprove}`
            }
          ]
        }
      ]
    })

    const improvedPrompt = response.output_text?.trim()

    if (!improvedPrompt) {
      return res.status(400).json({ success: false, message: 'generation_failed' })
    }

    console.log('improved prompt', improvedPrompt)

    return res.status(200).json({
      success: true,
      data: {
        model: selectedModel,
        prompt: improvedPrompt
      }
    })
  } catch (error) {
    console.log('improve prompt error', error)
    return res.status(400).json({ success: false, message: 'server_error' })
  }
}
