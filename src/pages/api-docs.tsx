import dynamic from 'next/dynamic'
import type { SwaggerUIProps } from 'swagger-ui-react'

import 'swagger-ui-react/swagger-ui.css'


const SwaggerUI = dynamic<SwaggerUIProps>(
  () => import('swagger-ui-react'),
  {
    ssr: false,
    loading: () => <div>Chargement Swagger...</div>
  }
)


export default function ApiDocs() {
  return (
    <SwaggerUI
      url="/api/swagger.json"
      docExpansion="list"
    />
  )
}