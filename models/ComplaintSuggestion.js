// WUNIF-BACKEND/models/ComplaintSuggestion.js
const mongoose = require('mongoose');

const ComplaintSuggestionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { type: String, enum: ['queja', 'sugerencia'], required: true },
    message: { type: String, required: true },
    response: { type: String, default: '' }, // Campo para la respuesta del admin
    status: { type: String, enum: ['pendiente', 'resuelto'], default: 'pendiente' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ComplaintSuggestion', ComplaintSuggestionSchema);
