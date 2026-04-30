"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_KEYS,
  TABS,
  categoriesByTab,
  type CategoryKey,
  type TabId,
} from "../categories";
import StarRating from "./StarRating";
import { submitReview, type RateFormState } from "./actions";

export type ExistingReview = {
  category_scores: Record<string, number>;
  narratives: Record<string, string>;
  would_recommend: boolean | null;
  is_public: boolean;
};

type Props = {
  provider: {
    id: string;
    name: string;
    slug: string;
    abbr: string;
    brand_color: string;
  };
  period: string;
  existingReview: ExistingReview | null;
};

const INITIAL: RateFormState = { ok: false };

type Scores = Partial<Record<CategoryKey, number>>;
type Narratives = Partial<Record<CategoryKey, string>>;
type Recommend = "yes" | "no" | null;

function draftKey(providerId: string, period: string) {
  return `towgrade:draft:rate:${providerId}:${period}`;
}

// Initial state from an existing review prop. Runs on both server and client
// — deterministic from props, no localStorage access here.
function initialFromExisting(existing: ExistingReview | null) {
  if (!existing) {
    return {
      scores: {} as Scores,
      narratives: {} as Narratives,
      summary: "",
      recommend: null as Recommend,
      isPublic: true,
      openNarratives: new Set<CategoryKey>(),
    };
  }
  const ns = (existing.narratives ?? {}) as Record<string, string>;
  const { summary: existingSummary = "", ...rest } = ns;
  const opened = new Set<CategoryKey>();
  for (const k of CATEGORY_KEYS) {
    if (typeof rest[k] === "string" && rest[k]) opened.add(k);
  }
  return {
    scores: (existing.category_scores ?? {}) as Scores,
    narratives: rest as Narratives,
    summary: existingSummary,
    recommend:
      existing.would_recommend === null
        ? (null as Recommend)
        : existing.would_recommend
          ? ("yes" as Recommend)
          : ("no" as Recommend),
    isPublic: existing.is_public,
    openNarratives: opened,
  };
}

