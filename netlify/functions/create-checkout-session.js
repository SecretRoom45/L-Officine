const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { line_items, metadata, success_url, cancel_url } = JSON.parse(event.body);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      metadata,
      success_url,
      cancel_url,
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
```

5. Clique sur **"Commit changes"** en bas → **"Commit directly to main"** → **"Commit changes"**

---

## Méthode B — Sur ton ordinateur

Si tu as le repo en local sur ton PC :

1. Ouvre ton dossier de projet
2. Crée les dossiers manuellement : `netlify` → dedans `functions`
3. Dans `functions/`, crée un fichier `create-checkout-session.js`
4. Colle le code ci-dessus dedans
5. Sauvegarde puis `git push`

---

## ✅ Comment vérifier que c'est bien en place

Sur GitHub, tu dois voir cette arborescence :
```
ton-repo/
├── index.html
└── netlify/
    └── functions/
        └── create-checkout-session.js  ✅
