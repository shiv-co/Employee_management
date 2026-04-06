import { memo } from 'react';

function StatCard({ label, value, hint, tone = 'slate', icon: Icon }) {
  const tones = {
    slate: 'from-slate-700 to-slate-900',
    blue: 'from-blue-600 to-indigo-700',
    emerald: 'from-emerald-600 to-teal-700',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600'
  };

  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p
            className={`mt-2 inline-block rounded-lg bg-gradient-to-r px-3 py-1 text-2xl font-semibold text-white ${
              tones[tone] || tones.slate
            }`}
          >
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="inline-flex rounded-xl bg-slate-100 p-2 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

StatCard.displayName = 'StatCard';

export default memo(StatCard);
