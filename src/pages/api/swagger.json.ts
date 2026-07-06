import { NextApiRequest, NextApiResponse } from "next/types";
import { swaggerSpec } from "src/@apiCore/lib/swagger";


export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json(swaggerSpec)
}