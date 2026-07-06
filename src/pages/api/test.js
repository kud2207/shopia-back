import dbConnect from 'src/@apiCore/lib/mongodb';

export default async function test(req, res) {
  await dbConnect();

  res.status(200).json({
    success: true,
    message: "API fonctionne correctement !",
    date: new Date(),
  });
}