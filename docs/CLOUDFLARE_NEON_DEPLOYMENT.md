# Despliegue en Cloudflare Workers y Neon

Esta aplicación debe desplegarse como un **Cloudflare Worker**, no como un sitio estático ni como un proyecto de Cloudflare Pages. El portal usa SSR, Route Handlers, autenticación, administración, cargas de documentos y procesos programados.

## Arquitectura final

| Función | Servicio |
| --- | --- |
| Aplicación Next.js | Cloudflare Workers |
| Base de datos PostgreSQL | Neon |
| Documentos privados y medios | Cloudflare R2 |
| DNS, WAF, TLS y dominio | Cloudflare |
| Correo transaccional | Brevo o Resend |

## 1. Crear Neon

1. Cree un proyecto y una base de datos de producción en Neon.
2. Copie la cadena de conexión de aplicación en `DATABASE_URL`.
3. Copie la conexión directa en `DIRECT_URL`; se usa exclusivamente por Prisma CLI para migraciones y nunca debe enviarse al navegador.
4. Desde un entorno de administración seguro, ejecute:

```bash
npm ci
npm run db:deploy
npm run db:seed
```

5. Cree el administrador de producción con una contraseña temporal almacenada sólo durante el comando:

```bash
ADMIN_INITIAL_PASSWORD='una-contraseña-fuerte-y-única' \
npm run admin:create -- --email r.lizarraga@lizarragaibarra.com --name "Rodrigo Lizárraga Camacho"
```

## 2. Preparar compatibilidad de Cloudflare

La comprobación de este repositorio con `vinext` dio 89% de compatibilidad, pero identificó `next-auth` como incompatible porque usa internals de Route Handlers de Next.js. Por ello, **no ejecute `vinext init` ni despliegue con Vinext todavía**.

Para esta aplicación, use [OpenNext Cloudflare](https://opennext.js.org/cloudflare), que adapta el build estándar de Next.js a Cloudflare Workers y ofrece la compatibilidad de Node necesaria mientras la autenticación se migra a una alternativa compatible con Vinext.

El repositorio ya contiene y versiona `wrangler.jsonc` y `open-next.config.ts`. No ejecute `npx @opennextjs/cloudflare migrate`: la configuración ya está declarada y no debe regenerarse durante cada despliegue.

La configuración declarada usa el Worker canónico `lizarragaibarra`, mantiene el binding de autoreferencia que requiere OpenNext y preserva las variables configuradas en el Dashboard:

```jsonc
{
  "name": "lizarragaibarra",
  "keep_vars": true,
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "lizarragaibarra"
    }
  ]
}
```

OpenNext necesita un bucket R2 independiente para la caché incremental: cree `lizarragaibarra-opennext-cache` una sola vez antes del primer deploy. No es el bucket de documentos del portal. El binding versionado es `NEXT_INC_CACHE_R2_BUCKET`.

`@prisma/client` y `.prisma/client` quedan declarados como paquetes externos del servidor. Para Workers, el cliente Prisma detecta una URL de Neon (`*.neon.tech`) y usa `@prisma/adapter-neon`, que conecta mediante su driver serverless; las URLs locales de PostgreSQL siguen usando el cliente estándar. No se modificaron esquema ni migraciones. No suba `DATABASE_URL` o `DIRECT_URL` al repositorio.

Antes de producción, sustituya las comprobaciones de `VERCEL_*` que todavía existan en el código por variables neutrales del proveedor o por `NODE_ENV`. Cloudflare no define esas variables.

## 3. Crear R2

1. Cree dos buckets: `li-private-documents` y `li-public-media`.
2. Cree un token API de R2 con acceso mínimo a esos buckets.
3. Configure `STORAGE_PROVIDER=s3` y las variables S3/R2 incluidas en `.env.example` como secretos de Worker.
4. Mantenga el bucket de expedientes privado. Las descargas deben seguir pasando por las rutas autenticadas de la aplicación.

## 4. Configurar secretos en Cloudflare

En Workers & Pages → Worker → Settings → Variables and Secrets, agregue como secretos al menos:

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
DATA_ENCRYPTION_KEY_CURRENT
DATA_ENCRYPTION_KEY_VERSION
MFA_RECOVERY_CODE_PEPPER
RATE_LIMIT_SALT
BREVO_API_KEY
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
CRON_SECRET
```

Configure como variables no secretas `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, `STORAGE_PROVIDER`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_PUBLIC_MEDIA_BUCKET` y `CONTACT_RECIPIENT_EMAIL`.

Nunca pegue valores secretos en `wrangler.jsonc`, GitHub Actions, commits o mensajes de chat. Cloudflare permite cargarlos con `wrangler secret put NOMBRE_DEL_SECRETO`.

## 5. Desplegar

1. Conecte el repositorio GitHub a Cloudflare Workers Builds.
2. Use `main` como rama de producción.
3. Configure exactamente estos comandos:

```text
Build command: npx @opennextjs/cloudflare build
Deploy command: npx @opennextjs/cloudflare deploy
```

4. Para verificar una compilación local use `npm run cf:build`; para ejecutarla en el runtime de Workers use `npm run cf:preview`.
5. `keep_vars: true` evita que Wrangler elimine o reemplace las variables configuradas en el Dashboard. Los secretos tampoco se eliminan durante un deploy. No añada `vars`, `routes` ni secretos a `wrangler.jsonc` mientras el Dashboard siga siendo la fuente de esas configuraciones.
6. Cree un entorno `staging` separado con una base Neon distinta antes de usar producción.
7. Añada el dominio `lizarragaibarra.com` desde Cloudflare y configure `NEXT_PUBLIC_SITE_URL` y `AUTH_URL` con ese dominio.

### Nota de compatibilidad

El build actual de OpenNext informa que el soporte para middleware de Node.js es experimental. La aplicación usa `proxy.ts`; la conversión a Worker y el despliegue en seco se validaron correctamente, pero conviene comprobar autenticación y redirecciones en staging antes de publicar producción.

## 6. Operación posterior al despliegue

- Configure Cron Triggers de Cloudflare para las rutas de sincronización de calendario, envío de correos y escaneo de documentos; mantenga `CRON_SECRET` como secreto.
- Verifique inicio de sesión, invitaciones, recuperación de contraseña, subida/descarga de documentos, correo y agenda contra la base Neon de staging antes de producción.
- Cambie cualquier contraseña temporal del administrador después del primer acceso.
- Mantenga Vercel fuera de DNS, CI/CD y variables de producción.

## Referencias

- [Cloudflare: Next.js en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [OpenNext Cloudflare: primeros pasos](https://opennext.js.org/cloudflare/get-started)
- [OpenNext Cloudflare: paquetes de runtime](https://opennext.js.org/cloudflare/howtos/workerd)
- [Prisma: Cloudflare Workers con Neon](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Cloudflare: secretos de Workers](https://developers.cloudflare.com/workers/configuration/secrets/)
