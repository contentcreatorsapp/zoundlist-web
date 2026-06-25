import Link from "next/link";
import { LEGAL } from "@/lib/legal/config";

export const metadata = { title: "Términos de Uso" };

export default function TerminosPage() {
  return (
    <article className="zl-prose">
      <span className="zl-eyebrow">Legal</span>
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "12px 0 8px" }}>Términos de Uso</h1>
      <p className="zl-prose__updated">Última actualización: {LEGAL.updated}</p>

      <h2>1. Quiénes somos y qué es esto</h2>
      <p>
        {LEGAL.brand} es una plataforma web operada por {LEGAL.company} («{LEGAL.brand}», «nosotros»), accesible en{" "}
        <a href={LEGAL.url}>{LEGAL.url}</a>. Ofrecemos un catálogo de música creada con inteligencia artificial y curada
        por personas, para que creadores de contenido, videógrafos, podcasters, iglesias, agencias y marcas la usen en sus
        producciones. Estos Términos de Uso (los «Términos») regulan tu acceso y uso del sitio, los previews, las descargas
        y los demás servicios (el «Servicio»).
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al crear una cuenta, suscribirte o usar el Servicio, confirmas que leíste y aceptas estos Términos, la{" "}
        <Link href="/privacidad">Política de Privacidad</Link> y los <Link href="/licencia">Términos de Licencia Musical</Link>.
        Si no estás de acuerdo, no uses el Servicio. Si actúas en nombre de una empresa, declaras que tienes autoridad para
        obligarla.
      </p>

      <h2>3. Edad y elegibilidad</h2>
      <p>
        Debes tener al menos 18 años, o la mayoría de edad legal en tu país, o contar con el consentimiento de tu madre,
        padre o tutor para aceptar estos Términos.
      </p>

      <h2>4. Tu cuenta</h2>
      <ul>
        <li>Te registras con tu email mediante un enlace de acceso («magic link»); eres responsable de mantener segura tu cuenta y de toda la actividad en ella.</li>
        <li>Debes proporcionar información veraz y mantenerla actualizada.</li>
        <li>No compartas, vendas ni transfieras tu cuenta. Notifícanos de inmediato cualquier uso no autorizado.</li>
      </ul>

      <h2>5. La música requiere una licencia</h2>
      <p>
        Escuchar previews no te da derecho a usar la música. <strong>Solo puedes usar un track si tienes una licencia activa</strong>{" "}
        (incluida en un plan de pago) según los <Link href="/licencia">Términos de Licencia Musical</Link>. Sin licencia activa,
        tu acceso se limita a previews para evaluación y descubrimiento.
      </p>

      <h2>6. El catálogo puede cambiar</h2>
      <p>
        Añadimos, actualizamos y retiramos tracks de forma continua. Si retiramos un track, no podrás usarlo en <strong>nuevas</strong>{" "}
        producciones a partir de su retiro, aunque lo hayas descargado antes (lo ya publicado se rige por tu licencia). No
        garantizamos que un track esté disponible permanentemente. Las etiquetas (género, mood, BPM, etc.) son orientativas.
      </p>

      <h2>7. Música creada con IA</h2>
      <p>
        Nuestro catálogo se produce con herramientas de inteligencia artificial y pasa por un proceso de curación humana antes
        de publicarse. Declaramos contar con los derechos necesarios para licenciarte esta música conforme a estos Términos y a
        la licencia aplicable.
      </p>

      <h2>8. Usos prohibidos</h2>
      <p>No puedes:</p>
      <ul>
        <li>Usar la música de forma «standalone» (como experiencia de escucha en sí misma) fuera de una producción.</li>
        <li>Repaquetarla, redistribuirla o subirla como samples, librería de sonido, music bed o a sistemas de reconocimiento musical.</li>
        <li>Usar la música o cualquier contenido del Servicio para entrenar, ajustar o desarrollar sistemas de IA o machine learning, ni realizar minería de texto/datos.</li>
        <li>Usar bots, scrapers o medios automatizados para acceder o descargar contenido.</li>
        <li>Usar la música en contenido ilegal, difamatorio, que incite al odio o la violencia, discriminatorio o pornográfico, ni en temas sensibles (por ejemplo, contenido político-electoral) sin nuestro consentimiento previo.</li>
        <li>Revender, sublicenciar o explotar la música como si fuera de tu propiedad.</li>
      </ul>

      <h2>9. Contenido que subes</h2>
      <p>
        Si subes contenido al usar o gestionar tu cuenta, declaras tener los derechos necesarios y que dicho contenido no
        infringe la ley ni derechos de terceros.
      </p>

      <h2>10. Propiedad intelectual</h2>
      <p>
        Toda la música, el catálogo, la marca {LEGAL.brand} y el sitio son propiedad de {LEGAL.company} o de sus licenciantes.
        Salvo los derechos expresamente concedidos por una licencia, no adquieres ningún derecho de propiedad.
      </p>

      <h2>11. Suscripciones, pagos y cancelaciones</h2>
      <ul>
        <li>Algunas funciones requieren un plan de pago. Los pagos se procesan a través de Stripe; autorizas los cargos correspondientes.</li>
        <li>Las suscripciones se renuevan automáticamente al final de cada período (mensual o anual) salvo que canceles antes.</li>
        <li>Puedes cancelar en cualquier momento, con efecto al final del período vigente. La cancelación detiene futuros cobros, pero no genera reembolso del período ya pagado, salvo que la ley aplicable lo exija.</li>
        <li>Podemos cambiar los precios avisando con antelación; el cambio aplica desde el siguiente período.</li>
        <li>Los precios pueden no incluir impuestos aplicables, que se añadirán según tu ubicación.</li>
        <li>Las pruebas y descuentos pueden tener condiciones adicionales; si una prueba requiere datos de pago y no cancelas a tiempo, se cobrará el plan.</li>
      </ul>

      <h2>12. Certificado de licencia</h2>
      <p>
        Cada descarga válida genera un certificado de licencia que documenta tu derecho de uso. Guárdalo como comprobante. El
        alcance se detalla en los <Link href="/licencia">Términos de Licencia Musical</Link>.
      </p>

      <h2>13. Disponibilidad del Servicio</h2>
      <p>
        El Servicio se ofrece «tal cual» y «según disponibilidad». Podemos modificar, suspender o discontinuar funciones en
        cualquier momento. Procuramos continuidad, pero no garantizamos un servicio libre de errores o interrupciones.
      </p>

      <h2>14. Descargo de garantías</h2>
      <p>
        En la máxima medida permitida por la ley, {LEGAL.brand} no otorga garantías implícitas de comerciabilidad, idoneidad
        para un fin particular, no infracción, ni de disponibilidad o ausencia de errores.
      </p>

      <h2>15. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, {LEGAL.brand} no será responsable por daños indirectos, incidentales o
        consecuentes (por ejemplo, lucro cesante o pérdida de datos). Nuestra responsabilidad total máxima no excederá el mayor
        de (a) USD 100 o (b) las tarifas que nos pagaste en los 12 meses previos al hecho que originó el daño.
      </p>

      <h2>16. Indemnización</h2>
      <p>
        Aceptas indemnizar a {LEGAL.brand} frente a reclamaciones derivadas de tu uso indebido del Servicio o de la música en
        incumplimiento de estos Términos o de la licencia.
      </p>

      <h2>17. Suspensión y terminación</h2>
      <p>
        Podemos suspender o terminar tu cuenta y/o suscripción si incumples estos Términos o la licencia, o por conveniencia con
        aviso razonable. Al terminar, cesa tu derecho a acceder al contenido; lo ya publicado conforme a la licencia puede
        sobrevivir según los <Link href="/licencia">Términos de Licencia Musical</Link>.
      </p>

      <h2>18. Servicios de terceros</h2>
      <p>
        El Servicio se apoya en proveedores como Stripe (pagos), Supabase (cuentas y almacenamiento) y Resend (emails). Tu uso
        de plataformas de terceros (por ejemplo, YouTube o redes sociales) se rige por sus propios términos; no somos
        responsables de ellos.
      </p>

      <h2>19. Cambios a estos Términos</h2>
      <p>
        Podemos modificar estos Términos por razones legítimas (mejoras, nuevas funciones o motivos legales). Te avisaremos con
        antelación razonable. Continuar usando el Servicio tras la fecha de vigencia implica tu aceptación.
      </p>

      <h2>20. Ley aplicable y disputas</h2>
      <p>
        Estos Términos se rigen por las leyes de {LEGAL.jurisdiction}. Las disputas se someterán a los tribunales competentes de{" "}
        {LEGAL.jurisdiction}.
      </p>

      <h2>21. Contacto</h2>
      <p>
        Dudas o reclamaciones: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </article>
  );
}
