// WUNIF-BACKEND/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: { // Campo para el rol del usuario
        type: String,
        enum: ['user', 'admin', 'super-admin'], // Añadido 'super-admin'
        default: 'user',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
