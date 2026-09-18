# Lizárraga & Ibarra Abogados

Sitio institucional, sistema editorial y portal privado para Lizárraga & Ibarra Abogados.

Incluye el sitio público, perfiles de socios, formulario de contacto, agenda, avisos jurídicos, portal de clientes, administración de contenido, asuntos, documentos y notificaciones.

## Desarrollo local

Requiere Node.js 22 o superior y una base PostgreSQL.

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

El sitio queda disponible en `http://localhost:3100`.

Para crear o rotar un administrador local, configure temporalmente `ADMIN_INITIAL_PASSWORD` y ejecute:

```bash
npm run admin:create -- --email correo@ejemplo.com --name "Nombre del administrador"
```

## Validación

```bash
npm run lint
npm run test
npm run build
```

## Producción: Cloudflare + Neon

La ruta de despliegue prevista es Cloudflare Workers para la aplicación, Neon para PostgreSQL y Cloudflare R2 para documentos privados y medios. La guía completa, variables requeridas y orden de migración están en [docs/CLOUDFLARE_NEON_DEPLOYMENT.md](docs/CLOUDFLARE_NEON_DEPLOYMENT.md).

No se guardan credenciales, URLs privadas ni secretos en este repositorio.
