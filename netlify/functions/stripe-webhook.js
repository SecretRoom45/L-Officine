Voici le code fusionné complet : email interne ELOK + email client + email Sabrina.

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const SABRINA_EMAIL = 'sabrina.trehout2@hotmail.fr';

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    const nomLogement = session.custom_fields?.find(
      f => f.key === 'nom_logement'
    )?.text?.value || 'Non renseigné';

    const dateArrivee = session.custom_fields?.find(
      f => f.key === 'date_arrivee'
    )?.text?.value || 'Non renseignée';

    const customerEmail = session.customer_details?.email || '';
    const montant = (session.amount_total / 100).toFixed(2);
    const devise = session.currency.toUpperCase();

    let items = [];

    try {
      items = JSON.parse(session.metadata?.items || '[]');
    } catch (e) {
      items = [];
    }

    try {
      await sendEmails({
        nomLogement,
        dateArrivee,
        customerEmail,
        montant,
        devise,
        items,
      });

      console.log('Emails envoyés avec succès');
    } catch (emailErr) {
      console.error('Erreur envoi email:', emailErr.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function sendEmails({ nomLogement, dateArrivee, customerEmail, montant, devise, items }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const itemsHtml = items.length
    ? items.map(item => {
        const options = item.options && Object.keys(item.options).length
          ? Object.values(item.options).join(' · ')
          : '';

        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;">
              <strong>${item.name}</strong>
              ${options ? `<br><span style="color:#777;font-size:13px;">${options}</span>` : ''}
            </td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          Option réservée via L'Officine
        </td>
      </tr>
    `;

  const itemsListHtml = items.length
    ? items.map(item => {
        const options = item.options && Object.keys(item.options).length
          ? ` (${Object.values(item.options).join(' · ')})`
          : '';

        return `<li><strong>${item.name}</strong>${options}</li>`;
      }).join('')
    : `<li>Option réservée via L'Officine</li>`;

  await transporter.sendMail({
    from: `"ELOK eSHOP" <${process.env.SMTP_USER}>`,
    to: 'info@elok.fr',
    subject: `✅ Nouveau paiement reçu - ${nomLogement}`,
    html: `
      <h2>Nouveau paiement validé</h2>

      <table border="1" cellpadding="8" cellspacing="0">
        <tr><td><b>Logement :</b></td><td>${nomLogement}</td></tr>
        <tr><td><b>Date d'arrivée :</b></td><td>${dateArrivee}</td></tr>
        <tr><td><b>Email client :</b></td><td>${customerEmail || 'Non renseigné'}</td></tr>
        <tr><td><b>Montant :</b></td><td>${montant} ${devise}</td></tr>
      </table>

      <h3>Extras commandés</h3>
      <table border="1" cellpadding="8" cellspacing="0">
        ${itemsHtml}
      </table>
    `,
  });

  if (customerEmail) {
    await transporter.sendMail({
      from: `"L'Officine" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Confirmation de votre commande - L'Officine`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f6f2f0;padding:24px;">
          <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eadfdd;">

            <div style="background:#111;color:#fff;padding:26px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">L'Officine</h1>
              <p style="margin:8px 0 0;color:#ddd;">Balnéo & pièce secrète</p>
            </div>

            <div style="padding:28px;color:#222;">
              <h2 style="margin-top:0;">Votre commande est confirmée</h2>

              <p>
                Merci pour votre commande. Votre paiement a bien été validé.
                Nous préparerons vos extras avec soin avant votre arrivée afin que tout soit prêt pour votre séjour.
              </p>

              <div style="background:#faf7f6;border:1px solid #eadfdd;border-radius:12px;padding:18px;margin:22px 0;">
                <p style="margin:0 0 8px;"><strong>Logement :</strong> ${nomLogement}</p>
                <p style="margin:0 0 8px;"><strong>Date d'arrivée :</strong> ${dateArrivee}</p>
                <p style="margin:0;"><strong>Montant réglé :</strong> ${montant} ${devise}</p>
              </div>

              <h3 style="margin-bottom:10px;">Vos extras réservés</h3>

              <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden;">
                ${itemsHtml}
              </table>

              <p style="margin-top:24px;">
                Si vous avez une demande particulière ou souhaitez ajouter une attention supplémentaire
                avant votre arrivée, vous pouvez nous écrire directement.
              </p>

              <p>
                À très bientôt,<br>
                <strong>L'équipe de L'Officine</strong>
              </p>

              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#777;font-size:13px;">
                Contact : <a href="mailto:contact@elok.fr" style="color:#8b0000;">contact@elok.fr</a><br>
                Site : <a href="https://elok.fr" style="color:#8b0000;">elok.fr</a>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  }

  await transporter.sendMail({
    from: `"ELOK - L'Officine" <${process.env.SMTP_USER}>`,
    to: SABRINA_EMAIL,
    subject: `Option client payée - ${nomLogement}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2>Bonjour Sabrina,</h2>

        <p>
          Un client a payé une option pour son séjour à
          <strong>${nomLogement}</strong>.
        </p>

        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;">
          <tr>
            <td><b>Date d'arrivée</b></td>
            <td>${dateArrivee}</td>
          </tr>
          <tr>
            <td><b>Extra à préparer</b></td>
            <td>
              <ul style="margin:0;padding-left:18px;">
                ${itemsListHtml}
              </ul>
            </td>
          </tr>
        </table>

        <p style="margin-top:20px;">
          Merci de prévoir cette prestation avant l'arrivée du client.
        </p>

        <p>
          Bonne journée,<br>
          <strong>Sébastien</strong>
        </p>
      </div>
    `,
  });
}
```

