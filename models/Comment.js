// WUNIF-BACKEND/models/Comment.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    postId: { // ID de la noticia o publicación a la que pertenece el comentario
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NewsPost', // Asume que tienes un modelo NewsPost
        required: true
    },
    author: {
        type: String, // Nombre de usuario del autor del comentario
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', CommentSchema);
