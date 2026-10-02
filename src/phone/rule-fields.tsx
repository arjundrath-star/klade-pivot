/**
 * The phone rule's fields, shared by /parent/settings and onboarding. Plain uncontrolled inputs
 * with no client code: the server reads them from the form, and the server checks them.
 */
import { AppGlyph, CATEGORY_GLYPHS } from "./apps";
import { Choice, Field, inputClass, Legend } from "@/components/ui/field";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/engine/pace";
import { LOCK_CATEGORIES, LOCK_CATEGORY_LABELS, type LockRuleFields } from "@/session/lock";

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
        <Legend id={`${id}-days-hint`} hint="Session days come from the plan. Pick at least one.">
          Lock on
        </Legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <Choice key={day} className="items-center py-2">
              <input
                type="checkbox"
                name="days"
                value={day}
                defaultChecked={defaults.days.includes(day)}
              />
              {WEEKDAY_LABELS[day]}
            </Choice>
          ))}
        </div>
      </fieldset>

      <Field
        id={`${id}-time`}
        label="From"
        hint={`Until ${name}'s session for the day is done. Finish before this and nothing locks.`}
      >
        <input
          id={`${id}-time`}
          name="startTime"
          type="time"
          step={300}
          className={`${inputClass} w-40`}
          defaultValue={defaults.startTime}
          aria-describedby={`${id}-time-hint`}
          required
        />
      </Field>

      <fieldset aria-describedby={`${id}-apps-hint`}>
        <Legend id={`${id}-apps-hint`} hint="Calls, messages, maps and school apps never lock.">
          Lock these apps
        </Legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {LOCK_CATEGORIES.map((category) => (
            <Choice key={category} className="items-center">
              <input
                type="checkbox"
                name="categories"
                value={category}
                defaultChecked={defaults.categories.includes(category)}
              />
              <AppGlyph name={CATEGORY_GLYPHS[category]} className="size-5 text-ink-soft" />
              {LOCK_CATEGORY_LABELS[category]}
            </Choice>
          ))}
        </div>
      </fieldset>

      <Choice className="items-center">
        <input type="checkbox" name="weekendOff" defaultChecked={defaults.weekendOff} />
        Weekends off: never lock on Saturday or Sunday
      </Choice>
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
