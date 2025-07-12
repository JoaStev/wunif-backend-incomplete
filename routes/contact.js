const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');

// Importar los middlewares de autenticación y autorización
const auth = require('../middleware/auth'); // Ruta relativa a este archivo
const authorizeAdmin = require('../middleware/authorizeAdmin'); // Ruta relativa a este archivo

// Ruta para enviar mensajes de contacto (no necesita autenticación, es público)
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        const newContactMessage = new ContactMessage({
            name,
            email,
            message
        });

        await newContactMessage.save();
        res.status(201).json({ message: 'Mensaje de contacto guardado con éxito.' });
    } catch (error) {
        console.error('Error al guardar el mensaje de contacto:', error);
        res.status(500).json({ message: 'Error interno del servidor al procesar su solicitud.', error: error.message });
    }
});

// Ruta para obtener los mensajes de contacto
// AHORA PROTEGIDA: Solo los usuarios autenticados Y con rol 'admin' pueden acceder
router.get('/contactmessages', [auth, authorizeAdmin], async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener los mensajes de contacto:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener los mensajes.', error: error.message });
    }
});

module.exports = router;