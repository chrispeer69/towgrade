export type TabId =
  | "compensation"
  | "operations"
  | "support"
  | "technology"
  | "final";

export type CategoryKey =
  | "pay_rate_adequacy"
  | "payment_speed"
  | "collections_process"
  | "invoice_accuracy"
  | "damage_claim_handling"
  | "dispatch_accuracy"
  | "contract_rate_fairness"
  | "gps_eta_accuracy"
  | "responsiveness"
  | "communication_quality"
  | "account_manager_quality"
  | "dispute_resolution"
  | "app_portal_reliability"
  | "billing_portal_usability";

export type Category = {
  key: CategoryKey;
  label: string;
  placeholder: string;
  tab: TabId;
};

export const TABS: { id: TabId; label: string }[] = [
  { id: "compensation", label: "Compensation" },
  { id: "operations", label: "Operations" },
  { id: "support", label: "Support" },
  { id: "technology", label: "Technology" },
  { id: "final", label: "Final Assessment" },
];

export const CATEGORIES: Category[] = [
  { key: "pay_rate_adequacy",      tab: "compensation", label: "Pay rate adequacy",          placeholder: "Notes on pay rates — stays private…" },
  { key: "payment_speed",          tab: "compensation", label: "Payment speed / time to pay", placeholder: "Average days to payment? Specific issues?" },
  { key: "collections_process",    tab: "compensation", label: "Collections process",        placeholder: "Ease of recovering outstanding amounts…" },
  { key: "invoice_accuracy",       tab: "compensation", label: "Invoice accuracy",           placeholder: "Correct amounts, proper itemization…" },
  { key: "damage_claim_handling",  tab: "operations",   label: "Damage claim handling",      placeholder: "Fairness and speed of damage investigations…" },
  { key: "dispatch_accuracy",      tab: "operations",   label: "Dispatch accuracy",          placeholder: "Jobs dispatched with correct, complete details?" },
  { key: "contract_rate_fairness", tab: "operations",   label: "Contract and rate fairness", placeholder: "Fair terms? Surprise fees? Unilateral changes?" },
  { key: "gps_eta_accuracy",       tab: "operations",   label: "GPS / ETA accuracy",         placeholder: "Reliability of location tracking and ETAs…" },
  { key: "responsiveness",         tab: "support",      label: "Responsiveness to problems", placeholder: "How quickly and effectively does the provider resolve issues?" },
  { key: "communication_quality",  tab: "support",      label: "Communication quality",      placeholder: "Clarity, professionalism, reliability of communications…" },
  { key: "account_manager_quality",tab: "support",      label: "Account manager quality",    placeholder: "Is your rep accessible, knowledgeable, an advocate?" },
  { key: "dispute_resolution",     tab: "support",      label: "Dispute resolution",         placeholder: "Fairness and speed of formal dispute resolution…" },
  { key: "app_portal_reliability", tab: "technology",   label: "App / portal reliability",   placeholder: "Crashes, bugs, outages, login issues…" },
  { key: "billing_portal_usability",tab: "technology",  label: "Billing portal usability",   placeholder: "How easy is invoice tracking and submission?" },
];

export const CATEGORY_KEYS: readonly CategoryKey[] = CATEGORIES.map((c) => c.key);

export function categoriesByTab(tab: TabId): Category[] {
  return CATEGORIES.filter((c) => c.tab === tab);
}
