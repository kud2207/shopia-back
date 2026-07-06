import dbConnect from "src/@apiCore/lib/mongodb"
import invoice from "src/@apiCore/models/invoice"


export default async function getInvoice(req, res) {
    //Preflight CORS handler
    if (req.method === 'OPTIONS') {
        return res.status(200).json({
            body: 'OK'
        })
    }

    // Connect to database
    await dbConnect()

    try {
        const invoiceExists = await invoice.findOne({ shopId: req.query.shopId })
        if (invoiceExists) {
            res.status(200).json({ message: "success", data: invoiceExists })
        } else {
            res.status(404).json({ message: "no_invoice", data: null })
        }
    } catch (error) {
        res.status(500).json({ message: "error_create_invoice", error: error.message || "error" })
    }
}