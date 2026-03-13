export default function ProgressBar({ value = 0, color = 'bg-blue-600' }) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{safeValue}%</p>
    </div>
  );
}
