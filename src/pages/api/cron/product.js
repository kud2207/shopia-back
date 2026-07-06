import Stock from "src/@apiCore/models/stock";
import Product from "src/@apiCore/models/product";
import dbConnect from "src/@apiCore/lib/mongodb";

export default async function handler(req, res) {
  await dbConnect();
  let products = [];
  const stocks = await Stock.find();

  if (stocks) {
    for (let item of stocks) {
     
      const prd = products.find((val) => val && val.product == item.product?.toString());
      console.log(prd?.product?.toString()==item.product?.toString())
      if (prd){
        products = products.map((v) =>
          v.product == prd.product
            ? {
                product: item.product,
                stockVendu: (item.stockVendu ||0) + v.stockVendu,
                produitEchanger:
                  (item.produitEchanger ||0) + v.produitEchanger,
              }
            : v,
        );
     } else products.push({
        product: item.product,
        stockVendu: item.stockVendu || 0,
        produitEchanger: item.produitEchanger || 0,
      });
    }

    for (let item of products) {
      await Product.updateOne(
        { _id: item.product },
        {
          $set: {
            quantitySale: item.stockVendu,
            quantityChange: item.produitEchanger,
          },
        },
      );
    }
  }

  res
    .status(200)
    .json({
      data: stocks,
      total: stocks?.reduce((sum, item) => sum + (item?.stockVendu || 0), 0),
      products
    });
}
