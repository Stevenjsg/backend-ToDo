import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import http from 'http'; // 👈 Import Node's built-in http module
import { Server } from 'socket.io'; // 👈 Import Server from socket.io
// Import your routers
import authRouter from './api/auth/auth.routes';
import itemsRouter from './api/items/items.routes';
import usersRouter from './api/users/users.routes';
import pomodoroRouter from './api/pomodoro/pomodoro.routes';
import projectsRouter from './api/projects/projects.routes';
import jwt from 'jsonwebtoken';
import { UserPayload } from './data/dataTypes';

// --- Basic Setup ---
const app = express();
const server = http.createServer(app); // 👈 Create an HTTP server using the Express app
const port = process.env.PORT || 3000;
// --- Socket.IO Setup ---
const io = new Server(server, { // 👈 Initialize Socket.IO with the HTTP server
  cors: {
    origin: "http://localhost:5173", // 👈 Your frontend URL (adjust if different)
    methods: ["GET", "POST"]
  }
});
// --- Middleware ---
// Configure CORS for Express (allow frontend origin)
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
// --- API Routes ---
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pomodoro', pomodoroRouter);
app.use('/api/projects', projectsRouter);

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('🔌 A user connected:', socket.id);

  // --- NECESITAS IDENTIFICAR AL USUARIO ---
  // Esto es un desafío: el socket no sabe quién es el usuario al conectar.
  // Opciones:
  // 1. Pasar el token JWT al conectar y validarlo con un middleware de Socket.IO.
  // 2. Hacer que el cliente emita un evento 'authenticate' con su token después de conectar.
  
  // Asumiendo Opción 2 (más simple por ahora):
  socket.on('authenticate', (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        const userId = decoded.id;
        
        // Unir al usuario a su sala personal
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        console.log(`User ${socket.id} (ID: ${userId}) joined personal room: ${userRoom}`);

        // Ahora puedes manejar 'join_project' aquí también si quieres
        socket.on('join_project', (projectId) => {
            const projectRoom = `project_${projectId}`;
            console.log(`User ${socket.id} (ID: ${userId}) joined project room: ${projectRoom}`);
            socket.join(projectRoom); 
            // Podrías verificar aquí si el usuario realmente pertenece al proyecto
            socket.emit('joined_message', `Welcome to project ${projectId}!`);
            socket.to(projectRoom).emit('user_joined', `User ${socket.id} has joined the project.`);
        });
        socket.on('leave_project', (projectId) => {
        const room = `project_${projectId}`;
        socket.leave(room); // Make the socket leave the room
        console.log(`User ${socket.id} left project room: ${room}`);
        // Optionally notify others in the room
        // socket.to(room).emit('user_left', `User ${socket.id} left.`);
    });
        
    } catch (error: any) {
        console.error("Socket authentication failed:", error.message);
        socket.disconnect(); // Desconectar si el token es inválido
    }
  });


  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
    // Socket.IO maneja automáticamente el 'leave' de las salas al desconectar.
  });
});
// Iniciar servidor
console.log("Intentando iniciar el servidor..."); // <--- Log justo antes
server.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log('⚡️ Socket.IO listening for connections');
});
export { io };