require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Para permitir solicitudes desde el frontend

const contactRoutes = require('./routes/contact');

const app = express();
// CAMBIADO: El puerto ahora es 3003
const PORT = process.env.PORT || 3003; // Asegúrate de que tu .env también use 3003 si lo especificas ahí
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors()); // Habilitar CORS para permitir solicitudes del frontend (React)
app.use(express.json()); // Para parsear cuerpos de solicitud JSON

// Conexión a MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Rutas
app.use('/api/contact', contactRoutes); // Montar las rutas de contacto bajo /api/contact

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor backend de Wunif funcionando!');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
