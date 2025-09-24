# Backend API for To-Do List App (Node.js)

Este repositorio contiene el backend para una aplicación de lista de tareas, construido con Node.js, Express y PostgreSQL. Proporciona una API RESTful segura para la gestión de usuarios y tareas, utilizando autenticación basada en JWT.

---

## ✨ Características

- **Autenticación Segura:** Sistema de registro e inicio de sesión con contraseñas hasheadas (`bcrypt`) y JSON Web Tokens (JWT).
- **API RESTful para Tareas (CRUD):** Endpoints para Crear, Leer, Actualizar y Eliminar tareas, protegidos para que un usuario solo pueda acceder a sus propios datos.
- **Arquitectura Profesional en Capas:** El código está organizado siguiendo el patrón **Controlador - Servicio - Repositorio** para facilitar el mantenimiento, la escalabilidad y las pruebas.
- **Base de Datos Relacional:** Utiliza PostgreSQL para una gestión de datos robusta y fiable.

---

## 🛠️ Tecnologías Utilizadas

- ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=FFFFFF)
- ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=FFFFFF)
- ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF)
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=FFFFFF)
- ![JSON Web Tokens](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=FFFFFF)

---

## 🏛️ Arquitectura

El backend está construido con una **Arquitectura en Capas** para separar las responsabilidades del código de manera clara y eficiente.

```text
              [ Petición HTTP (Cliente) ]
                     |
              [ index.ts (Express) ]
                     |
              [ api/ (Router) ]
                     |
              [ middleware/ (Auth JWT) ]
                     |
              [ api/ (Controller) ]
                     |
              [ services/ (Lógica de Negocio) ]
                     |
              [ repositories/ (Acceso a Datos) ]
                     |
              [ config/ (Pool de Conexión) ]
                     |
              [ Base de Datos (PostgreSQL) ]
```

## ⚙️ Configuración y Puesta en Marcha

Sigue estos pasos para levantar el servidor en tu entorno local.

### 1. Pre-requisitos

- Node.js (v16 o superior)
- PostgreSQL corriendo (localmente o en un servicio como Supabase)

### 2. Instalación

```bash
# 1. Clona el repositorio
git clone [https://github.com/tu-usuario/tu-repositorio-backend.git](https://github.com/tu-usuario/tu-repositorio-backend.git)

# 2. Entra en la carpeta
cd tu-repositorio-backend

# 3. Instala las dependencias
npm install
```

### 3. Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto. Este archivo guardará tus claves secretas y no debe ser subido a GitHub.

Puedes copiar esta plantilla y rellenarla con tus datos:

```env
# Puerto en el que correrá el servidor
PORT=3000

# Secreto para firmar los JWT (usa algo largo, aleatorio y seguro)
JWT_SECRET=ESTO_ES_UN_SECRETO_MUY_SEGURO_CAMBIAME

# Credenciales de la Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_secreta
DB_DATABASE=tododb
```

### 4. Base de datos

Asegúrate de haber creado una base de datos con el nombre que especificaste en `DB_DATABASE`. Luego, ejecuta el script SQL para crear las tablas `usuarios` y `tareas`.

### 5. Iniciar el Servidor

```bash
# Inicia el servidor en modo de desarrollo (con recarga automática)
npm run dev
```

- El servidor se ejecutará en `http://localhost:3000` (o el puerto que definas en `.env`).

## 📖 Documentación de la API

Todas las rutas de tareas (`/api/tareas`) están protegidas y requieren un Bearer Token JWT en la cabecera `Authorization`.

### Autenticación (`/api/auth`)

- `POST /register`
  Crea un nuevo usuario.
  - **Body:**

  ```json
  { "email": "user@example.com", "password": "password123" }
  ```

- `POST /login`
 Autentica a un usuario y devuelve un token JWT.
  - **Body:**  

  ```json
  { "email": "user@example.com", "password": "password123" }
  ```

### Tareas (/api/tareas)

- `GET /`: Obtiene la lista de tareas del usuario autenticado.

- `POST /`: Crea una nueva tarea.
  - **Body:**

       ```json
       { "descripcion": "Mi nueva tarea" }
       ```

- `PUT /:id`: Actualiza una tarea existente.
  - **Body:**

       ```json
       { "completada": true }
       ```

- `DELETE /:id`: Elimina una tarea.
