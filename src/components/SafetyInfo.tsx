import { useEffect } from 'react';

/**
 * Plain-language explainer for the "Safety" column: what the stroller safety
 * standards are, what they test, and which signals actually differentiate.
 */
export default function SafetyInfo({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = (name: string, region: string, what: string) => (
    <div className="border-b border-dashed border-slate-100 py-2 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800">{name}</span>
        <span className="shrink-0 text-xs text-slate-400">{region}</span>
      </div>
      <p className="mt-0.5 text-slate-600">{what}</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Understanding stroller safety"
        className="my-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Understanding stroller safety</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-800">Strollers aren't given a graded safety score.</strong> Unlike car
            seats, they're judged <em>pass/fail</em> against a mandatory standard — every stroller legally sold in the
            US already meets it. So the useful, comparable signals are which certifications a model holds, whether it's
            been recalled, its harness, and its brake.
          </p>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">The standards</h4>
            {row(
              'ASTM F833 → 16 CFR 1227',
              'US · mandatory',
              'The US federal stroller standard. Tests tip-over stability, brake hold on an incline, harness/restraint, leg-opening (no slipping through when reclined), fold-locks (won’t collapse), structure, and choke/sharp-edge hazards. Every US stroller must pass — so it doesn’t differentiate.',
            )}
            {row('EN 1888', 'Europe', 'The European equivalent — brakes, stability, harness, locking, chemical + mechanical safety. Also pass/fail.')}
            {row(
              'AS/NZS 2088',
              'Australia / NZ · stricter',
              'Requires a tether/wrist strap and tougher brake performance. A brand that certifies to it exceeds the US floor on runaway protection — a genuine plus.',
            )}
            {row(
              'JPMA Certified (Baby Safety Alliance)',
              'US · voluntary',
              'The maker sent samples to an independent lab that verified compliance to ASTM. This is the real differentiator: third-party verified vs the maker self-certifying. Not every brand participates.',
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">What matters most</h4>
            <ol className="ml-4 list-decimal space-y-1">
              <li><strong className="text-slate-700">Recall history</strong> — the most concrete signal; a recalled model had a real defect.</li>
              <li><strong className="text-slate-700">JPMA / independent certification</strong> — verified vs self-certified.</li>
              <li><strong className="text-slate-700">Stricter certs (AS/NZS 2088)</strong> — better brakes + a tether.</li>
              <li><strong className="text-slate-700">Harness</strong> (5-point vs 3-point) and <strong className="text-slate-700">brake</strong> (hold, auto-lock, flip-flop-friendly, tether).</li>
            </ol>
          </div>

          <p className="text-xs text-slate-400">
            The <strong>Safety</strong> column summarizes these facts per stroller (recall status, certifications,
            harness). Open any stroller for the full detail and sources. Nothing here is an invented score.
          </p>
        </div>
      </div>
    </div>
  );
}
