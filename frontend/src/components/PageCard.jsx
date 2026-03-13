export default function PageCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur">
      {title ? <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  );
}
