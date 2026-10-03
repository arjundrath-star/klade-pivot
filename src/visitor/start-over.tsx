import { restartDemo } from "@/app/student/actions";
import { Button } from "@/components/ui/button";

/**
 * "Start the demo over", for a visitor's copy of the demo (milestone 20): the one form the public
 * link adds to the student's screens. A plain form posting a server action: on the student's home
 * it ships no script, and on the end screen it rides in the runner's completion chunk as the
 * action's reference. Rendered only when the page knows the student's family is a visitor's; the
 * action checks again.
 */
export function StartOver({ className = "" }: { className?: string }) {
  return (
    <form action={restartDemo} className={className}>
      <Button type="submit" variant="secondary">
        Start the demo over
      </Button>
    </form>
  );
}
