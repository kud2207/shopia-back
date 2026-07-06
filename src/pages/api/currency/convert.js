import CC from 'currency-converter-lt'

export default async function currency(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  try {
    let currencyConverter = new CC({ from: req.query.from, to: req.query.to, amount: parseInt(req.query.amount) })

    res.status(200).json({
      success: true,
      amount: currencyConverter
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message })
  }
}
