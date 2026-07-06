import dbConnect from "src/@apiCore/lib/mongodb"
import invoice from "src/@apiCore/models/invoice"


export default async function createInvoice(req, res) {
    //Preflight CORS handler
    if (req.method === 'OPTIONS') {
        return res.status(200).json({
            body: 'OK'
        })
    }

    const { shopId, salerPersone, note, thanksgiving } = req.body

    // Connect to database
    await dbConnect()

    try {
        const invoiceExists = await invoice.findOne({ shopId })
        if (invoiceExists) {
            invoice.updateOne(
                { _id: invoiceExists._id },
                { $set: { shopId, salerPersone, note, thanksgiving } }
            )
                .then(async response => {
                    if (response.modifiedCount == 1) {
                        res.status(200).json({ message: "success_updated_invoice", data: { shopId, salerPersone, note, thanksgiving } })
                    } else {
                        res.status(500).json({ message: "error_create_invoice", error: err.message || "error" })
                    }
                })
                .catch(err => {
                    res.status(500).json({ message: "error_create_invoice", error: err.message || "error" })
                })
        } else {
            invoice.create({ shopId, salerPersone, note, thanksgiving })
                .then(invoice => {
                    res.status(200).json({ message: "success_create_invoice", data: invoice })
                })
                .catch(err => {
                    console.log(err)
                    res.status(500).json({ message: "error_create_invoice", error: err.message || "error" })
                })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "error_create_invoice", error: error.message || "error" })
    }
}