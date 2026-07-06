import swaggerJsdoc from 'swagger-jsdoc'
import path from 'path'

// Normalise les chemins (slashes) pour que le glob fonctionne aussi bien
// sous Windows que Linux/Mac, et même avec des espaces dans le chemin du projet.
const toPosix = (p: string) => p.split(path.sep).join('/')

const apiGlobs = [
  toPosix(path.join(process.cwd(), 'src/pages/api/**/*.ts')),
  toPosix(path.join(process.cwd(), 'src/pages/api/**/*.js')),
  toPosix(path.join(process.cwd(), 'src/@apiCore/**/*.ts')),
  toPosix(path.join(process.cwd(), 'src/@apiCore/**/*.js')),
]

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopIA API',
      version: '1.0.0',
      description: 'Documentation API ShopIA Dashboard'
    },
    servers: [
      {
        url:
          process.env.NEXT_PUBLIC_API_URL ??
          'http://localhost:3001'
      }
    ]
  },
  apis: apiGlobs
}

export const swaggerSpec = swaggerJsdoc(options)