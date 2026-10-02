/** A 24 x 24 line glyph drawn from its stroke paths; the app and navigation glyph sets share it. */
export function StrokeGlyph({
  paths,
  className,
}: {
  paths: readonly string[];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
