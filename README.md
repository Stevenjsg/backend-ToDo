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

