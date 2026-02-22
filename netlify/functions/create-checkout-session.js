const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { line_items, metadata, success_url, cancel_url } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      metadata,
      success_url,
      cancel_url,
      custom_fields: [
        {
          key: 'nom_logement',
          label: {
            type: 'custom',
            custom: 'Nom du logement',
          },
          type: 'text',
          optional: false,
        },
        {
          key: 'date_arrivee',
          label: {
            type: 'custom',
            custom: "Date d'arrivée (JJ/MM/AAAA)",
          },
          type: 'text',
          optional: false,
        },
      ],
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
