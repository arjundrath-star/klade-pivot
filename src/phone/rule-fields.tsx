/**
 * The phone rule's fields, shared by /parent/settings and onboarding. Plain uncontrolled inputs
 * with no client code: the server reads them from the form, and the server checks them.
 */
import { AppGlyph, CATEGORY_GLYPHS } from "./apps";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/engine/pace";
import { LOCK_CATEGORIES, LOCK_CATEGORY_LABELS, type LockRuleFields } from "@/session/lock";

const MUTED = "text-zinc-600 dark:text-zinc-400";
const LEGEND = "mb-2 font-medium";
const CHOICE =
  "flex items-center gap-3 rounded-md border border-zinc-200 p-3 has-checked:border-zinc-900 dark:border-zinc-800 dark:has-checked:border-zinc-100";
const FIELD = "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

interface RuleFieldsProps {
  /** Prefix for the fields' ids, unique on the page. */
  id: string;
  defaults: LockRuleFields;
  /** Whose session unlocks the phone, for the labels. */
  name: string;
}

export function RuleFields({ id, defaults, name }: RuleFieldsProps) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset aria-describedby={`${id}-days-hint`}>
        <legend className={LEGEND}>Lock on</legend>
        <p id={`${id}-days-hint`} className={`mb-3 text-sm ${MUTED}`}>
          Session days come from the plan. Pick at least one.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <label key={day} className={`${CHOICE} py-2`}>
              <input
                type="checkbox"
                name="days"
                value={day}
                defaultChecked={defaults.days.includes(day)}
              />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-time`} className="font-medium">
          From
        </label>
        <input
          id={`${id}-time`}
          name="startTime"
          type="time"
          step={300}
          className={`${FIELD} w-40`}
          defaultValue={defaults.startTime}
          aria-describedby={`${id}-time-hint`}
          required
        />
        <p id={`${id}-time-hint`} className={`text-sm ${MUTED}`}>
          Until {name}&apos;s session for the day is done. Finish before this and nothing locks.
        </p>
      </div>

      <fieldset aria-describedby={`${id}-apps-hint`}>
        <legend className={LEGEND}>Lock these apps</legend>
        <p id={`${id}-apps-hint`} className={`mb-3 text-sm ${MUTED}`}>
          Calls, messages, maps and school apps never lock.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LOCK_CATEGORIES.map((category) => (
            <label key={category} className={CHOICE}>
              <input
                type="checkbox"
                name="categories"
                value={category}
                defaultChecked={defaults.categories.includes(category)}
              />
              <AppGlyph name={CATEGORY_GLYPHS[category]} className="size-5" />
              {LOCK_CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={CHOICE}>
        <input type="checkbox" name="weekendOff" defaultChecked={defaults.weekendOff} />
        Weekends off: never lock on Saturday or Sunday
      </label>
    </div>
  );
}

/**
 * The rule as the form sent it, ready for `LockRuleInput`: days and categories kept only when they
 * are real ones, in week and list order.
 */
export function ruleFromForm(form: FormData): LockRuleFields {
  const days = form.getAll("days");
  const categories = form.getAll("categories");
  const startTime = form.get("startTime");
  return {
    days: WEEKDAYS.filter((day) => days.includes(day)),
    startTime: typeof startTime === "string" ? startTime : "",
    categories: LOCK_CATEGORIES.filter((category) => categories.includes(category)),
    weekendOff: form.get("weekendOff") === "on",
  };
}
