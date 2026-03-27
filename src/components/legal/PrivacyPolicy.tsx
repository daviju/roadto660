import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { fadeUp, staggerContainer } from '../../utils/animations';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {onBack && (
        <motion.button
          variants={fadeUp}
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-th-muted hover:text-th-text transition-colors"
        >
          <ArrowLeft size={16} /> Volver
        </motion.button>
      )}

      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
          <Shield size={20} className="text-accent-purple" />
        </div>
        <h1 className="text-2xl font-bold text-th-text">Politica de Privacidad</h1>
      </motion.div>

      <motion.p variants={fadeUp} className="text-xs text-th-muted">
        Ultima actualizacion: 27 de marzo de 2026
      </motion.p>

      <div className="space-y-6 text-sm text-th-secondary leading-relaxed">
        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">1. Responsable del tratamiento</h2>
          <p>
            El responsable del tratamiento de tus datos es el equipo de RoadTo.
            Puedes contactarnos en: <span className="text-accent-purple">soporte@roadto.app</span>
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">2. Datos que recogemos</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Datos de cuenta:</strong> email, nombre, avatar (si usas Google)</li>
            <li><strong>Datos financieros:</strong> gastos, ingresos, presupuestos, metas de ahorro y fases que tu introduces voluntariamente</li>
            <li><strong>Datos de uso:</strong> preferencias de la app, modulos activos, tema visual</li>
            <li><strong>Datos de pago:</strong> gestionados exclusivamente por Stripe. No almacenamos datos de tarjeta</li>
          </ul>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">3. Finalidad del tratamiento</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Proporcionarte el servicio de planificacion financiera personal</li>
            <li>Generar estadisticas, consejos y proyecciones basadas en tus datos</li>
            <li>Gestionar tu suscripcion y pagos (a traves de Stripe)</li>
            <li>Enviar informes por email si lo solicitas (solo plan PRO)</li>
            <li>Mejorar el servicio mediante analisis anonimizado de uso</li>
          </ul>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">4. Base legal</h2>
          <p>
            El tratamiento de tus datos se basa en tu consentimiento explicito al crear la cuenta
            y en la ejecucion del contrato de servicio. Para los informes por email,
            solicitamos tu consentimiento adicional.
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">5. Donde se almacenan tus datos</h2>
          <p>
            Tus datos se almacenan en servidores de <strong>Supabase</strong> ubicados en la Union Europea.
            Los pagos son procesados por <strong>Stripe</strong> conforme a sus propias politicas de privacidad
            y al cumplimiento PCI-DSS.
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">6. Con quien compartimos tus datos</h2>
          <p>
            No vendemos ni compartimos tus datos personales con terceros, excepto:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><strong>Stripe:</strong> para procesar pagos de suscripciones PRO</li>
            <li><strong>Resend:</strong> para enviar informes por email (solo si lo activas)</li>
            <li><strong>Anthropic:</strong> para el asesor financiero IA (solo si lo usas, sin datos identificativos)</li>
          </ul>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">7. Tus derechos (RGPD)</h2>
          <p>Como usuario en la UE, tienes derecho a:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><strong>Acceso:</strong> consultar que datos tenemos sobre ti</li>
            <li><strong>Rectificacion:</strong> corregir datos incorrectos desde Ajustes</li>
            <li><strong>Supresion:</strong> eliminar tu cuenta y todos tus datos permanentemente</li>
            <li><strong>Portabilidad:</strong> exportar todos tus datos en formato JSON</li>
            <li><strong>Oposicion:</strong> desactivar funciones como informes por email</li>
          </ul>
          <p className="mt-2">
            Puedes ejercer estos derechos directamente desde la seccion de Ajustes de la app
            o enviando un email a <span className="text-accent-purple">soporte@roadto.app</span>.
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">8. Cookies y tracking</h2>
          <p>
            RoadTo utiliza unicamente cookies esenciales para la autenticacion (sesion de Supabase).
            No utilizamos cookies de seguimiento, analiticas ni publicidad.
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">9. Periodo de retencion</h2>
          <p>
            Conservamos tus datos mientras tu cuenta este activa. Si eliminas tu cuenta,
            todos tus datos se borran permanentemente en un plazo maximo de 30 dias.
            Los datos anonimizados de uso pueden conservarse con fines estadisticos.
          </p>
        </motion.section>

        <motion.section variants={fadeUp}>
          <h2 className="text-lg font-semibold text-th-text mb-2">10. Cambios en esta politica</h2>
          <p>
            Podemos actualizar esta politica ocasionalmente. Te notificaremos de cambios significativos
            a traves de la app o por email.
          </p>
        </motion.section>
      </div>
    </motion.div>
  );
}
