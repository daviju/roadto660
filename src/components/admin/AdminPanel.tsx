import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Crown, Activity, UserPlus, Search,
  ChevronDown, ChevronUp, Ban, RefreshCw, Star,
  AlertTriangle, Check, X, Filter,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/format';
import {
  staggerContainer, fadeUp, fadeUpSmall, scaleFade,
  collapseVariants, buttonTap, cardHover,
} from '../../utils/animations';
import type { Profile } from '../../types';

// ─── Skeleton loader ─────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-th-hover ${className}`} />
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// ─── KPI mini card ───────────────────────────────────────────
function KPIMiniCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow"
      variants={fadeUpSmall}
      {...cardHover}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] md:text-xs text-th-muted uppercase tracking-wider font-medium">
          {title}
        </span>
        <div className={`${color}`} aria-hidden="true">{icon}</div>
      </div>
      <p className={`font-mono text-xl md:text-2xl font-semibold ${color}`}>{value}</p>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────
export function AdminPanel() {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'pro'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ban' | 'unban' | 'changePlan' | 'resetPassword';
    userId: string;
    userName: string;
    payload?: Record<string, unknown>;
  } | null>(null);

  // Check admin access
  const isAdmin = currentProfile?.role === 'admin';

  // Fetch all profiles
  useEffect(() => {
    if (!isAdmin) return;

    const fetchProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setProfiles(data as Profile[]);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [isAdmin]);

  // ─── KPI calculations ──────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = profiles.length;
    const proUsers = profiles.filter(
      (p) =>
        p.plan === 'pro' &&
        (!p.plan_expires_at || new Date(p.plan_expires_at) > now)
    ).length;
    const activeUsers = profiles.filter(
      (p) => p.last_active_date && new Date(p.last_active_date) >= sevenDaysAgo
    ).length;
    const newUsers = profiles.filter(
      (p) => new Date(p.created_at) >= thirtyDaysAgo
    ).length;

    return { totalUsers, proUsers, activeUsers, newUsers };
  }, [profiles]);

  // ─── Filtered list ─────────────────────────────────────
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.full_name || '').toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    // Plan filter
    if (filterPlan !== 'all') {
      const now = new Date();
      result = result.filter((p) => {
        const isPro =
          p.plan === 'pro' &&
          (!p.plan_expires_at || new Date(p.plan_expires_at) > now);
        return filterPlan === 'pro' ? isPro : !isPro;
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((p) =>
        filterStatus === 'banned' ? p.is_banned : !p.is_banned
      );
    }

    return result;
  }, [profiles, searchQuery, filterPlan, filterStatus]);

  // ─── Actions ───────────────────────────────────────────
  const handleChangePlan = async (userId: string, newPlan: 'free' | 'pro') => {
    setActionLoading(userId);
    const updates: Partial<Profile> =
      newPlan === 'pro'
        ? {
            plan: 'pro',
            plan_expires_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
          }
        : {
            plan: 'free',
            plan_expires_at: null,
          };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, ...updates } : p))
      );
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    setActionLoading(userId);
    const updates: Partial<Profile> = {
      is_banned: ban,
      ban_reason: ban ? 'Baneado por administrador' : null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, ...updates } : p))
      );
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setActionLoading(userId);
    // Send password reset email via Supabase auth admin or edge function
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/roadto660/',
    });
    if (!error) {
      // Show confirmation in UI - the confirm dialog is already closed
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  // ─── Access guard ─────────────────────────────────────
  if (!isAdmin) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-[60vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-red/15 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-accent-red" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-th-text mb-2">Acceso denegado</h2>
          <p className="text-sm text-th-muted">
            Solo los administradores pueden acceder a este panel.
          </p>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <AdminSkeleton />
      </motion.div>
    );
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-accent-amber" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-th-text">Administracion</h2>
        </div>
        <p className="text-sm text-th-muted">
          Panel de control y gestion de usuarios
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <KPIMiniCard
          title="Total usuarios"
          value={kpis.totalUsers}
          icon={<Users size={18} />}
          color="text-accent-purple"
        />
        <KPIMiniCard
          title="Usuarios PRO"
          value={kpis.proUsers}
          icon={<Crown size={18} />}
          color="text-accent-amber"
        />
        <KPIMiniCard
          title="Activos (7d)"
          value={kpis.activeUsers}
          icon={<Activity size={18} />}
          color="text-accent-green"
        />
        <KPIMiniCard
          title="Nuevos (30d)"
          value={kpis.newUsers}
          icon={<UserPlus size={18} />}
          color="text-accent-cyan"
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-th-card border border-th-border-strong rounded-lg pl-9 pr-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
            aria-label="Buscar usuarios"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-th-muted" aria-hidden="true" />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as 'all' | 'free' | 'pro')}
            className="bg-th-card border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
            aria-label="Filtrar por plan"
          >
            <option value="all">Todos los planes</option>
            <option value="free">FREE</option>
            <option value="pro">PRO</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'banned')}
            className="bg-th-card border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="banned">Baneados</option>
          </select>
        </div>
      </motion.div>

      {/* User count */}
      <motion.p variants={fadeUp} className="text-xs text-th-muted">
        Mostrando {filteredProfiles.length} de {profiles.length} usuarios
      </motion.p>

      {/* User list */}
      <motion.div className="space-y-2" variants={staggerContainer} initial="initial" animate="animate">
        {filteredProfiles.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="bg-th-card rounded-xl p-8 border border-th-border text-center"
          >
            <p className="text-sm text-th-muted">No se encontraron usuarios</p>
          </motion.div>
        ) : (
          filteredProfiles.map((userProfile) => {
            const isExpanded = expandedUser === userProfile.id;
            const isSelf = userProfile.id === currentProfile?.id;
            const now = new Date();
            const isUserPro =
              userProfile.plan === 'pro' &&
              (!userProfile.plan_expires_at ||
                new Date(userProfile.plan_expires_at) > now);
            const lastActive = userProfile.last_active_date
              ? new Date(userProfile.last_active_date)
              : null;
            const isRecentlyActive =
              lastActive &&
              now.getTime() - lastActive.getTime() < 7 * 24 * 60 * 60 * 1000;

            return (
              <motion.div
                key={userProfile.id}
                className={`bg-th-card rounded-xl border overflow-hidden ${
                  userProfile.is_banned
                    ? 'border-accent-red/30'
                    : 'border-th-border'
                }`}
                variants={fadeUp}
                layout
              >
                {/* Row */}
                <button
                  className="w-full p-3 md:p-4 flex items-center gap-3 md:gap-4 text-left hover:bg-th-hover/50 transition-colors"
                  onClick={() =>
                    setExpandedUser(isExpanded ? null : userProfile.id)
                  }
                  aria-expanded={isExpanded}
                  aria-label={`Usuario: ${userProfile.full_name || userProfile.email}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      userProfile.is_banned
                        ? 'bg-accent-red/15 text-accent-red'
                        : isUserPro
                        ? 'bg-accent-amber/15 text-accent-amber'
                        : 'bg-accent-purple/15 text-accent-purple'
                    }`}
                  >
                    {(
                      userProfile.full_name?.charAt(0) ||
                      userProfile.email.charAt(0)
                    ).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-th-text truncate">
                        {userProfile.full_name || 'Sin nombre'}
                      </p>
                      {isUserPro ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-accent-amber/15 text-accent-amber rounded-full font-medium flex items-center gap-0.5 flex-shrink-0">
                          <Crown size={9} aria-hidden="true" /> PRO
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-th-hover text-th-muted rounded-full flex-shrink-0">
                          FREE
                        </span>
                      )}
                      {userProfile.is_banned && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-accent-red/15 text-accent-red rounded-full font-medium flex-shrink-0">
                          Baneado
                        </span>
                      )}
                      {userProfile.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-accent-purple/15 text-accent-purple rounded-full font-medium flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-th-muted truncate">
                      {userProfile.email}
                    </p>
                  </div>

                  {/* Meta columns (desktop) */}
                  <div className="hidden lg:flex items-center gap-6 flex-shrink-0 text-xs text-th-muted">
                    <div className="text-center w-20">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5">Registro</p>
                      <p className="font-mono text-th-secondary">
                        {formatDate(userProfile.created_at)}
                      </p>
                    </div>
                    <div className="text-center w-20">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5">Actividad</p>
                      <p className={`font-mono ${isRecentlyActive ? 'text-accent-green' : 'text-th-muted'}`}>
                        {userProfile.last_active_date
                          ? formatDate(userProfile.last_active_date)
                          : '--'}
                      </p>
                    </div>
                    <div className="text-center w-16">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5">Puntos</p>
                      <p className="font-mono text-accent-purple flex items-center justify-center gap-0.5">
                        <Star size={10} aria-hidden="true" /> {userProfile.points}
                      </p>
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div className="flex-shrink-0 text-th-muted">
                    {isExpanded ? (
                      <ChevronUp size={16} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={16} aria-hidden="true" />
                    )}
                  </div>
                </button>

                {/* Expanded panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      variants={collapseVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="border-t border-th-border"
                    >
                      <div className="p-4 space-y-4">
                        {/* Mobile-only meta */}
                        <div className="grid grid-cols-3 gap-3 lg:hidden">
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Registro</p>
                            <p className="font-mono text-xs text-th-secondary mt-0.5">
                              {formatDate(userProfile.created_at)}
                            </p>
                          </div>
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Actividad</p>
                            <p className={`font-mono text-xs mt-0.5 ${isRecentlyActive ? 'text-accent-green' : 'text-th-muted'}`}>
                              {userProfile.last_active_date
                                ? formatDate(userProfile.last_active_date)
                                : '--'}
                            </p>
                          </div>
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Puntos</p>
                            <p className="font-mono text-xs text-accent-purple mt-0.5">
                              {userProfile.points}
                            </p>
                          </div>
                        </div>

                        {/* Extra info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Racha</p>
                            <p className="font-mono text-xs text-accent-amber mt-0.5">
                              {userProfile.streak_days} dias
                            </p>
                          </div>
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Moneda</p>
                            <p className="font-mono text-xs text-th-secondary mt-0.5">
                              {userProfile.currency}
                            </p>
                          </div>
                          <div className="bg-th-bg rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-th-muted uppercase tracking-wider">Onboarding</p>
                            <p className={`text-xs mt-0.5 ${userProfile.onboarding_completed ? 'text-accent-green' : 'text-th-muted'}`}>
                              {userProfile.onboarding_completed ? 'Completado' : 'Pendiente'}
                            </p>
                          </div>
                          {isUserPro && userProfile.plan_expires_at && (
                            <div className="bg-th-bg rounded-lg p-2.5 text-center">
                              <p className="text-[10px] text-th-muted uppercase tracking-wider">PRO expira</p>
                              <p className="font-mono text-xs text-accent-amber mt-0.5">
                                {formatDate(userProfile.plan_expires_at)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-th-border">
                          {/* Change plan */}
                          <motion.button
                            onClick={() =>
                              setConfirmAction({
                                type: 'changePlan',
                                userId: userProfile.id,
                                userName: userProfile.full_name || userProfile.email,
                                payload: { newPlan: isUserPro ? 'free' : 'pro' },
                              })
                            }
                            disabled={isSelf}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isUserPro
                                ? 'bg-th-hover text-th-secondary hover:text-th-text'
                                : 'bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            {...buttonTap}
                            aria-label={isUserPro ? 'Cambiar a FREE' : 'Cambiar a PRO'}
                          >
                            <Crown size={12} aria-hidden="true" />
                            {isUserPro ? 'Cambiar a FREE' : 'Cambiar a PRO'}
                          </motion.button>

                          {/* Ban/Unban */}
                          <motion.button
                            onClick={() =>
                              setConfirmAction({
                                type: userProfile.is_banned ? 'unban' : 'ban',
                                userId: userProfile.id,
                                userName: userProfile.full_name || userProfile.email,
                              })
                            }
                            disabled={isSelf}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              userProfile.is_banned
                                ? 'bg-accent-green/15 text-accent-green hover:bg-accent-green/25'
                                : 'bg-accent-red/15 text-accent-red hover:bg-accent-red/25'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            {...buttonTap}
                            aria-label={userProfile.is_banned ? 'Desbanear' : 'Banear'}
                          >
                            <Ban size={12} aria-hidden="true" />
                            {userProfile.is_banned ? 'Desbanear' : 'Banear'}
                          </motion.button>

                          {/* Reset password */}
                          <motion.button
                            onClick={() =>
                              setConfirmAction({
                                type: 'resetPassword',
                                userId: userProfile.id,
                                userName: userProfile.full_name || userProfile.email,
                                payload: { email: userProfile.email },
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 rounded-lg text-xs font-medium transition-colors"
                            {...buttonTap}
                            aria-label="Enviar email de reset de contrasena"
                          >
                            <RefreshCw size={12} aria-hidden="true" />
                            Reset contrasena
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmAction(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar accion"
          >
            <motion.div
              className="bg-th-card border border-th-border rounded-2xl p-5 md:p-6 w-full max-w-sm"
              variants={scaleFade}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle
                  size={20}
                  className={
                    confirmAction.type === 'ban'
                      ? 'text-accent-red'
                      : 'text-accent-amber'
                  }
                  aria-hidden="true"
                />
                <h3 className="text-lg font-bold text-th-text">
                  Confirmar accion
                </h3>
              </div>

              <p className="text-sm text-th-secondary mb-6">
                {confirmAction.type === 'ban' && (
                  <>
                    Vas a <strong className="text-accent-red">banear</strong> a{' '}
                    <strong>{confirmAction.userName}</strong>. El usuario no podra acceder a la aplicacion.
                  </>
                )}
                {confirmAction.type === 'unban' && (
                  <>
                    Vas a <strong className="text-accent-green">desbanear</strong> a{' '}
                    <strong>{confirmAction.userName}</strong>. El usuario podra volver a acceder.
                  </>
                )}
                {confirmAction.type === 'changePlan' && (
                  <>
                    Vas a cambiar el plan de <strong>{confirmAction.userName}</strong> a{' '}
                    <strong className={confirmAction.payload?.newPlan === 'pro' ? 'text-accent-amber' : 'text-th-text'}>
                      {confirmAction.payload?.newPlan === 'pro' ? 'PRO' : 'FREE'}
                    </strong>.
                  </>
                )}
                {confirmAction.type === 'resetPassword' && (
                  <>
                    Se enviara un email de restablecimiento de contrasena a{' '}
                    <strong>{confirmAction.userName}</strong>.
                  </>
                )}
              </p>

              <div className="flex gap-3 justify-end">
                <motion.button
                  onClick={() => setConfirmAction(null)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={14} aria-hidden="true" />
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (confirmAction.type === 'ban') {
                      handleToggleBan(confirmAction.userId, true);
                    } else if (confirmAction.type === 'unban') {
                      handleToggleBan(confirmAction.userId, false);
                    } else if (confirmAction.type === 'changePlan') {
                      handleChangePlan(
                        confirmAction.userId,
                        confirmAction.payload?.newPlan as 'free' | 'pro'
                      );
                    } else if (confirmAction.type === 'resetPassword') {
                      handleResetPassword(
                        confirmAction.userId,
                        confirmAction.payload?.email as string
                      );
                    }
                  }}
                  disabled={actionLoading === confirmAction.userId}
                  className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    confirmAction.type === 'ban'
                      ? 'bg-accent-red hover:bg-accent-red/80'
                      : confirmAction.type === 'unban'
                      ? 'bg-accent-green hover:bg-accent-green/80'
                      : 'bg-accent-purple hover:bg-accent-purple/80'
                  }`}
                  {...buttonTap}
                >
                  {actionLoading === confirmAction.userId ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                    </motion.div>
                  ) : (
                    <Check size={14} aria-hidden="true" />
                  )}
                  Confirmar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
