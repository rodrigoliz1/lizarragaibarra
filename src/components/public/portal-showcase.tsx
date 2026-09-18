import {
  CalendarDays,
  FileText,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

export function PortalShowcase() {
  return (
    <div
      className="portal-showcase"
      aria-label="Vista demostrativa del portal privado"
    >
      <div className="portal-window-bar">
        <div>
          <span />
          <span />
          <span />
        </div>
        <p>portal.lizarragaibarra.com</p>
        <span className="portal-demo">DEMO</span>
      </div>
      <div className="portal-window-body">
        <aside>
          <p className="li-label">Portal privado</p>
          <strong>Asunto mercantil</strong>
          <small>Referencia DEMO-LI-001</small>
          <span className="portal-status">
            <i /> Estrategia en curso
          </span>
        </aside>
        <div className="portal-dashboard">
          <div className="portal-greeting">
            <div>
              <small>Resumen del asunto</small>
              <strong>Información clara. Seguimiento puntual.</strong>
            </div>
            <ShieldCheck aria-hidden size={22} />
          </div>
          {[
            [
              CalendarDays,
              "Próxima actuación",
              "Revisión de escrito · 18 septiembre",
            ],
            [FileText, "Documentos compartidos", "4 archivos disponibles"],
            [
              MessageSquareText,
              "Última actualización",
              "Nueva nota de seguimiento",
            ],
          ].map(([Icon, label, value]) => (
            <div className="portal-demo-row" key={String(label)}>
              <Icon aria-hidden size={18} />
              <span>
                <small>{String(label)}</small>
                <strong>{String(value)}</strong>
              </span>
              <b>↗</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
