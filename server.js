// Cargar variables de entorno desde el archivo .env
require('dotenv').config();

// Importar los módulos necesarios
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Middleware para habilitar CORS
const bcrypt = require('bcryptjs'); // Para hashear y comparar contraseñas
const jwt = require('jsonwebtoken'); // Para generar y verificar JSON Web Tokens

// Importar los modelos de la base de datos (ASEGÚRATE DE QUE ESTOS ARCHIVOS EXISTAN EN WUNIF-BACKEND/models/)
const User = require('./models/User'); // Modelo para usuarios
const ContactMessage = require('./models/ContactMessage'); // Modelo para mensajes de contacto
const NewsPost = require('./models/NewsPost'); // Modelo para publicaciones de noticias
const ComplaintSuggestion = require('./models/ComplaintSuggestion'); // Modelo para quejas y sugerencias
const Comment = require('./models/Comment'); // Modelo para comentarios

// Importar los middlewares personalizados (ASEGÚRATE DE QUE ESTOS ARCHIVOS EXISTAN EN WUNIF-BACKEND/middleware/)
const auth = require('./middleware/auth'); // Middleware para verificar tokens JWT
const authorizeAdmin = require('./middleware/authorizeAdmin'); // Middleware para verificar rol de administrador
const authorizeSuperAdmin = require('./middleware/authorizeSuperAdmin'); // Middleware para verificar rol de super-administrador ('admin')

// Inicializar la aplicación Express
const app = express();

// Configuración del puerto del servidor
const PORT = process.env.PORT || 3003;
// URI de conexión a MongoDB obtenida de las variables de entorno
const MONGODB_URI = process.env.MONGODB_URI;
// Clave secreta para JWT obtenida de las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;

// Middlewares de Express
app.use(cors()); // Habilitar CORS para permitir solicitudes desde el frontend (React)
// Aumentar el límite de carga útil para manejar imágenes Base64 grandes (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Conexión a MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// --- Rutas de Autenticación (Registro y Login) ---

// Ruta para el registro de nuevos usuarios
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Validación: Evitar que el nombre de usuario 'admin' sea registrado
        if (username === 'admin') {
            return res.status(400).json({ message: 'El nombre de usuario "admin" está reservado.' });
        }
        // Verificar si el usuario ya existe en la base de datos
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'El usuario ya existe.' });
        }
        // Crear una nueva instancia de usuario (la contraseña se hasheará automáticamente por el middleware del modelo)
        user = new User({ username, password });
        await user.save(); // Guardar el nuevo usuario en la base de datos

        // Crear el payload para el token JWT
        const payload = { user: { id: user.id, username: user.username, role: user.role } };

        // Firmar el token JWT y enviarlo al cliente
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ message: 'Usuario registrado exitosamente', token, role: user.role });
        });
    } catch (error) {
        console.error('Error en el registro de usuario:', error.message);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para el inicio de sesión de usuarios
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Buscar el usuario por nombre de usuario
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }
        // Comparar la contraseña proporcionada con la contraseña hasheada en la base de datos
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }
        // Crear el payload para el token JWT
        const payload = { user: { id: user.id, username: user.username, role: user.role } };

        // Firmar el token JWT y enviarlo al cliente
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ message: 'Inicio de sesión exitoso', token, role: user.role });
        });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error.message);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Administración de Usuarios ---

