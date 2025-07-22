// middleware/authorizeAdmin.js
module.exports = function (req, res, next) {
    // 403 Forbidden si el usuario no tiene rol de 'admin' o 'super-admin'
    // Esto permite que los administradores regulares sigan accediendo al panel
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};
