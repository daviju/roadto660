import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, DollarSign, Calendar, ToggleLeft, ToggleRight,
  Plus, X, ArrowRight, ArrowLeft, Upload, Sparkles, Check,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { parseExcelFile, movementsToRecords } from '../../utils/excelImport';
import { fadeUp, buttonTap, staggerContainer, fadeUpSmall } from '../../utils/animations';
import { useToast } from '../shared/Toast';

const DEFAULT_CATEGORIES = [
  { name: 'Supermercado', slug: 'supermercado', color: '#34d399', icon: 'shopping-cart', budget: 250 },
  { name: 'Comer fuera', slug: 'comer-fuera', color: '#fbbf24', icon: 'utensils', budget: 30 },
  { name: 'Suscripciones', slug: 'suscripciones', color: '#60a5fa', icon: 'credit-card', budget: 22 },
  { name: 'Combustible', slug: 'combustible', color: '#fb923c', icon: 'fuel', budget: 80 },
  { name: 'Tabaco/Vaper', slug: 'tabaco-vaper', color: '#f87171', icon: 'cigarette', budget: 0 },
  { name: 'Vending', slug: 'vending', color: '#ef4444', icon: 'coffee', budget: 0 },
  { name: 'Salud', slug: 'salud', color: '#34d399', icon: 'heart-pulse', budget: 15 },
  { name: 'Ropa', slug: 'ropa', color: '#a78bfa', icon: 'shirt', budget: 25 },
  { name: 'Compras', slug: 'compras', color: '#a78bfa', icon: 'shopping-bag', budget: 0 },
  { name: 'Gaming', slug: 'gaming', color: '#8b5cf6', icon: 'gamepad-2', budget: 0 },
  { name: 'Regalos', slug: 'regalos', color: '#c084fc', icon: 'gift', budget: 0 },
  { name: 'Transporte', slug: 'transporte', color: '#fb923c', icon: 'car', budget: 0 },
  { name: 'Seguros', slug: 'seguros', color: '#94a3b8', icon: 'shield', budget: 0 },
  { name: 'Otros', slug: 'otros', color: '#94a3b8', icon: 'circle', budget: 0 },
];

const MODULES = [
  { key: 'module_budgets', label: 'Presupuestos mensuales', desc: 'Pon limites a cada categoria', default: true },
  { key: 'module_charts', label: 'Graficos y estadisticas', desc: 'Visualiza tus datos', default: true },
  { key: 'module_tips', label: 'Consejos de ahorro', desc: 'Tips personalizados cada mes', default: true },
  { key: 'module_simulator', label: 'Simulador de metas', desc: 'Calcula cuando alcanzas tus objetivos', default: true },
  { key: 'module_timeline', label: 'Timeline / Fases', desc: 'Planifica tus metas por etapas', default: false },
  { key: 'module_motorcycles', label: 'Comparador de objetivos', desc: 'Compara opciones y precios', default: false },
];

