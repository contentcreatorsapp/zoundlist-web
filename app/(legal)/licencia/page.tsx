import Link from "next/link";
import { LEGAL } from "@/lib/legal/config";

export const metadata = { title: "Términos de Licencia Musical" };

export default function LicenciaPage() {
  return (
    <article className="zl-prose">
      <span className="zl-eyebrow">Legal</span>
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "12px 0 8px" }}>Términos de Licencia Musical</h1>
      <p className="zl-prose__updated">Última actualización: {LEGAL.updated}</p>

      <h2>1. Qué es esta licencia</h2>
      <p>
        Esta licencia regula cómo puedes usar la música de {LEGAL.brand} (las «Obras»). Forma parte de tus{" "}
        <Link href="/terminos">Términos de Uso</Link> y solo aplica mientras tengas un plan con licencia activa.
      </p>

      <h2>2. Derecho que te concedemos (sincronización)</h2>
      <p>
        Mientras tu plan esté activo, te concedemos un derecho <strong>no exclusivo, mundial e intransferible</strong> de
        descargar y <strong>sincronizar</strong> las Obras dentro de tus producciones (video, podcast y contenido digital).
      </p>

      <h2>3. Uso permitido</h2>
      <ul>
        <li>Usar las Obras como música de fondo en tus producciones.</li>
        <li>Publicarlas en plataformas online (YouTube, redes sociales, podcasts, sitios web, apps y streaming en vivo).</li>
        <li>Cortar, hacer loop y aplicar fade in/out.</li>
      </ul>

      <h2>4. Perpetuidad de lo publicado</h2>
      <p>
        Las producciones que <strong>completes y publiques durante la vigencia</strong> de tu plan permanecen licenciadas{" "}
        <strong>para siempre</strong>, aunque luego canceles. Tras cancelar, no puedes usar las Obras en <strong>nuevas</strong>{" "}
        producciones.
      </p>

      <h2>5. Certificado de licencia</h2>
      <p>
        Cada descarga genera un certificado que documenta el track, el plan y la fecha. Es tu comprobante del derecho de uso.
      </p>

      <h2>6. Uso prohibido</h2>
      <ul>
        <li><strong>No standalone:</strong> las Obras no pueden ser el contenido principal ni distribuirse como música suelta, playlist o compilación.</li>
        <li><strong>No edición que cree obra derivada</strong> (no crear «nueva música» basada en las Obras).</li>
        <li><strong>No repaquetar</strong> como samples o librería, ni subir a herramientas de IA o reconocimiento musical.</li>
        <li><strong>No entrenar</strong> sistemas de IA o machine learning con las Obras.</li>
        <li><strong>No reventa ni sublicencia</strong> a terceros, salvo lo que tu plan permita.</li>
        <li><strong>No NFTs</strong>, blockchain ni tecnologías equivalentes.</li>
        <li><strong>No theme songs, logos ni marcas.</strong></li>
        <li><strong>No contenido ilegal, de odio, violento, pornográfico</strong> ni temas sensibles sin autorización.</li>
      </ul>

      <h2>7. Planes y alcance</h2>
      <ul>
        <li><strong>Free:</strong> solo previews; sin descarga ni uso.</li>
        <li><strong>Creator:</strong> descargas y uso en tus canales propios (YouTube, podcast, redes sociales).</li>
        <li><strong>Pro:</strong> uso comercial ampliado, audio sin pérdida (lossless) y anuncios pagados.</li>
        <li><strong>Iglesias y ONGs:</strong> uso no comercial (cultos, eventos, streaming).</li>
      </ul>

      <h2>8. Procedencia (música con IA)</h2>
      <p>
        Las Obras se crean con herramientas de inteligencia artificial con curación humana y documentación de su origen.
        Declaramos contar con los derechos necesarios para licenciártelas conforme a estos términos.
      </p>

      <h2>9. Créditos</h2>
      <p>No exigimos crédito, pero lo agradecemos.</p>

      <h2>10. Plataformas de terceros</h2>
      <p>Cada plataforma puede imponer sus propias restricciones; no somos responsables de ellas.</p>

      <h2>11. Vigencia y terminación</h2>
      <p>
        La licencia dura mientras tu plan esté activo. Al terminar, conservas lo ya publicado (sección 4), pero no puedes crear
        nuevas producciones con las Obras.
      </p>

      <h2>12. Reserva de derechos</h2>
      <p>Todos los derechos no concedidos expresamente quedan reservados a {LEGAL.company}.</p>

      <h2>13. Contacto</h2>
      <p>
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </article>
  );
}
