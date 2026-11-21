import  nodemailer  from "nodemailer"

// Spojeni na postovni server. Lokalne je to Mailpit (http://localhost:8025),
// naostro sem prijde adresa skutecne sluzby (napriklad Resend) a k tomu prihlasovaci udaje.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Mailpit lokalne bezi bez sifrovani
});


export async function sendVerificationEmail(to: string, link:string) {
    // zadny try/catch: kdyz se e-mail neodesle, chyba poleti dal a registrace to nezamlci
    await transporter.sendMail({
        from: "Auth sandbox <no-reply@auth-sandbox.local>",
        to: to,
        subject: "Ověř svůj e-mail",
        text: `Ahoj, klikni na odkaz a ověř svůj e-mail:\n\n${link}\n\nOdkaz platí 24 hodin.`,
    });
}