export function Onboarding() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCustomCategories, setShowCustomCategories] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [payDay, setPayDay] = useState(28);
  const [currency] = useState('EUR');

  // Step 2
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.key, m.default]))
  );

  // Step 3
  const [enabledCats, setEnabledCats] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES.map((c) => c.slug))
  );
  const [catBudgets, setCatBudgets] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.slug, c.budget]))
  );
  const [newCatName, setNewCatName] = useState('');

  // Step 4
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const toggleModule = (key: string) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCat = (slug: string) => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const addCustomCat = () => {
    if (!newCatName.trim()) return;
    const slug = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    DEFAULT_CATEGORIES.push({ name: newCatName.trim(), slug, color: '#94a3b8', icon: 'circle', budget: 0 });
    enabledCats.add(slug);
    setEnabledCats(new Set(enabledCats));
    catBudgets[slug] = 0;
    setCatBudgets({ ...catBudgets });
    setNewCatName('');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const buffer = await file.arrayBuffer();
      const summary = parseExcelFile(buffer, [], []);
      const { expenses, incomes } = movementsToRecords(summary.movements);

      const cats = await supabase.from('categories').select('*').eq('user_id', user.id);
      const catMap = new Map((cats.data || []).map((c: { slug: string; id: string }) => [c.slug, c.id]));

      const txs = [
        ...expenses.map((exp) => ({
          user_id: user.id,
          amount: exp.amount,
          type: 'expense' as const,
          concept: exp.description,
          transaction_date: exp.date,
          source: 'excel_import' as const,
          original_concept: exp.description,
          category_id: catMap.get(exp.category.toLowerCase().replace(/[\s/]+/g, '-')) || null,
        })),
        ...incomes.map((inc) => ({
          user_id: user.id,
          amount: inc.amount,
          type: 'income' as const,
          concept: inc.description,
          transaction_date: inc.date,
          source: 'excel_import' as const,
          original_concept: inc.description,
          category_id: null,
        })),
      ];

      if (txs.length > 0) {
        const { error } = await supabase.from('transactions').insert(txs);
        if (error) {
          console.error('Excel import insert error:', error);
          toast.warning('No se pudo importar el Excel, podras hacerlo despues en Configuracion');
          return;
        }
      }

      setImportResult(
        `Importados: ${summary.newExpenses} gastos, ${summary.newIncomes} ingresos. ${summary.duplicates} duplicados omitidos.`
      );
      toast.success('Excel importado correctamente');
    } catch (err) {
      console.error('Excel import error:', err);
      toast.warning('No se pudo importar el Excel, podras hacerlo despues en Configuracion');
    }
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // 1. Insert categories first (non-blocking — errors won't trap the user)
      try {
        const catsToInsert = DEFAULT_CATEGORIES.filter((c) => enabledCats.has(c.slug)).map(
          (c, i) => ({
            user_id: user.id,
            name: c.name,
            slug: c.slug,
            color: c.color,
            icon: c.icon,
            monthly_budget: catBudgets[c.slug] || 0,
            sort_order: i,
            type: 'expense' as const,
          })
        );

        const incomeCats = [
          { name: 'Nomina', slug: 'nomina', color: '#34d399', icon: 'banknote' },
          { name: 'Cashback', slug: 'cashback', color: '#60a5fa', icon: 'coins' },
          { name: 'Devolucion', slug: 'devolucion', color: '#fbbf24', icon: 'undo-2' },
          { name: 'Otros ingresos', slug: 'otros-ingresos', color: '#94a3b8', icon: 'circle' },
        ].map((c, i) => ({
          user_id: user.id,
          name: c.name,
          slug: c.slug,
          color: c.color,
          icon: c.icon,
          monthly_budget: 0,
          sort_order: catsToInsert.length + i,
          type: 'income' as const,
        }));

        const { error: catError } = await supabase.from('categories').insert([...catsToInsert, ...incomeCats]);
        if (catError) {
          console.error('Error inserting categories:', catError);
          toast.error('No se pudieron crear las categorias, podras añadirlas en Ajustes');
        }
      } catch (catErr) {
        console.error('Categories insert exception:', catErr);
        toast.error('No se pudieron crear las categorias, podras añadirlas en Ajustes');
      }

      // 2. Save profile + mark onboarding complete (always, even if categories failed)
      await updateProfile({
        full_name: fullName,
        monthly_income: parseFloat(monthlyIncome) || 0,
        pay_day: payDay,
        currency,
        ...modules,
        onboarding_completed: true,
      } as Partial<any>);
    } catch (err) {
      console.error('Onboarding finish error:', err);

      // Last resort: force-set onboarding_completed so user isn't trapped
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      } catch (forceErr) {
        console.error('Force onboarding_completed failed:', forceErr);
      }

      toast.error('Hubo un error al guardar. Puedes ajustar todo en Configuracion.');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return fullName.trim() && monthlyIncome && parseFloat(monthlyIncome) > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-accent-purple w-12' : 'bg-th-border w-8'
              }`}
            />
          ))}
        </div>

        <div className="bg-th-card border border-th-border rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: Datos basicos */}
            {step === 1 && (
              <motion.div key="step1" variants={fadeUp} initial="initial" animate="animate" exit={{ opacity: 0, y: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
                    <User size={20} className="text-accent-purple" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-th-text">Datos basicos</h2>
                    <p className="text-xs text-th-muted">Solo necesitamos lo esencial. Podras modificar todo esto en Ajustes en cualquier momento.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="ob-name" className="block text-sm text-th-secondary mb-1">Nombre</label>
                    <input
                      id="ob-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-th-input border border-th-border rounded-xl text-th-text text-sm"
                      placeholder="Tu nombre"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ob-income" className="block text-sm text-th-secondary mb-1">Ingresos mensuales netos</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                      <input
                        id="ob-income"
                        type="number"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="w-full pl-10 pr-12 py-2.5 bg-th-input border border-th-border rounded-xl text-th-text text-sm"
                        placeholder="1.382"
                        min={0}
                        max={999999}
                        step={0.01}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-th-muted text-sm">EUR</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ob-payday" className="block text-sm text-th-secondary mb-1">Dia de cobro</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                      <select
                        id="ob-payday"
                        value={payDay}
                        onChange={(e) => setPayDay(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 bg-th-input border border-th-border rounded-xl text-th-text text-sm appearance-none"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Dia {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Modulos */}
            {step === 2 && (
              <motion.div key="step2" variants={fadeUp} initial="initial" animate="animate" exit={{ opacity: 0, y: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 flex items-center justify-center">
                    <Sparkles size={20} className="text-accent-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-th-text">Modulos</h2>
                    <p className="text-xs text-th-muted">Activa los que te interesen. Podras cambiarlos en Ajustes.</p>
                  </div>
                </div>

                <motion.div className="space-y-2" variants={staggerContainer} initial="initial" animate="animate">
                  {MODULES.map((m) => (
                    <motion.button
                      key={m.key}
                      onClick={() => toggleModule(m.key)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-th-border hover:border-th-border-strong transition-colors text-left"
                      variants={fadeUpSmall}
                    >
                      <div>
                        <p className="text-sm font-medium text-th-text">{m.label}</p>
                        <p className="text-xs text-th-muted">{m.desc}</p>
                      </div>
                      {modules[m.key] ? (
                        <ToggleRight size={28} className="text-accent-purple flex-shrink-0" />
                      ) : (
                        <ToggleLeft size={28} className="text-th-faint flex-shrink-0" />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* STEP 3: Categorias */}
            {step === 3 && (
              <motion.div key="step3" variants={fadeUp} initial="initial" animate="animate" exit={{ opacity: 0, y: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center">
                    <Check size={20} className="text-accent-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-th-text">Categorias</h2>
                    <p className="text-xs text-th-muted">Hemos preparado categorias basicas. Podras personalizarlas en Ajustes.</p>
                  </div>
                </div>

                {!showCustomCategories ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_CATEGORIES.filter(c => enabledCats.has(c.slug)).map((c) => (
                        <span key={c.slug} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-sm text-th-text">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => setStep(4)}
                        className="flex-1 py-2.5 bg-accent-purple text-white font-medium rounded-xl text-sm hover:bg-accent-purple/90 transition-colors"
                        {...buttonTap}
                      >
                        Usar estas categorias
                      </motion.button>
                      <motion.button
                        onClick={() => setShowCustomCategories(true)}
                        className="flex-1 py-2.5 border border-th-border text-th-secondary rounded-xl text-sm hover:bg-th-hover transition-colors"
                        {...buttonTap}
                      >
                        Personalizar
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <div
                        key={c.slug}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          enabledCats.has(c.slug)
                            ? 'border-accent-purple/30 bg-accent-purple/5'
                            : 'border-th-border opacity-50'
                        }`}
                      >
                        <button
                          onClick={() => toggleCat(c.slug)}
                          className="flex-shrink-0"
                          aria-label={`Toggle ${c.name}`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: c.color }}
                          >
                            {c.name.charAt(0)}
                          </div>
                        </button>
                        <span className="text-sm text-th-text flex-1">{c.name}</span>
                        {enabledCats.has(c.slug) && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={catBudgets[c.slug] || ''}
                              onChange={(e) =>
                                setCatBudgets((prev) => ({ ...prev, [c.slug]: Number(e.target.value) }))
                              }
                              className="w-20 px-2 py-1 bg-th-input border border-th-border rounded-lg text-th-text text-xs text-right"
                              placeholder="0"
                              min={0}
                              max={999999}
                              aria-label={`Presupuesto ${c.name}`}
                            />
                            <span className="text-xs text-th-muted">EUR</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add custom */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-th-input border border-th-border rounded-xl text-th-text text-sm"
                        placeholder="Añadir categoria..."
                        maxLength={50}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomCat()}
                      />
                      <button
                        onClick={addCustomCat}
                        className="p-2 bg-accent-purple/15 text-accent-purple rounded-xl hover:bg-accent-purple/25 transition-colors"
                        aria-label="Añadir categoria"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4: Importar o empezar */}
            {step === 4 && (
              <motion.div key="step4" variants={fadeUp} initial="initial" animate="animate" exit={{ opacity: 0, y: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent-amber/15 flex items-center justify-center">
                    <Upload size={20} className="text-accent-amber" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-th-text">Casi listo!</h2>
                    <p className="text-xs text-th-muted">Importa datos o empieza desde cero</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <motion.button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-accent-purple/30 hover:border-accent-purple/60 hover:bg-accent-purple/5 transition-colors text-left"
                    {...buttonTap}
                  >
                    <Upload size={24} className="text-accent-purple flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-th-text">Importar Excel de mi banco</p>
                      <p className="text-xs text-th-muted">BBVA, Unicaja, etc. (archivo .xlsx)</p>
                    </div>
                  </motion.button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />

                  {importResult && (
                    <motion.div
                      className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-xl text-sm text-accent-green"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {importResult}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 text-th-muted text-xs">
                    <div className="flex-1 h-px bg-th-border" />
                    <span>o</span>
                    <div className="flex-1 h-px bg-th-border" />
                  </div>

                  <p className="text-center text-sm text-th-secondary">
                    Puedes empezar desde cero y añadir tus movimientos manualmente.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-th-border">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-sm text-th-muted hover:text-th-text transition-colors"
              >
                <ArrowLeft size={16} />
                Anterior
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <motion.button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-purple text-white font-medium rounded-xl hover:bg-accent-purple/90 transition-colors disabled:opacity-40"
                {...buttonTap}
              >
                Siguiente
                <ArrowRight size={16} />
              </motion.button>
            ) : (
              <motion.button
                onClick={finish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent-green text-white font-medium rounded-xl hover:bg-accent-green/90 transition-colors disabled:opacity-40"
                {...buttonTap}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Empezar
                    <Sparkles size={16} />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