// Ruta para obtener todos los usuarios (requiere autenticación y rol de administrador)
app.get('/api/admin/users', [auth, authorizeAdmin], async (req, res) => {
    try {
        // Excluir el campo de contraseña de la respuesta por seguridad
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para otorgar el rol de administrador a un usuario (requiere autenticación y rol de super-administrador)
app.post('/api/admin/grant-admin', [auth, authorizeSuperAdmin], async (req, res) => {
    const { usernameToUpdate } = req.body;
    if (!usernameToUpdate) {
        return res.status(400).json({ message: 'Se requiere el nombre de usuario para actualizar.' });
    }
    try {
        // No permitir que el administrador intente cambiar su propio rol
        if (usernameToUpdate === req.user.username) {
            return res.status(400).json({ message: 'No puedes cambiar tu propio rol a través de esta función.' });
        }
        // Buscar el usuario a actualizar
        const userToUpdate = await User.findOne({ username: usernameToUpdate });
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        // Si el usuario ya es administrador, no hacer nada
        if (userToUpdate.role === 'admin') {
            return res.status(200).json({ message: `El usuario ${usernameToUpdate} ya es administrador.` });
        }
        // Actualizar el rol del usuario a 'admin'
        userToUpdate.role = 'admin';
        await userToUpdate.save();
        res.status(200).json({ message: `El rol de ${usernameToUpdate} ha sido actualizado a administrador.` });
    } catch (error) {
        console.error('Error al otorgar rol de administrador:', error.message);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para revocar el rol de administrador a un usuario (requiere autenticación y rol de super-administrador)
app.put('/api/admin/revoke-admin', [auth, authorizeSuperAdmin], async (req, res) => {
    const { usernameToUpdate } = req.body;
    if (!usernameToUpdate) {
        return res.status(400).json({ message: 'Se requiere el nombre de usuario para actualizar.' });
    }
    try {
        // No permitir que el administrador intente cambiar su propio rol
        if (usernameToUpdate === req.user.username) {
            return res.status(400).json({ message: 'No puedes cambiar tu propio rol a través de esta función.' });
        }
        const userToUpdate = await User.findOne({ username: usernameToUpdate });
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        // Si el usuario ya es 'user', no hacer nada
        if (userToUpdate.role === 'user') {
            return res.status(200).json({ message: `El usuario ${usernameToUpdate} ya es un usuario normal.` });
        }
        // Actualizar el rol del usuario a 'user'
        userToUpdate.role = 'user';
        await userToUpdate.save();
        res.status(200).json({ message: `El rol de ${usernameToUpdate} ha sido revocado a usuario normal.` });
    } catch (error) {
        console.error('Error al revocar rol de administrador:', error.message);
        res.status(500).send('Error del servidor');
    }
});


// Ruta para eliminar un usuario (requiere autenticación y rol de super-administrador)
app.delete('/api/admin/users/:id', [auth, authorizeSuperAdmin], async (req, res) => {
    try {
        const userIdToDelete = req.params.id;
        const user = await User.findById(userIdToDelete);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        // No permitir que el super-admin se elimine a sí mismo
        if (user.username === 'admin') { // Asumiendo que 'admin' es el super-admin
            return res.status(400).json({ message: 'No puedes eliminar la cuenta del administrador principal.' });
        }
        await User.findByIdAndDelete(userIdToDelete);
        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Mensajes de Contacto ---

// Ruta para enviar un mensaje de contacto (público, no requiere autenticación)
app.post('/api/contactmessages', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const newContactMessage = new ContactMessage({ name, email, message });
        await newContactMessage.save();
        res.status(201).json({ message: 'Mensaje enviado exitosamente.' });
    } catch (error) {
        console.error('Error al enviar mensaje de contacto:', error);
        res.status(500).send('Error del servidor.');
    }
});

// Ruta para obtener todos los mensajes de contacto (requiere autenticación y rol de administrador)
// CAMBIO IMPORTANTE: La ruta ahora es /api/admin/contactmessages para consistencia en el panel de admin
app.get('/api/admin/contactmessages', [auth, authorizeAdmin], async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener mensajes de contacto:', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para eliminar un mensaje de contacto (requiere autenticación y rol de administrador)
// CAMBIO IMPORTANTE: La ruta ahora es /api/admin/contactmessages/:id para consistencia en el panel de admin
app.delete('/api/admin/contactmessages/:id', [auth, authorizeAdmin], async (req, res) => {
    try {
        const messageIdToDelete = req.params.id;
        const message = await ContactMessage.findByIdAndDelete(messageIdToDelete);
        if (!message) {
            return res.status(404).json({ message: 'Mensaje no encontrado.' });
        }
        res.status(200).json({ message: 'Mensaje eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar mensaje de contacto:', error);
        res.status(500).send('Error del servidor');
    }
});


// --- Rutas de Publicaciones de Noticias (CRUD Completo) ---

// Crear una publicación de noticias (requiere autenticación y rol de administrador)
app.post('/api/admin/news', [auth, authorizeAdmin], async (req, res) => {
    const { title, content, fontFamily, imageUrl } = req.body;
    if (!title || !content || !fontFamily || !imageUrl) {
        return res.status(400).json({ message: 'El título, el contenido, la fuente y la URL de la imagen son obligatorios.' });
    }
    try {
        const author = req.user.username;
        const newPost = new NewsPost({ title, content, author, fontFamily, imageUrl });
        await newPost.save();
        res.status(201).json({ message: 'Publicación de noticias creada exitosamente.', post: newPost });
    } catch (error) {
        console.error('Error al crear publicación de noticias:', error);
        res.status(500).send('Error del servidor');
    }
});

// Obtener todas las publicaciones de noticias (público)
app.get('/api/news', async (req, res) => {
    try {
        const posts = await NewsPost.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error al obtener publicaciones de noticias:', error);
        res.status(500).send('Error del servidor');
    }
});

// Obtener una publicación de noticias por ID (público)
app.get('/api/news/:id', async (req, res) => {
    try {
        const post = await NewsPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Publicación no encontrada.' });
        }
        res.status(200).json(post);
    } catch (error) {
        console.error('Error al obtener publicación de noticias por ID:', error);
        res.status(500).send('Error del servidor');
    }
});

// Actualizar una publicación de noticias (requiere autenticación y rol de administrador)
app.put('/api/admin/news/:id', [auth, authorizeAdmin], async (req, res) => {
    const { title, content, fontFamily, imageUrl } = req.body;
    try {
        const post = await NewsPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Publicación no encontrada.' });
        }
        post.title = title || post.title;
        post.content = content || post.content;
        post.fontFamily = fontFamily || post.fontFamily;
        post.imageUrl = imageUrl || post.imageUrl;
        await post.save();
        res.status(200).json({ message: 'Publicación actualizada exitosamente.', post });
    } catch (error) {
        console.error('Error al actualizar publicación de noticias:', error);
        res.status(500).send('Error del servidor');
    }
});

// Eliminar una publicación de noticias (requiere autenticación y rol de administrador)
app.delete('/api/admin/news/:id', [auth, authorizeAdmin], async (req, res) => {
    try {
        const post = await NewsPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Publicación no encontrada.' });
        }
        await NewsPost.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Publicación eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar publicación de noticias:', error);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Quejas y Sugerencias ---

// Enviar una queja/sugerencia (público, no requiere autenticación)
app.post('/api/complaints-suggestions', async (req, res) => {
    const { name, email, type, message } = req.body;
    if (!name || !email || !type || !message) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const newComplaintSuggestion = new ComplaintSuggestion({ name, email, type, message });
        await newComplaintSuggestion.save();
        res.status(201).json({ message: 'Queja/Sugerencia enviada exitosamente.' });
    } catch (error) {
        console.error('Error al enviar queja/sugerencia:', error);
        res.status(500).send('Error del servidor.');
    }
});

// Obtener todas las quejas/sugerencias (requiere autenticación y rol de administrador)
app.get('/api/admin/complaints-suggestions', [auth, authorizeAdmin], async (req, res) => {
    try {
        const items = await ComplaintSuggestion.find().sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        console.error('Error al obtener quejas/sugerencias:', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para responder a una queja/sugerencia (requiere autenticación y rol de administrador)
// CAMBIO IMPORTANTE: La ruta ahora usa el ID en el path
app.put('/api/admin/complaints-suggestions/:id/reply', [auth, authorizeAdmin], async (req, res) => {
    const { replyMessage } = req.body;
    if (!replyMessage) {
        return res.status(400).json({ message: 'El mensaje de respuesta es obligatorio.' });
    }
    try {
        const complaint = await ComplaintSuggestion.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ message: 'Queja/Sugerencia no encontrada.' });
        }
        complaint.response = replyMessage;
        complaint.status = 'resuelto'; // Marcar como resuelto al responder
        await complaint.save();
        res.status(200).json({ message: 'Respuesta enviada y estado actualizado.', complaint });
    } catch (error) {
        console.error('Error al responder queja/sugerencia:', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para eliminar una queja/sugerencia (requiere autenticación y rol de administrador)
app.delete('/api/admin/complaints-suggestions/:id', [auth, authorizeAdmin], async (req, res) => {
    try {
        const itemIdToDelete = req.params.id;
        const item = await ComplaintSuggestion.findByIdAndDelete(itemIdToDelete);
        if (!item) {
            return res.status(404).json({ message: 'Queja/Sugerencia no encontrada.' });
        }
        res.status(200).json({ message: 'Queja/Sugerencia eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar queja/sugerencia:', error);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Comentarios (para noticias, etc.) ---

// Obtener comentarios para un post (público)
app.get('/api/comments/:postId', async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).send('Error del servidor');
    }
});

// Añadir un comentario a un post (requiere autenticación)
app.post('/api/comments', auth, async (req, res) => {
    const { postId, content } = req.body;
    if (!postId || !content) {
        return res.status(400).json({ message: 'El ID del post y el contenido del comentario son obligatorios.' });
    }
    try {
        const author = req.user.username; // El nombre de usuario del usuario autenticado
        const newComment = new Comment({ postId, author, content });
        await newComment.save();
        res.status(201).json({ message: 'Comentario añadido exitosamente.', comment: newComment });
    } catch (error) {
        console.error('Error al añadir comentario:', error);
        res.status(500).send('Error del servidor');
    }
});

// Eliminar un comentario (solo para el autor del comentario o admins)
app.delete('/api/comments/:id', auth, async (req, res) => {
    try {
        const commentId = req.params.id;
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentario no encontrado.' });
        }

        // Verificar si el usuario es el autor del comentario o un administrador
        // Simplificado: req.user.username ya es un string, no necesita .toString()
        if (comment.author !== req.user.username && req.user.role !== 'admin' && req.user.role !== 'super-admin') {
            return res.status(403).json({ message: 'No autorizado para eliminar este comentario.' });
        }

        await Comment.findByIdAndDelete(commentId);
        res.status(200).json({ message: 'Comentario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).send('Error del servidor');
    }
});


// --- Ruta de Prueba ---
app.get('/', (req, res) => {
    res.send('Servidor backend de Wunif funcionando!');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
