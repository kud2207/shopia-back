import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";
import { globSync } from "glob";


const files = [
  ...globSync("src/pages/api/**/*.{ts,js}", {
    absolute: true,
  }),
  ...globSync("src/@apiCore/**/*.{ts,js}", {
    absolute: true,
  }),
];

console.log("Fichiers trouvés :", files.length);
console.log(files.slice(0, 5));


const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "ShopIA API",
      version: "1.0.0",
      description: "Documentation API ShopIA Dashboard",
    },

    servers: [
      {
        url:
          process.env.NEXT_PUBLIC_API_URL ??
          "http://localhost:3001",
      },
    ],
  },

  apis: files,
};


const swaggerSpec = swaggerJsdoc(options);


const output = path.join(
  process.cwd(),
  "public/swagger.json"
);


fs.writeFileSync(
  output,
  JSON.stringify(swaggerSpec, null, 2)
);


console.log(
  "Swagger routes :",
  Object.keys((swaggerSpec as any).paths || {}).length
);


console.log("Swagger généré :", output);