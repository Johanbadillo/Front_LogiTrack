# 🖥️ Front LogiTrack - Interfaz de Usuario del Sistema de Gestión Logística

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/status-terminado-brightgreen?style=for-the-badge" alt="Estado">
</p>

<p align="center">
  <strong>Interfaz web desarrollada en HTML, CSS y JavaScript que consume la API REST del backend de LogiTrack S.A para la gestión y seguimiento logístico.</strong>
</p>

---

## 🔗 Repositorio Backend

Este proyecto es el frontend del sistema LogiTrack. Para su correcto funcionamiento necesita tener el backend en ejecución:

> 👉 [LogiTrack - Backend (Spring Boot + Java)](https://github.com/Johanbadillo/LogiTrack)

---

## 🚀 Características del Sistema

- Interfaz visual para gestión de envíos y clientes
- Consumo de la API REST del backend LogiTrack mediante `fetch`
- Diseño responsivo con CSS puro
- Sin dependencias externas ni frameworks — HTML, CSS y JS vanilla
- Script SQL incluido para configuración inicial de la base de datos

## 📁 Estructura del Proyecto
```
📁 Front_LogiTrack/
├── index.html      # Estructura principal de la interfaz de usuario
├── style.css       # Estilos y diseño visual de la aplicación
├── script.js       # Lógica del frontend y consumo de la API REST
└── script.sql      # Script SQL de apoyo para la base de datos
```

## 🛠️ Requisitos Previos

- Navegador web moderno (Chrome, Firefox, Edge)
- Backend de [LogiTrack](https://github.com/Johanbadillo/LogiTrack) corriendo en `http://localhost:8080` (o el puerto configurado)
- No requiere instalación de dependencias adicionales

## 🚀 Cómo Usar el Proyecto

1. Clona o descarga este repositorio:
```bash
git clone https://github.com/Johanbadillo/Front_LogiTrack.git
```

2. Asegúrate de que el backend esté en ejecución:
```bash
# Desde el repositorio LogiTrack (backend)
mvn spring-boot:run
```

3. Abre el proyecto en tu navegador:
```
Abre directamente el archivo index.html en tu navegador
o usa la extensión Live Server de VS Code para ejecutarlo
```

## ⚙️ Conexión con el Backend

El archivo `script.js` realiza las peticiones HTTP a la API REST del backend. Asegúrate de que la URL base apunte correctamente al servidor donde esté corriendo el backend:
```javascript
// Ejemplo de configuración en script.js
const API_URL = "http://localhost:8080";
```

Si el backend corre en un puerto o dirección diferente, actualiza esta variable según corresponda.

---

### NOTA

Para que el sistema funcione correctamente, **ambos repositorios deben estar activos al mismo tiempo**: el backend de LogiTrack procesando las peticiones y este frontend realizando el consumo de la API.

Si encuentras errores de CORS al consumir la API, verifica que el backend tenga habilitada la configuración CORS correspondiente en su capa de `config/`.

## 👨‍💻 Autor

<div align="center">

**Hecho con 🚛 y ❤️ por Johan Monsalve**

[![GitHub](https://img.shields.io/badge/GitHub-Johanbadillo-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Johanbadillo)

</div>
