const jwt = require('jsonwebtoken');

// Obtiene la clave secreta JWT de las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para verificar el token JWT
module.exports = function (req, res, next) {
    // Obtener el token del encabezado de la solicitud
    // El token se envía típicamente como 'Bearer TOKEN_AQUI'
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ message: 'No hay token, autorización denegada.' });
    }

    try {
        // Verificar el token
        // jwt.verify() decodifica el token usando la clave secreta
        const decoded = jwt.verify(token, JWT_SECRET);

        // Adjuntar el objeto de usuario decodificado a la solicitud
        // Esto hace que el ID del usuario y su rol estén disponibles en las rutas protegidas
        req.user = decoded.user;
        next(); // Continuar con la siguiente función de middleware o la ruta
    } catch (err) {
        // Si el token no es válido (expirado, malformado, etc.)
        res.status(401).json({ message: 'Token no válido.' });
    }
};
