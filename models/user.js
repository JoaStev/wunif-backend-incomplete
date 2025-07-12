const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define el esquema del usuario
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Asegura que los nombres de usuario sean únicos
    },
    password: {
        type: String,
        required: true,
    },
    // NUEVO CAMPO: role (rol del usuario)
    role: {
        type: String,
        enum: ['user', 'admin'], // Solo permite 'user' o 'admin'
        default: 'user', // Por defecto, el rol será 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Middleware de Mongoose: Hashear la contraseña antes de guardar el usuario
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Exporta el modelo de usuario
module.exports = mongoose.model('User', UserSchema);
