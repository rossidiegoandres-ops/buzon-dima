const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const MIS_TIENDAS = {
  "52044969": "DiMa Creaciones",
  "2961783001": "DiMa-dera Pino",
};

module.exports = async (req, res) => {
  // Validación GET (para Mercado Libre)
  if (req.method === 'GET') {
    return res.status(200).send('Servidor DiMa Operativo');
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  // Responder rápido
  res.status(200).send('OK');

  const notificacion = req.body;
  console.log("BODY COMPLETO:", JSON.stringify(notificacion));


  const userId = notificacion.user_id?.toString();
  const nombreTienda = MIS_TIENDAS[userId];
  const tema = notificacion.topic;

  //if (!nombreTienda) {
   // console.log("Usuario ignorado:", userId);
    //return;
  //}

  let titulo = `¡Alerta en ${nombreTienda}!`;
  let mensaje = `Hay actividad nueva en tu cuenta.`;

  if (tema === 'orders_v2') {
    titulo = `¡VENTA en ${nombreTienda}! 💰`;
    mensaje = `¡Felicitaciones Diego! Tenés un nuevo pedido.`;
  }

  if (tema === 'questions') {
    titulo = `¡PREGUNTA en ${nombreTienda}! ❓`;
    mensaje = `Un cliente hizo una consulta.`;
  }

  try {
    await admin.messaging().send({
      notification: {
        title: titulo,
        body: mensaje,
      },
      topic: 'alertas_taller',
    });

    console.log("Notificación enviada correctamente");
  } catch (error) {
    console.error("Error enviando notificación:", error);
  }
};