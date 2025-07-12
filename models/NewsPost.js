const mongoose = require('mongoose');

const NewsPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
        default: 'Admin',
    },
    fontFamily: {
        type: String,
        required: true,
        default: 'Inter, sans-serif',
    },
    imageUrl: { // Campo para la URL de la imagen o la cadena Base64 de la imagen
        type: String,
        default: 'https://placehold.co/600x400/E0E7FF/4338CA?text=Noticia', // Imagen de placeholder por defecto
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('NewsPost', NewsPostSchema);
