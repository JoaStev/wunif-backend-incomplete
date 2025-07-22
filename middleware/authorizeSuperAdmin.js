// WUNIF-BACKEND/middleware/authorizeSuperAdmin.js
const authorizeSuperAdmin = (req, res, next) => {
    // req.user viene del middleware 'auth' y contiene la información del usuario autenticado
    // Asumimos que el super-admin es el usuario con username 'admin'
    if (req.user && req.user.username === 'admin') {
        next(); // El usuario es el super-admin, permite que la solicitud continúe
    } else {
        // Si el usuario no es el super-admin, envía un error 403 (Prohibido)
        res.status(403).json({ message: 'Acceso denegado. Solo el super-administrador puede realizar esta acción.' });
    }
};

module.exports = authorizeSuperAdmin;
