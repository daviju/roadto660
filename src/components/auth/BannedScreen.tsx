import { motion } from 'framer-motion';
import { ShieldX, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fadeUp } from '../../utils/animations';

export function BannedScreen() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md text-center"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <div className="bg-th-card border border-accent-red/20 rounded-2xl p-8 space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-red/10">
            <ShieldX size={32} className="text-accent-red" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-th-text mb-2">Cuenta suspendida</h1>
            <p className="text-th-secondary text-sm">
              Tu cuenta ha sido suspendida por un administrador.
            </p>
          </div>

          {profile?.ban_reason && (
            <div className="bg-accent-red/5 border border-accent-red/10 rounded-xl p-4 text-left">
              <p className="text-xs text-th-muted mb-1">Motivo:</p>
              <p className="text-sm text-th-text">{profile.ban_reason}</p>
            </div>
          )}

          <div className="space-y-3">
            <a
              href="mailto:soporte@roadto.app"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-th-input border border-th-border rounded-xl text-th-text text-sm hover:bg-th-hover transition-colors"
            >
              <Mail size={16} />
              Contactar con soporte
            </a>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-th-muted text-sm hover:text-th-text transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
