🧪 Prueba Técnica: Plataforma Ecommerce orientada a Backend
🎯 Objetivo

Diseñar e implementar parcialmente una plataforma de e-commerce simplificada, enfocada principalmente en el desarrollo backend.

La solución debe contemplar dos capacidades principales:

Gestión de catálogo de productos
Gestión de órdenes

La implementación debe realizarse bajo una arquitectura de microservicios, desplegable o simulable en la nube, utilizando NestJS como framework principal y una base de datos relacional.

Como valor agregado, se podrá incluir un frontend funcional que consuma los servicios desarrollados.

✅ Requerimientos obligatorios
La solución debe estar pensada para ejecutarse en un entorno cloud o una simulación local del mismo
La arquitectura debe ser de microservicios
El desarrollo backend debe estar hecho en NestJS
La persistencia debe realizarse en una base de datos relacional
Deben existir al menos dos servicios:
Servicio de catálogo de productos
Servicio de órdenes
🏗️ 1. Planeación de la solución (Arquitectura)

Diseñar una arquitectura de alto nivel para la plataforma usando microservicios.

Debe incluir como mínimo:

API Gateway o punto de entrada
Microservicio de productos
Microservicio de órdenes
Base de datos relacional
Recursos cloud o simulados localmente
Comunicación entre servicios

Se debe explicar cómo esta arquitectura permite:

Escalabilidad
Mantenibilidad
Separación de responsabilidades

📦 Entregable:
Diagrama de arquitectura y explicación breve de los componentes.

☁️ 2. Diseño Cloud

Con base en la arquitectura planteada, definir cómo sería su despliegue o simulación en un entorno cloud.

Opciones:
Despliegue real en la nube (AWS, Azure, GCP, etc.)
Simulación local usando contenedores
Uso de herramientas como LocalStack

Se espera explicar:

Cómo se desplegarían los servicios
Cómo se conectaría la base de datos
Cómo se manejaría la configuración por ambientes
Cómo se comunicarían los microservicios

📦 Entregable:
Código o configuración para correr la solución localmente e instrucciones de ejecución.

⚙️ 3. Pipeline de CI/CD (DevOps)

Configurar un pipeline básico de CI/CD para al menos uno de los microservicios usando herramientas como:

GitHub Actions
GitLab CI/CD
Azure Pipelines

El pipeline debe incluir:

Instalación de dependencias
Build del servicio
Simulación de despliegue
Incremento automático de versión
Generación de changelog basada en commits o pull requests

📦 Entregable:
Archivo de configuración del pipeline y explicación breve de sus etapas.

🧠 4. Backend

Implementar dos microservicios en NestJS con al menos un endpoint REST funcional.

📦 4.1 Servicio de catálogo de productos

Debe permitir como mínimo:

Listar productos

Opcional:

Crear productos
Consultar producto por ID
Actualizar productos
🧾 4.2 Servicio de órdenes

Debe permitir como mínimo:

Crear una orden
Listar órdenes

Opcional:

Consultar orden por ID
Validaciones de negocio
Relación entre órdenes y productos
⚠️ Consideraciones técnicas
Uso obligatorio de base de datos relacional
Estructura limpia del proyecto
Uso correcto de:
Controladores
Servicios
Módulos
DTOs
Validaciones y manejo de errores
Principios REST
🎨 5. Frontend funcional (Plus)

Como valor agregado, se puede desarrollar un frontend sencillo que consuma los microservicios.

Ejemplos:
Listado de productos
Creación de órdenes
Visualización de órdenes
📊 Criterios de evaluación
🏗️ Arquitectura
Claridad de la propuesta
Correcto uso de microservicios
☁️ Cloud Design
Entendimiento de despliegue en la nube
⚙️ DevOps
Calidad del pipeline CI/CD
🧠 Backend
Calidad del código
Buenas prácticas en NestJS
Diseño REST
🎨 Frontend (plus)
Integración con backend
Funcionalidad básica
⭐ Bonus opcionales
Autenticación (login/logout)
Documentación de API (Swagger o Postman)
Diagrama entidad-relación de la base de datos
Buenas prácticas de Git (commits pequeños, branching)
📦 Entrega

Subir el código a un repositorio en GitHub e incluir un README con:

Instrucciones de instalación
Pasos para ejecutar el proyecto
Explicación breve de la arquitectura
Descripción de decisiones técnicas relevantes
