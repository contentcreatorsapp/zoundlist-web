import Link from "next/link";
import { LEGAL } from "@/lib/legal/config";

export const metadata = { title: "Política de Privacidad" };

export default function PrivacidadPage() {
  return (
    <article className="zl-prose">
      <span className="zl-eyebrow">Legal</span>
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "12px 0 8px" }}>Política de Privacidad</h1>
      <p className="zl-prose__updated">Última actualización: {LEGAL.updated}</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {LEGAL.company}, operadora de {LEGAL.brand} (<a href={LEGAL.url}>{LEGAL.url}</a>), es responsable del tratamiento de tus
        datos personales. Contacto: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li><strong>Datos de cuenta:</strong> email, nombre, país e idioma.</li>
        <li><strong>Datos de suscripción:</strong> plan, estado e historial.</li>
        <li><strong>Datos de pago:</strong> procesados por Stripe; no almacenamos los datos completos de tu tarjeta.</li>
        <li><strong>Datos de uso:</strong> tracks escuchados o descargados, búsquedas, interacciones y preferencias.</li>
        <li><strong>Datos técnicos:</strong> IP, tipo de dispositivo y navegador, identificadores, fechas y duración de visitas.</li>
        <li><strong>Comunicaciones:</strong> mensajes a soporte y respuestas a encuestas.</li>
        <li><strong>Cookies y tecnologías similares</strong> (ver sección 8).</li>
      </ul>

      <h2>3. Cómo usamos tus datos y base legal</h2>
      <ul>
        <li><strong>Prestar el Servicio</strong> (cuenta, previews, descargas, certificados) — ejecución del contrato.</li>
        <li><strong>Procesar pagos</strong> vía Stripe — ejecución del contrato / obligación legal.</li>
        <li><strong>Mantener, asegurar y mejorar</strong> la plataforma — interés legítimo.</li>
        <li><strong>Personalizar recomendaciones</strong> — interés legítimo.</li>
        <li><strong>Enviar emails transaccionales</strong> (enlace de acceso, confirmaciones, avisos de cuenta) vía Resend — ejecución del contrato.</li>
        <li><strong>Marketing</strong>, si aplica — consentimiento o interés legítimo; puedes darte de baja en cualquier email.</li>
        <li><strong>Cumplir obligaciones legales</strong> (impuestos, contabilidad) — obligación legal.</li>
        <li><strong>Defender derechos</strong> — interés legítimo.</li>
      </ul>

      <h2>4. Con quién compartimos tus datos</h2>
      <ul>
        <li><strong>Supabase</strong> — autenticación, base de datos y almacenamiento.</li>
        <li><strong>Stripe</strong> — procesamiento de pagos.</li>
        <li><strong>Resend</strong> — envío de emails transaccionales.</li>
        <li><strong>Vercel</strong> — alojamiento e infraestructura del sitio.</li>
        <li>Autoridades públicas cuando la ley lo exija, y posibles adquirentes en caso de fusión o venta.</li>
      </ul>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Algunos proveedores pueden procesar datos fuera de tu país (por ejemplo, en EE. UU.). Aplicaremos las salvaguardas
        exigidas por la ley aplicable.
      </p>

      <h2>6. Conservación</h2>
      <p>
        Conservamos tus datos mientras tengas una cuenta activa y por un período razonable posterior para cumplir obligaciones
        legales o atender reclamaciones.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Según tu jurisdicción, puedes ejercer derechos de acceso, rectificación, supresión, portabilidad, oposición y
        restricción, y presentar una queja ante la autoridad competente. Escríbenos a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>8. Cookies y analítica</h2>
      <p>
        Usamos cookies y tecnologías similares: <strong>necesarias</strong> (sesión y autenticación) y, si las activas,{" "}
        <strong>analíticas y de marketing</strong>. Puedes gestionar tus preferencias desde tu navegador.
      </p>

      <h2>9. Emails transaccionales</h2>
      <p>
        Para operar tu cuenta te enviamos correos esenciales (enlace de acceso, confirmaciones, recibos y avisos). Estos no son
        marketing y son necesarios para el Servicio.
      </p>

      <h2>10. Eliminación de cuenta</h2>
      <p>
        Puedes eliminar tu cuenta desde el panel o escribiendo a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Al hacerlo,
        eliminaremos o anonimizaremos tus datos, salvo los que debamos conservar por ley. Lo publicado con licencia activa puede
        regirse por los <Link href="/licencia">Términos de Licencia Musical</Link>.
      </p>

      <h2>11. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ningún sistema es 100 % seguro.
      </p>

      <h2>12. Menores</h2>
      <p>El Servicio no está dirigido a menores de 18 años.</p>

      <h2>13. Cambios</h2>
      <p>
        Podemos actualizar esta Política; indicaremos la fecha de «última actualización» y avisaremos si los cambios son
        relevantes.
      </p>

      <h2>14. Contacto</h2>
      <p>
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> — {LEGAL.company}.
      </p>
    </article>
  );
}
