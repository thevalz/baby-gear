import type { AppState, Criterion, Module, Option } from '../lib/types';
import { useStore } from '../lib/store';
import { bestPrice, bestSource, formatMoney, percent, topPick } from '../lib/scoring';
import { criterionEvidence } from '../lib/evidence';
import { computeCompatibilityFlags } from '../lib/compatibility';
import { assetUrl } from '../lib/assets';
import { PRIORITIES } from '../lib/preferences';
import { clearanceMessage } from '../lib/clearance';
import { criticScore, isFresh } from '../lib/endorsements';

/** The two criteria that contribute most to a pick's weighted score. */
function topReasons(option: Option, criteria: Criterion[]): Criterion[] {
  return [...criteria]
    .map((c) => ({ c, contrib: (c.weight || 0) * (option.scores[c.id] || 0) }))
    .sort((a, b) => b.contrib - a.contrib)
    .slice(0, 2)
    .map((x) => x.c);
}

/** One confident, plain-language "why this" sentence built from the top reasons. */
function whyLine(option: Option, module: Module): string {
  const reasons = topReasons(option, module.criteria);
  const parts = reasons.map((c) => {
    const ev = criterionEvidence(c, option);
    return ev ? `${c.label.toLowerCase()} (${ev})` : c.label.toLowerCase();
  });
  if (parts.length === 0) return 'A strong all-round pick.';
  if (parts.length === 1) return `Stands out for ${parts[0]}.`;
  return `Stands out for ${parts[0]} and ${parts[1]}.`;
}

function HeroCard({
  module,
  pick,
  compatMessage,
  clearance,
  onOpen,
}: {
  module: Module;
  pick: Option;
  compatMessage?: { good: boolean; text: string };
  clearance?: { good: boolean; text: string } | null;
  onOpen: () => void;
}) {
  const creator = useStore((s) => s.config.creator);
  const img = assetUrl(pick.image);
  const price = bestPrice(pick);
  const src = bestSource(pick);
  const pct = Math.round(percent(pick, module.criteria) * 100);
  const reviewUrl = pick.reviewUrl ?? creator?.youtubeUrl;
  const critics = criticScore(pick);
  const topQuote = pick.endorsements?.find((e) => e.quote);
  const notes = [clearance, compatMessage].filter((n): n is { good: boolean; text: string } => n != null);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row">
      <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white sm:w-32">
        {img ? (
          <img src={img} alt={pick.name} className="h-full w-full object-contain p-1" loading="lazy" />
        ) : (
          <span className="text-5xl text-slate-300">🍼</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-indigo-500">
          {module.label}
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
            {pct}% match
          </span>
          {critics && (
            <span
              title={`${critics.recommended} of ${critics.count} creators recommend`}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isFresh(critics) ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isFresh(critics) ? '🍅' : '🥬'} {Math.round(critics.recommendedPct * 100)}% critics · {critics.count}
            </span>
          )}
        </div>
        <button
          onClick={onOpen}
          className="mt-0.5 text-left text-lg font-bold text-slate-900 hover:text-indigo-700"
        >
          {pick.name}
        </button>
        <p className="mt-1 text-sm text-slate-600">{whyLine(pick, module)}</p>

        {topQuote && (
          <blockquote className="mt-2 border-l-2 border-rose-200 pl-2 text-sm italic text-slate-500">
            “{topQuote.quote}”
            <span className="ml-1 not-italic text-xs text-slate-400">— {topQuote.critic}</span>
          </blockquote>
        )}

        {notes.length > 0 && (
          <div className="mt-2 flex flex-col items-start gap-1">
            {notes.map((n, i) => (
              <p
                key={i}
                className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
                  n.good ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {n.good ? '✅' : '⚠️'} {n.text}
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {src ? (
            <a
              href={src.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Best price {formatMoney(price)} at {src.retailer} →
            </a>
          ) : (
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
              {formatMoney(price)}
            </span>
          )}
          {reviewUrl && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ▶ Watch my review
            </a>
          )}
          <button
            onClick={onOpen}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Why this pick?
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The decisive top of the Summary: one confident recommendation per module,
 * personalized to the visitor's quiz answers. Evidence (the cards/gallery below)
 * becomes the proof behind the pick rather than the front door.
 */
export default function RecommendationHero({
  state,
  onOpenDetail,
}: {
  state: AppState;
  onOpenDetail: (moduleId: string, optionId: string) => void;
}) {
  const { modules } = state;
  const prefs = useStore((s) => s.preferences);
  const flags = computeCompatibilityFlags(state);

  const picks = modules
    .map((m) => ({ module: m, pick: topPick(m) }))
    .filter((p): p is { module: Module; pick: Option } => p.pick != null);

  if (picks.length === 0) return null;

  // A short, personalized lead-in built from the visitor's chosen priorities.
  const priorityLabels = (prefs.priorities ?? [])
    .map((k) => PRIORITIES.find((p) => p.key === k)?.label.toLowerCase())
    .filter(Boolean);
  const lead =
    priorityLabels.length > 0
      ? `Based on your budget${prefs.vehicle ? `, your ${prefs.vehicle},` : ''} and a focus on ${priorityLabels.join(', ')}, here's what I'd buy:`
      : "Here's what I'd buy right now:";

  // Map the first flag per module to a compact hero message.
  const compatFor = (moduleId: string) => {
    const f = flags.find((fl) => fl.moduleId === moduleId);
    if (!f) return undefined;
    return { good: f.severity === 'green', text: f.message };
  };

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recommended for you</h2>
          <p className="mt-0.5 text-sm text-slate-600">{lead}</p>
        </div>
      </div>
      <div className="grid gap-3">
        {picks.map(({ module, pick }) => (
          <HeroCard
            key={module.id}
            module={module}
            pick={pick}
            compatMessage={compatFor(module.id)}
            clearance={clearanceMessage(pick, prefs.backSeatLengthIn)}
            onOpen={() => onOpenDetail(module.id, pick.id)}
          />
        ))}
      </div>
    </section>
  );
}
