const mailMessages = {
  fr: {
    subject: 'Réinitialisation de mot de passe',
    message: `<h1 class="text-center">Réinitialisation de mot de passe</h1>
          <p>Bonjour,</p>
          <p>Vous avez demandé une réinitialisation de votre mot de passe. Trouvez ci-dessous le code de validation :</p>
          <a href="#">$-link-$</a>
          <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
          <p>Merci,<br>L'équipe SHOPIA</p>`
  },
  en: {
    subject: 'Password Reset',
    message: `<h1 class="text-center">Password Reset</h1>
        <p>Hello,</p>
        <p>You have requested a password reset. Click on the link below to choose a new password:</p>
        <a href="$-link-$">Reset Password</a>
        <p><b>Please note that this link will expire after 15 minutes for security reasons.</b></p>
        <p>If you did not request this password reset, please ignore this email.</p>
        <p>Thank you,<br>SHOPIA team</p>`
  }
}
const resetPasswordMailTemplate = (link, language) => {
  const html = `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta http-equiv="content-type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0;">
       <meta name="format-detection" content="telephone=yes"/>
        <title>${mailMessages[language].subject}</title>
        <style>
            .shopia {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f8f8;
                margin: 0;
                padding: 15px;
            }
            .shopia .text-center {
                  text-align: center
              }
            .shopia .container {
                max-width: 500px;
                margin: 50px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #333333;
            }
            .shopia p {
                color: #555555;
            }
            .shopia a {
                display: inline-block;
                margin: 15px;
                padding: 10px;
                font-size: 20px;
                background-color: #007bff;
                color: #ffffff;
                text-decoration: none;
                width: 90%;
                text-align: center;
                
            }
            .shopia .text-center {
                text-align: center
            }
        </style>
    </head>
    <body class="shopia">
        <div class="container">
            ${mailMessages[language].message?.replace('$-link-$', link)}
        </div>
        <p class="text-center">© 2024, Made with ❤️ by ShopIA</p>

    </body>
    </html>    
    `

  return html
}

const notifyTemplate = (message, shopName) => {
  const html = `<!DOCTYPE html>
      <html lang="fr">
      <head>
          <meta http-equiv="content-type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0;">
         <meta name="format-detection" content="telephone=yes"/>
          <title>Nouvelle commande pour ${shopName}</title>
          <style>
              .shopia {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background-color: #f8f8f8;
                  margin: 0;
                  padding: 15px;
              }
              .shopia .container {
                  max-width: 500px;
                  margin: 50px auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 10px;
                  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #333333;
              }
              .shopia p {
                  color: #555555;
              }
              .shopia a {
                  display: inline-block;
                  margin-top: 15px;
                  padding: 10px 20px;
                  background-color: #007bff;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
              }
              .shopia .text-center {
                  text-align: center
              }
              .shopia .d-flex-center {
                display: flex;
                margin: 10px auto;
                justify-content: center !important
              }
             .shopia .mail-btn {
                margin: 10px 20px; 
                width: 100%; 
                text-align: center;
              }
              shopia .mail-btn.primary {
                background: #048DD6; 
                color: #fff 
              }

          </style>
      </head>
      <body class="shopia">
          <div class="container">
              ${message}
          </div>
          <p class="text-center">© 2024, Made with ❤️ by ShopIA</p>
      </body>
      </html>    
      `

  return html
}

module.exports = { resetPasswordMailTemplate, mailMessages, notifyTemplate }
