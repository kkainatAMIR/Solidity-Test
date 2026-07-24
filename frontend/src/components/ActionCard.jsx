function ActionCard({ title, badge, accent, children }) {
  const accentClasses = {
    cyan: 'border-cyan-500/20',
    fuchsia: 'border-fuchsia-500/20',
    emerald: 'border-emerald-500/20'
  };

  return (
    <section className={`rounded-3xl border bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30 backdrop-blur ${accentClasses[accent] || 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {badge && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-200">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

export default ActionCard;
