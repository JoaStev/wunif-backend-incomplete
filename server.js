// Cargar variables de entorno desde el archivo .env
require('dotenv').config();

// Importar los módulos necesarios
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importar los modelos de la base de datos
const User = require('./models/User');
const ContactMessage = require('./models/ContactMessage');
const NewsPost = require('./models/NewsPost'); // Asegúrate de que el nombre del archivo sea NewsPost.js

// Importar los middlewares personalizados
const auth = require('./middleware/auth');
const authorizeAdmin = require('./middleware/authorizeAdmin');

// Importar las rutas de contacto (si las tienes en un archivo separado)
const contactRoutes = require('./routes/contact');

// Inicializar la aplicación Express
const app = express();

// Configuración del puerto del servidor
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Middlewares de Express
// Aumentar el límite de tamaño del cuerpo de la solicitud para JSON y URL-encoded
// Esto es crucial para permitir la subida de imágenes Base64 grandes.
app.use(express.json({ limit: '50mb' })); // Aumentar a 50MB (o el tamaño que consideres necesario)
app.use(express.urlencoded({ limit: '50mb', extended: true })); // También para datos codificados en URL
app.use(cors());


// Conexión a MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// --- Rutas de Autenticación (Registro y Login) ---

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === 'admin') {
            return res.status(400).json({ message: 'El nombre de usuario "admin" está reservado.' });
        }
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'El usuario ya existe.' });
        }
        user = new User({ username, password });
        await user.save();
        const payload = { user: { id: user.id, username: user.username, role: user.role } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ message: 'Usuario registrado exitosamente', token, role: user.role });
        });
    } catch (error) {
        console.error('Error en el registro de usuario:', error.message);
        res.status(500).send('Error del servidor');
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }
        const payload = { user: { id: user.id, username: user.username, role: user.role } };
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

app.get('/api/admin/users', [auth, authorizeAdmin], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).send('Error del servidor');
    }
});

app.post('/api/admin/grant-admin', [auth, authorizeAdmin], async (req, res) => {
    const { usernameToUpdate } = req.body;
    if (!usernameToUpdate) {
        return res.status(400).json({ message: 'Se requiere el nombre de usuario para actualizar.' });
    }
    try {
        const requestingUser = await User.findById(req.user.id);
        if (requestingUser.username !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el administrador principal puede otorgar roles de administrador.' });
        }
        if (usernameToUpdate === req.user.username) {
            return res.status(400).json({ message: 'No puedes cambiar tu propio rol a través de esta función.' });
        }
        const userToUpdate = await User.findOne({ username: usernameToUpdate });
        if (!userToUpdate) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        if (userToUpdate.role === 'admin') {
            return res.status(200).json({ message: `El usuario ${usernameToUpdate} ya es administrador.` });
        }
        userToUpdate.role = 'admin';
        await userToUpdate.save();
        res.status(200).json({ message: `El rol de ${usernameToUpdate} ha sido actualizado a administrador.` });
    } catch (error) {
        console.error('Error al otorgar rol de administrador:', error.message);
        res.status(500).send('Error del servidor');
    }
});

app.delete('/api/admin/users/:id', [auth, authorizeAdmin], async (req, res) => {
    try {
        const requestingUser = await User.findById(req.user.id);
        if (requestingUser.username !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el administrador principal puede eliminar usuarios.' });
        }
        const userIdToDelete = req.params.id;
        if (userIdToDelete === requestingUser.id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador principal.' });
        }
        const user = await User.findById(userIdToDelete);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        await User.findByIdAndDelete(userIdToDelete);
        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Mensajes de Contacto ---

app.use('/api/contact', contactRoutes);

app.delete('/api/contact/contactmessages/:id', [auth, authorizeAdmin], async (req, res) => {
    try {
        const messageIdToDelete = req.params.id;
        const message = await ContactMessage.findById(messageIdToDelete);
        if (!message) {
            return res.status(404).json({ message: 'Mensaje no encontrado.' });
        }
        await ContactMessage.findByIdAndDelete(messageIdToDelete);
        res.status(200).json({ message: 'Mensaje eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar mensaje de contacto:', error);
        res.status(500).send('Error del servidor');
    }
});

// --- Rutas de Publicaciones de Noticias (CRUD Completo) ---

// Crear una nueva publicación de noticias (solo para administradores)
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
        // Aquí podrías intentar detectar si el error es por el tamaño del payload
        // Sin embargo, el error "Payload Too Large" a menudo ocurre antes de que Express pueda procesar el JSON.
        // La solución principal es aumentar el límite en el middleware.
        res.status(500).send('Error del servidor');
    }
});

// Obtener todas las publicaciones de noticias (pública)
app.get('/api/news', async (req, res) => {
    try {
        const posts = await NewsPost.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error al obtener publicaciones de noticias:', error);
        res.status(500).send('Error del servidor');
    }
});

// Obtener una publicación de noticias por ID (pública)
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

// Actualizar una publicación de noticias (solo para administradores)
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

// Eliminar una publicación de noticias (solo para administradores)
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

// --- Ruta de Prueba ---
app.get('/', (req, res) => {
    res.send('Servidor backend de Wunif funcionando!');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
