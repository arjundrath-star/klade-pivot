import { Diagram } from "./diagrams";
import { Equation } from "./equation";
import { WorkedExample } from "./worked-example";
import { PlayGlyph } from "@/components/ui/glyphs";
import type { Chapter, ChapterVideo } from "@/content/types";

// The chapter as a reading view, rendered once on the server: the runner shows it as the learn
// block and again beside guided practice. The content is data; only the worked examples' stepped
// reveal and the gate at the end run in the browser.

/** The table of contents: one link per section. */
export function ChapterContents({ chapter }: { chapter: Chapter }) {
  return (
    <nav aria-label="Chapter contents" className="text-sm">
      <ol className="flex flex-wrap gap-x-4 gap-y-1.5 xl:flex-col xl:gap-y-2">
        {chapter.sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="focus-ring rounded-sm text-ink-soft hover:text-ink hover:underline"
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A link to a video, as a card drawn here: no player, no script from anywhere else. */
function VideoCard({ video }: { video: ChapterVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring group flex items-center gap-4 rounded-md border border-line p-3 transition-colors hover:border-line-strong hover:bg-well"
    >
      <span
        aria-hidden="true"
        className="grid aspect-video w-24 shrink-0 place-items-center rounded-sm bg-night text-white"
      >
        <PlayGlyph className="size-7" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-ink group-hover:underline">{video.title}</span>
        <span className="text-sm text-ink-soft">{video.source} video, opens on YouTube</span>
      </span>
    </a>
  );
}

function Points({ points }: { points: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-course-deep">
      {points.map((point) => (
        <li key={point} className="pl-1 leading-relaxed">
          {point}
        </li>
      ))}
    </ul>
  );
}

/** Every section in order: heading, prose, then its figure, example, mistakes, points and video. */
export function ChapterSections({ chapter }: { chapter: Chapter }) {
  return (
    <div className="flex flex-col gap-10">
      {chapter.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          className="flex scroll-mt-4 flex-col gap-4"
        >
          <h3
            id={`${section.id}-heading`}
            className="font-display text-lg font-semibold tracking-tight"
          >
            {section.heading}
          </h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.diagram && <Diagram diagram={section.diagram} />}
          {section.example && <WorkedExample example={section.example} />}
          {section.mistakes && (
            <ol className="flex flex-col gap-4">
              {section.mistakes.map((mistake) => (
                <li
                  key={mistake.wrong}
                  className="flex flex-col gap-1 border-l-[3px] border-alert/50 pl-4"
                >
                  <p>
                    <span className="font-semibold text-alert">Wrong: </span>
                    <Equation size="inline">{mistake.wrong}</Equation>
                  </p>
                  <p>
                    <span className="font-semibold text-success">Fix: </span>
                    {mistake.fix}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {section.points && <Points points={section.points} />}
          {section.video && <VideoCard video={section.video} />}
        </section>
      ))}
    </div>
  );
}

/** The key learnings on their own, for the panel beside guided practice. */
export function KeyLearnings({ chapter }: { chapter: Chapter }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">Key learnings</h2>
      <Points points={chapter.keyLearnings} />
    </div>
  );
}
