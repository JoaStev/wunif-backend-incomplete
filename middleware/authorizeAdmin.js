// Middleware para verificar si el usuario es administrador
module.exports = function (req, res, next) {
    // req.user.role viene del middleware de autenticación (auth.js)
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next(); // Si el usuario es administrador, continuar
};
