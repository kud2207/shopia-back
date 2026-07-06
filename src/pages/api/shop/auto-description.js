import dbConnect from 'src/@apiCore/lib/mongodb'
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function city(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization",
  );
  //Preflight CORS handler
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      body: "OK",
    });
  }
  const { method } = req
  await dbConnect()
  switch (method) {
    case 'POST':
      const context = req.body.context
      let completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: context }],
        model: 'gpt-4o-mini'
      })

      if (completion.choices) {
        res
          .status(200)
          .json({ success: true, completion: completion.choices[0], tokens: completion.usage.completion_tokens })
      } else {
        res.status(400).json({ success: false })
      }
      break

    default:
      res.status(400).json({ success: false })
      break
  }
}
