// WUNIF-BACKEND/models/NewsPost.js
const mongoose = require('mongoose');

const NewsPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: { // Contenido HTML
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
        default: 'Admin',
    },
    fontFamily: { // Campo para la familia de la fuente
        type: String,
        required: true,
        default: 'Inter, sans-serif',
    },
    imageUrl: { // Campo para la URL de la imagen o la cadena Base64
        type: String,
        default: 'https://placehold.co/600x400/E0E7FF/4338CA?text=Noticia',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('NewsPost', NewsPostSchema);
