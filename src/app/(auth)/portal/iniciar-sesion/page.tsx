import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { safeInternalPath } from "@/lib/security/redirects";
import { SubmitButton } from "@/components/public/submit-button";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = safeInternalPath(params.callbackUrl);
  const session = await auth();
  if (session?.user.active) redirect(callbackUrl);
  async function authenticate(data: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
        otp: String(data.get("otp") || ""),
        redirectTo: callbackUrl,
      });
    } catch (e) {
      if (!(e instanceof AuthError)) throw e;
      redirect(
        "/portal/iniciar-sesion?error=credenciales&callbackUrl=" +
          encodeURIComponent(callbackUrl),
      );
    }
  }
  return (
    <section className="login-panel">
      <p className="li-label">Portal privado</p>
      <h1>Bienvenido.</h1>
      <p>Ingrese para consultar su espacio de trabajo.</p>
      {params.error && (
        <p className="form-status error" role="alert">
          No pudimos validar el acceso. Revise sus datos e intente nuevamente.
        </p>
      )}
      <form action={authenticate} className="li-form">
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <details>
          <summary>Mi cuenta utiliza una app autenticadora</summary>
          <label style={{ marginTop: 15 }}>
            Código de seguridad o recuperación
            <input name="otp" autoComplete="one-time-code" maxLength={32} />
          </label>
        </details>
        <SubmitButton>
          Iniciar sesión <ArrowUpRight size={16} />
        </SubmitButton>
      </form>
      <Link className="login-recover" href="/portal/recuperar">
        ¿Olvidó su contraseña?
      </Link>
      <div className="login-foot">
        Acceso exclusivo para clientes y colaboradores autorizados.
      </div>
    </section>
  );
}
