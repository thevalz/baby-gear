import type { AppState, Module, Option } from './types';

/**
 * Repo-as-source-of-truth sync.
 *
 * The deployed app reads its initial data from the committed `seed.json`, then
 * persists the user's working copy to localStorage. That means a returning
 * visitor's stale localStorage would normally *shadow* any newly-sourced prices
 * a Claude session commits. To avoid that, `seed.json` carries a `dataVersion`
 * integer. A sourcing session bumps it after updating prices/images; when the
 * deployed app sees the repo `dataVersion` is newer than the persisted one, it
 * folds the repo's **pricing fields** (image, price, priceSources) back into the
 * user's working copy — without clobbering their scores, weights, or budgets.
 *
 * `force` performs the same merge regardless of version (the "Refresh prices
 * from repo" button).
 */
function refreshOption(userOpt: Option, seedOpt: Option): Option {
  // Only copy a field the seed actually defines, so an unsourced seed entry
  // never wipes a value the user typed in. Sourced facts in `attributes`
  // (verified weight, rear-facing length, fit flags, …) are merged like prices
  // so a newer repo data version reaches returning visitors; user-only keys are
  // preserved because seed values are layered on top of the user's.
  return {
    ...userOpt,
    ...(seedOpt.price !== undefined ? { price: seedOpt.price } : {}),
    ...(seedOpt.image !== undefined ? { image: seedOpt.image } : {}),
    ...(seedOpt.priceSources !== undefined ? { priceSources: seedOpt.priceSources } : {}),
    ...(seedOpt.attributes !== undefined
      ? { attributes: { ...userOpt.attributes, ...seedOpt.attributes } }
      : {}),
  };
}

function refreshModule(userMod: Module, seedMod: Module): Module {
  const seedById = new Map(seedMod.options.map((o) => [o.id, o]));
  const userIds = new Set(userMod.options.map((o) => o.id));
  const options = userMod.options.map((o) => {
    const s = seedById.get(o.id);
    return s ? refreshOption(o, s) : o;
  });
  // Surface products the sourcing session added that the user doesn't have yet.
  const added = seedMod.options.filter((o) => !userIds.has(o.id));
  return { ...userMod, options: [...options, ...added] };
}

/**
 * Fold repo pricing into the persisted state. Returns the persisted state
 * unchanged when the repo isn't newer (and `force` is false).
 */
export function mergePricingFromSeed(
  persisted: AppState,
  seed: AppState,
  force = false,
): AppState {
  const seedVersion = seed.dataVersion ?? 0;
  const userVersion = persisted.dataVersion ?? 0;
  if (!force && seedVersion <= userVersion) return persisted;

  const seedModById = new Map(seed.modules.map((m) => [m.id, m]));
  const userIds = new Set(persisted.modules.map((m) => m.id));
  const modules = persisted.modules.map((m) => {
    const s = seedModById.get(m.id);
    return s ? refreshModule(m, s) : m;
  });
  const addedModules = seed.modules.filter((m) => !userIds.has(m.id));

  return {
    ...persisted,
    modules: [...modules, ...addedModules],
    dataVersion: Math.max(seedVersion, userVersion),
  };
}
