import { useState } from 'react';
import { useStore } from '../lib/store';
import { PRIORITIES } from '../lib/preferences';
import type { Preferences } from '../lib/types';

/**
 * First-run, creator-branded quiz that turns a cold visitor into a confident
 * buyer. It collects budget + priorities + a little personal context and hands
 * them to `completeOnboarding`, which derives the trade-study weights. This is
 * the on-ramp that makes the analytics-heavy dashboard approachable — and the
 * shareable hook a creator drops under their video.
 */
export default function Onboarding({ onClose }: { onClose: () => void }) {
  const creator = useStore((s) => s.config.creator);
  const overallBudget = useStore((s) => s.config.overallBudget);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState<number>(overallBudget || 1000);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState('');
  const [backSeatLengthIn, setBackSeatLengthIn] = useState<string>('');
  const [ownedStroller, setOwnedStroller] = useState('');

  const STEPS = ['welcome', 'budget', 'priorities', 'context'] as const;
  const last = STEPS.length - 1;

  const togglePriority = (key: string) =>
    setPriorities((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev; // cap at top 3
      return [...prev, key];
    });

  const finish = (prefs?: Partial<Preferences>) => {
    completeOnboarding({
      completed: true,
      priorities,
      budget,
      vehicle: vehicle.trim() || undefined,
      backSeatLengthIn: Number(backSeatLengthIn) > 0 ? Number(backSeatLengthIn) : undefined,
      ownedStroller: ownedStroller.trim() || undefined,
      ...prefs,
    });
    onClose();
  };

  const skip = () => {
    // Mark completed without personalizing, so the quiz doesn't nag on reload.
    completeOnboarding({ completed: true, priorities: [] });
    onClose();
  };

  const primaryBtn =
    'rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40';
  const ghostBtn = 'rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Creator-branded header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <span aria-hidden>▶</span>
            {creator?.name ?? 'Baby Gear Advisor'}
          </div>
          {step === 0 && creator?.tagline && (
            <p className="mt-1 text-sm text-indigo-100">{creator.tagline}</p>
          )}
        </div>

        <div className="px-6 py-6">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Find your perfect baby gear in 60 seconds</h2>
              <p className="text-slate-600">
                Answer a few quick questions and I'll match you to the gear I'd recommend —
                ranked for <em>your</em> budget, car, and what matters most to you. Every pick is
                tested and sourced, with the best price I can find.
              </p>
              <div className="flex items-center justify-between pt-2">
                <button className={ghostBtn} onClick={skip}>
                  Skip, just browse
                </button>
                <button className={primaryBtn} onClick={() => setStep(1)}>
                  Let's go →
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Budget */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">What's your total budget?</h2>
              <p className="text-sm text-slate-600">For everything together — seat, stroller, and extras.</p>
              <div className="flex items-center gap-2">
                <span className="text-lg text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-lg tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[750, 1000, 1500, 2000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      budget === b
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    ${b.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Priorities */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">What matters most to you?</h2>
              <p className="text-sm text-slate-600">
                Tap up to 3, in order — your first pick counts the most.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRIORITIES.map((p) => {
                  const rank = priorities.indexOf(p.key);
                  const chosen = rank >= 0;
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePriority(p.key)}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center text-sm transition ${
                        chosen
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {chosen && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                          {rank + 1}
                        </span>
                      )}
                      <span className="text-2xl" aria-hidden>
                        {p.icon}
                      </span>
                      <span className="font-medium leading-tight">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3 — Personal context */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">A couple of details (optional)</h2>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">🚗 What car do you drive?</span>
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. Toyota Tacoma"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <span className="text-xs text-slate-400">
                  Tight back seats need a shorter rear-facing seat — I'll weight fit for your car.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">📏 Back-seat length available (inches)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={backSeatLengthIn}
                    onChange={(e) => setBackSeatLengthIn(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="text-sm text-slate-400">in</span>
                </div>
                <span className="block text-xs text-slate-400">
                  Slide your front seat to where you'll actually drive, then measure from the
                  back of that seat to the rear seat cushion. I'll check each seat's rear-facing
                  footprint against it (leaving a little recline room). It's a guide, not a
                  guarantee — final fit depends on your install.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">🍼 Do you already own a stroller?</span>
                <input
                  value={ownedStroller}
                  onChange={(e) => setOwnedStroller(e.target.value)}
                  placeholder="e.g. BOB Wayfinder (or leave blank)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <span className="text-xs text-slate-400">
                  I'll flag any car seat that won't click into it before you buy.
                </span>
              </label>
            </div>
          )}

          {/* Footer nav (steps 1+) */}
          {step > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <button className={ghostBtn} onClick={() => setStep((s) => s - 1)}>
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {STEPS.slice(1).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-6 rounded-full ${i + 1 <= step ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
                {step < last ? (
                  <button
                    className={primaryBtn}
                    onClick={() => setStep((s) => s + 1)}
                    disabled={step === 2 && priorities.length === 0}
                  >
                    Next →
                  </button>
                ) : (
                  <button className={primaryBtn} onClick={() => finish()}>
                    See my picks ✨
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
