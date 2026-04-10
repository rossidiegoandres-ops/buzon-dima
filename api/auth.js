// api/auth.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  const code = req.query.code;
  const tienda = req.query.state;

  console.log("🔐 Auth recibido - code:", code ? "presente" : "FALTA", "| state:", tienda);

  if (!code) {
    return res.status(400).send(`
      <h1 style="color: red;">Error: Falta el código de autorización</h1>
      <p>Mercado Libre no envió el parámetro <code>code</code>.</p>
      <p>Verifica que la URL de redirección en Mercado Libre sea exactamente:</p>
      <p><strong>https://buzon-dima.vercel.app/api/auth</strong></p>
    `);
  }

  if (!tienda) {
    return res.status(400).send('Falta el parámetro state (creaciones o pino).');
  }

  // Seleccionamos las llaves correctas según la tienda
  let appId, secretKey;
  if (tienda === 'creaciones') {
    appId = process.env.ML_APP_ID_CREACIONES;
    secretKey = process.env.ML_SECRET_KEY_CREACIONES;
  } else if (tienda === 'pino') {
    appId = process.env.ML_APP_ID_PINO;
    secretKey = process.env.ML_SECRET_KEY_PINO;
  } else {
    return res.status(400).send('Tienda no reconocida. Use "creaciones" o "pino".');
  }

  if (!appId || !secretKey) {
    return res.status(500).send('Faltan variables de entorno (ML_APP_ID o ML_SECRET_KEY).');
  }

  try {
    console.log(`🔄 Intercambiando código por token para ${tienda}...`);

    const mlResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: secretKey,
        code: code,
        redirect_uri: 'https://buzon-dima.vercel.app/api/auth'
      })
    });

    const data = await mlResponse.json();

    if (data.access_token) {
      await db.collection('tokens').doc(data.user_id.toString()).set({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        tienda_origen: tienda,
        actualizado: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Token guardado correctamente para tienda ${tienda} (user_id: ${data.user_id})`);

      return res.status(200).send(`
        <h1 style="color: green; font-family: sans-serif;">¡Conexión de ${tienda.toUpperCase()} Exitosa!</h1>
        <p style="font-family: sans-serif;">Los tokens se guardaron correctamente en Firebase.</p>
        <p>Ya podés cerrar esta ventana y volver a la app.</p>
      `);
    } else {
      console.error("❌ Error de Mercado Libre:", data);
      return res.status(400).send(`
        <h1 style="color: red;">Error al obtener tokens</h1>
        <p>${JSON.stringify(data, null, 2)}</p>
      `);
    }

  } catch (error) {
    console.error("🚨 Error interno:", error);
    return res.status(500).send(`Error interno del servidor: ${error.message}`);
  }
};