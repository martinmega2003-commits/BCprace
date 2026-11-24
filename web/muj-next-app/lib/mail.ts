import  nodemailer  from "nodemailer"

// Lokalne Mailpit bez prihlaseni, v Azure se prihlasujeme jmenem a heslem.
let prihlaseni: { user: string; pass: string } | undefined = undefined;

if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  prihlaseni = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  };
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // spojeni zacne nesifrovane a pak se prepne na TLS (STARTTLS)
  requireTLS: prihlaseni !== undefined, // s heslem jen sifrovane
  auth: prihlaseni,
});

export async function sendVerificationEmail(to: string, link:string) {
    // zadny try/catch: kdyz se e-mail neodesle, chyba poleti dal a registrace to nezamlci
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: to,
        subject: "Ověř svůj e-mail",
        text: `Ahoj, klikni na odkaz a ověř svůj e-mail:\n\n${link}\n\nOdkaz platí 24 hodin.`,
    });
}
