# Auditoría de referencia XS — 17 septiembre 2026

Inspección exclusivamente de lectura de `../xs-abogados-reference`. No se ejecutó su aplicación, instalación ni migraciones. No se leyeron ni copiaron archivos de secretos. El manifiesto SHA-256 permite verificar la integridad del contenido original al finalizar.

## Stack y superficie
Next.js 16 / React 19 / TypeScript estricto, App Router, Prisma 6 / PostgreSQL (Neon), Auth.js Credentials, bcrypt, Zod, Tailwind 3, Motion, Brevo y outbox persistente. API routes y server actions separadas de servicios; layouts privados diferenciados para administrador, socio, abogado y cliente. Proxy con CSP por nonce. Dependencias y lock se instalarán de forma independiente.

## Autenticación y autorización
Roles ADMIN / LAWYER / CLIENT, rango PARTNER / ASSOCIATE separado del rol. Estados INVITED / ACTIVE / SUSPENDED / ARCHIVED. Invitaciones y recuperación con hash de token, expiración y consumo atómico; reemisión revoca tokens anteriores. JWT se contrasta con estado de usuario, sessionVersion y UserSession; cierre de sesión y revocación persistentes. MFA TOTP cifrado y códigos de recuperación de un uso disponibles, aunque no obligatorio.
Políticas centrales (`server/policies`) restringen asuntos al cliente propietario o abogado asignado. Documentos vuelven a validar asunto, visibilidad y escaneo CLEAN antes de emitir enlace firmado. Riesgo: carreras de activación frente a suspensión; reforzar la transición INVITED→ACTIVE dentro de transacción. La protección de páginas por layout no sustituye controles de cada acción.

## Portal, expedientes y comunicaciones
Matter con etapas, prioridad, siguiente acción, asignaciones y archivo lógico. Avances y mensajes distinguen contenido interno y visible; DTO reduce filtración. Notificaciones persistentes con deduplicación. Documentos privados por objeto, cuarentena, inspección de contenido, hash y ClamAV; local sólo para desarrollo. Sin gestión administrativa central de documentos ni versionado explícito.

## Agenda
Reglas de disponibilidad, bloqueos, duración, buffers, horizonte y aviso mínimo. Solicitudes, propuestas contraparte, holds y confirmaciones; slots con índice único por recurso/hora y transacciones. ICS con UID y secuencia. Google Calendar opcional en arquitectura, pero implementación original obliga a Google en producción: añadir proveedor interno real sustentado por DB. Revisar carreras y límites de intervalos con integración PostgreSQL.

## Correo
Brevo, plantillas escapadas, outbox con payload cifrado, idempotencia, bloqueo de jobs, backoff y dead letter, panel de reintentos. Separar aceptación persistida de entrega efectiva. No conectar a cuenta XS. Mocks y dev-memory existentes no deben producir éxito falso en LI.

## CMS y media
Articles con bloques tipados, revisiones, envío a socio, aprobación, publicación y archivo. Renderizado estructurado evita HTML arbitrario. No existe CaseStudy. Equipo público original en array, administración LawyerProfile desacoplada: unificar consulta. MediaAsset optimiza con Sharp pero usa almacenamiento privado compartido; endpoint público sólo considera portadas de artículos. Reconstruir biblioteca con categorías, búsquedas, metadatos, utilización, permisos y almacenamiento público dedicado; habilitar inline, equipo y casos con publicación explícita. No copiar artículos, casos, integrantes ni imágenes editoriales de XS.

## Seguridad e infraestructura
Rate limit por DB disponible, comprobación same-origin, passwords hash, cifrado AES, logs redactados, cron secrets, headers, health autenticado. Validación de runtime depende de VERCEL_ENV; proteger también despliegues Node de producción. R2 no soporta todos los headers SSE de AWS: adaptar sin desactivar cifrado en reposo del proveedor. Mantener noindex privado. No reutilizar claves, BD, .env, configuración de deployment ni cuentas.

## Pruebas y deuda
Suite Vitest: RBAC, tokens, cifrado, outbox, almacenamiento, validación, escaneo, calendarios, cron. Integración de invariantes DB y E2E públicos existentes, pero no acreditan los recorridos completos de LI. Añadir casos/media/perfiles y journeys de aislamiento con DB nueva. Revisar accesibilidad (texto pequeño y drawers sin focus trap), formularios, estados y móvil. Casos públicos inventados prohibidos; arrays editoriales de XS no se publicarán en LI.

## A. Reutilizar
Servicios de cuentas, políticas, expedientes, notificaciones, citas, ICS, Brevo/outbox, escaneo y validadores, tras adaptación; componentes privados funcionales y pruebas relevantes.
## B. Refactorizar
Branding residual, datos estáticos, ajustes, SSR público, fallbacks simulados, integración S3/R2, activación, navegación privada y tipografía.
## C. Reconstruir
Sitio público completo, identidad visual, login limpio, biblioteca media, casos de éxito, editor de perfiles con foto, seed sólo de contenido real.
## D. Eliminar
Preview access modal, demos de XS, usuarios de prueba del seed productivo, fotos ajenas, dirección y horarios de XS, artículos estáticos, referencias de infraestructura XS.
## E. Mejorar
Separación de buckets, consulta pública desde CMS, permisos editoriales, estados vacíos sobrios, protección de publicación, tests de IDOR, documentación operativa.
## F. Riesgos
Credenciales externas ausentes; no se puede afirmar deploy ni envío de correo real. Falta fotografía de Felipe, domicilio y aviso legal definitivo. Validación de runtime y jobs requieren prueba en proveedor final. Auth.js beta exige mantener versión fijada y revisar cambios antes de actualizar.
## G. Deuda
Servicios y componentes extensos; evolución incremental modular. UI de referencia tiene más densidad visual y tamaños de texto menores de los deseables. Dependencias deben auditarse tras instalar.
## H. Arquitectura LI
Monolito modular Next.js + PostgreSQL/Prisma, /portal compartiendo origen para cookies y RBAC; Vercel como destino, Cloudflare DNS. Buckets independientes de media editorial y documentos confidenciales. Brevo con outbox y agenda interna real (Google opcional). Sin dependencia runtime del repositorio de referencia.

Fuentes técnicas consultadas: https://nextjs.org/docs/app/guides/content-security-policy ; https://docs.prisma.io/docs/orm/v6/reference/prisma-client-reference ; https://developers.cloudflare.com/r2/api/s3/api/ .
