# Plan de implementación

0. Auditoría técnica y verificación de integridad de referencia.
1. Repositorio independiente; adaptar núcleo auditado, retirar datos XS; esquema, migraciones y seed real.
2. Identidad LI con assets aprobados, tokens marfil/negro/champagne, tipografía editorial, accesibilidad y movimiento reducido.
3. Sitio público: inicio, firma, servicios, perfiles, contacto, agenda, Insights, casos y avisos.
4. CMS de casos, media y equipo: publicar, archivar, proteger confidencialidad, reutilizar assets.
5. Autenticación, invitaciones, recuperación, MFA y sesiones revocables.
6. Portal de cliente y abogado: asuntos, avances, archivos, citas, mensajes y notificaciones.
7. Administración: usuarios, asignaciones, contenido, documentos, leads y ajustes.
8. Agenda real, ICS, Brevo/outbox y jobs; storage R2 separado.
9. Hardening: IDOR, CSRF, XSS, uploads, rate limit, headers y secretos.
10. Unitarias, integración PostgreSQL aislada, E2E de journeys y build.
11. QA visual y accesibilidad desktop/mobile.
12. Documentación, commits coherentes, checklist y bloqueos de despliegue.

No publicar contenido ficticio ni simular éxitos. Continuar automáticamente entre fases. Ninguna escritura en XS o brand.
