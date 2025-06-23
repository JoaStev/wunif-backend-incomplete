const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');

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

router.get('/contactmessages', async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener los mensajes de contacto:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener los mensajes.', error: error.message });
    }
});


module.exports = router;