export default function RateForm({ provider, period, existingReview }: Props) {
  const key = draftKey(provider.id, period);
  const initial = initialFromExisting(existingReview);

  const [scores, setScores] = useState<Scores>(initial.scores);
  const [narratives, setNarratives] = useState<Narratives>(initial.narratives);
  const [summary, setSummary] = useState(initial.summary);
  const [recommend, setRecommend] = useState<Recommend>(initial.recommend);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [openNarratives, setOpenNarratives] = useState<Set<CategoryKey>>(
    initial.openNarratives
  );
  const [activeTab, setActiveTab] = useState<TabId>("compensation");

  // Ref (not state) so it doesn't trigger a render when flipped, and so the
  // persist effect's `hydratedRef.current` check doesn't violate the
  // set-state-in-effect lint rule.
  const hydratedRef = useRef(false);

  const [state, formAction, pending] = useActionState(submitReview, INITIAL);

  // Post-mount localStorage hydration. Server-render uses prop-derived state
  // above; this effect runs only on the client and may override when there's
  // an in-progress draft for this (provider, period). Existing review wins
  // and clears any stale draft.
  useEffect(() => {
    if (existingReview) {
      try {
        localStorage.removeItem(key);
      } catch {}
      hydratedRef.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === "object") {
          /* eslint-disable react-hooks/set-state-in-effect --
             localStorage is client-only; hydrating draft state must run
             post-mount in an effect. setState here is intentional. */
          setScores((d.scores ?? {}) as Scores);
          setNarratives((d.narratives ?? {}) as Narratives);
          setSummary(typeof d.summary === "string" ? d.summary : "");
          setRecommend(
            d.recommend === "yes" || d.recommend === "no" ? d.recommend : null
          );
          setIsPublic(typeof d.isPublic === "boolean" ? d.isPublic : true);
          const opened = new Set<CategoryKey>();
          for (const k of CATEGORY_KEYS) {
            const v = (d.narratives ?? {})[k];
            if (typeof v === "string" && v) opened.add(k);
          }
          setOpenNarratives(opened);
          /* eslint-enable react-hooks/set-state-in-effect */
        }
      }
    } catch {}
    hydratedRef.current = true;
  }, [key, existingReview]);

  // Persist draft on change. Skipped when an existing review is loaded —
  // that flow is an in-place edit; resubmit is the save mechanism.
  useEffect(() => {
    if (!hydratedRef.current || existingReview) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ scores, narratives, summary, recommend, isPublic })
      );
    } catch {}
  }, [existingReview, key, scores, narratives, summary, recommend, isPublic]);

  // Clear draft on successful submit (server redirected, but the client may
  // briefly mount before navigation; useActionState surfaces { ok: true }).
  useEffect(() => {
    if (state.ok) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }, [state.ok, key]);

  const allScored = CATEGORY_KEYS.every(
    (k) => typeof scores[k] === "number"
  );
  const filledCount = CATEGORY_KEYS.filter(
    (k) => typeof scores[k] === "number"
  ).length;

  const overallDisplay = useMemo(() => {
    if (filledCount === 0) return "—";
    const sum = CATEGORY_KEYS.reduce(
      (s, k) => s + (typeof scores[k] === "number" ? (scores[k] as number) : 0),
      0
    );
    return (sum / filledCount).toFixed(1);
  }, [scores, filledCount]);

  const canSubmit = allScored && recommend !== null && !pending;

  function setScore(k: CategoryKey, n: number) {
    setScores((prev) => ({ ...prev, [k]: n }));
  }
  function setNarrative(k: CategoryKey, v: string) {
    setNarratives((prev) => ({ ...prev, [k]: v }));
  }
  function toggleNarrative(k: CategoryKey) {
    setOpenNarratives((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const fe = "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const formErr = "error" in state ? state.error : undefined;

  return (
    <>
      <header className="rate-head">
        <div className="rate-head__crumbs">
          <Link href="/dashboard/rate">← All providers</Link>
        </div>
        <div className="rate-head__main">
          <div
            className="rate-head__avatar"
            style={{ background: provider.brand_color }}
            aria-hidden
          >
            {provider.abbr}
          </div>
          <div className="rate-head__title">
            <span className="eyebrow">
              {existingReview ? "Edit your review" : "New review"} · {period}
            </span>
            <h1 className="page-title">{provider.name}</h1>
          </div>
          <div
            className="rate-head__overall"
            aria-label="Overall score"
            data-complete={allScored ? "true" : "false"}
          >
            <div className="rate-head__overall-label">Overall</div>
            <div className="rate-head__overall-value">{overallDisplay}</div>
            <div className="rate-head__overall-progress">
              {filledCount} / {CATEGORY_KEYS.length} scored
            </div>
          </div>
        </div>
      </header>

      <form action={formAction} className="rate-form">
        <input type="hidden" name="provider_id" value={provider.id} />
        <input
          type="hidden"
          name="category_scores"
          value={JSON.stringify(scores)}
        />
        <input
          type="hidden"
          name="narratives"
          value={JSON.stringify({ ...narratives, summary })}
        />
        <input
          type="hidden"
          name="would_recommend"
          value={recommend ?? ""}
        />
        <input
          type="hidden"
          name="is_public"
          value={isPublic ? "true" : "false"}
        />

        <div className="rate-card-wrap">
          <nav className="rtabs" role="tablist" aria-label="Review sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`rtab${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {TABS.filter((t) => t.id !== "final").map((t) => (
            <div
              key={t.id}
              role="tabpanel"
              hidden={activeTab !== t.id}
              className="rtp"
            >
              <div className="rgrid">
                {categoriesByTab(t.id).map((c) => {
                  const v = scores[c.key];
                  const open = openNarratives.has(c.key);
                  const note = narratives[c.key] ?? "";
                  const err = fe[c.key];
                  return (
                    <div key={c.key} className="rcat">
                      <div className="rl">
                        <span>{c.label}</span>
                        <span className="rscore">
                          {typeof v === "number" ? v : "—"}
                        </span>
                      </div>
                      <StarRating
                        value={v}
                        onChange={(n) => setScore(c.key, n)}
                        ariaLabel={c.label}
                      />
                      {err && <div className="fi-err">{err}</div>}
                      {open ? (
                        <textarea
                          className="na"
                          placeholder={c.placeholder}
                          value={note}
                          onChange={(e) => setNarrative(c.key, e.target.value)}
                          aria-label={`${c.label} — private notes`}
                        />
                      ) : (
                        <button
                          type="button"
                          className="rate-narr-toggle"
                          onClick={() => toggleNarrative(c.key)}
                        >
                          + Add note (private)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div role="tabpanel" hidden={activeTab !== "final"} className="rtp">
            <div className="rate-final">
              <div className="rate-recommend">
                <div className="rate-recommend__label">
                  Would you recommend {provider.name} to a peer towing operator?
                </div>
                <div
                  className="rate-recommend__choices"
                  role="radiogroup"
                  aria-label="Would recommend"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={recommend === "yes"}
                    className={`rate-recommend__btn${recommend === "yes" ? " is-yes" : ""}`}
                    onClick={() => setRecommend("yes")}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={recommend === "no"}
                    className={`rate-recommend__btn${recommend === "no" ? " is-no" : ""}`}
                    onClick={() => setRecommend("no")}
                  >
                    No
                  </button>
                </div>
                {fe.would_recommend && (
                  <div className="fi-err">{fe.would_recommend}</div>
                )}
              </div>

              <div className="rate-summary">
                <label htmlFor="rate-summary-input">
                  Narrative summary{" "}
                  <span className="rate-summary__optional">
                    optional · always private
                  </span>
                </label>
                <textarea
                  id="rate-summary-input"
                  className="na"
                  placeholder="Anything else worth recording about working with this provider this quarter?"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              <div className="priv-row">
                <label className="tw">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    aria-label="Include this review in TowGrade's public aggregate scores"
                  />
                  <span className="tbg" />
                </label>
                <div>
                  <div className="pt3">
                    Include this review in TowGrade&apos;s public aggregate
                    scores
                  </div>
                  <div className="ps2">
                    Numeric scores only. Narrative comments stay private to
                    you, regardless of this setting.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {formErr && <div className="form-err">{formErr}</div>}

        <div className="rate-submit-row">
          <div className="rate-submit-row__status">
            {!allScored
              ? `${CATEGORY_KEYS.length - filledCount} ${
                  CATEGORY_KEYS.length - filledCount === 1 ? "category" : "categories"
                } left to score`
              : recommend === null
                ? "Pick a recommendation to finish"
                : "Ready to submit"}
          </div>
          <button
            type="submit"
            className="bf p"
            disabled={!canSubmit}
          >
            {pending
              ? "Submitting…"
              : existingReview
                ? "Update review"
                : "Submit review"}
          </button>
        </div>
      </form>
    </>
  );
}
