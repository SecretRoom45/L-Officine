const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  // Vérification de la signature Stripe
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Déclencher uniquement si paiement réussi
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Récupérer les champs personnalisés
    const nomLogement = session.custom_fields?.find(
      f => f.key === 'nom_logement'
    )?.text?.value || 'Non renseigné';

    const dateArrivee = session.custom_fields?.find(
      f => f.key === 'date_arrivee'
    )?.text?.value || 'Non renseignée';

    const customerEmail = session.customer_details?.email || 'Non renseigné';
    const montant = (session.amount_total / 100).toFixed(2);
    const devise = session.currency.toUpperCase();

    // Envoi de l'email
    await sendEmail({ nomLogement, dateArrivee, customerEmail, montant, devise });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function sendEmail({ nomLogement, dateArrivee, customerEmail, montant, devise }) {
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});
  await transporter.sendMail({
    from: `"ELOK eSHOP" <${process.env.SMTP_USER}>`,
    to: 'info@elok.fr',
    subject: `✅ Nouveau paiement reçu - ${nomLogement}`,
    html: `
      <h2>Nouveau paiement validé</h2>
      <table>
        <tr><td><b>Logement :</b></td><td>${nomLogement}</td></tr>
        <tr><td><b>Date d'arrivée :</b></td><td>${dateArrivee}</td></tr>
        <tr><td><b>Email client :</b></td><td>${customerEmail}</td></tr>
        <tr><td><b>Montant :</b></td><td>${montant} ${devise}</td></tr>
      </table>
    `,
  });
}
