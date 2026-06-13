import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { groupSections, type LevelSection } from "@/lib/levels";

/**
 * Renders a sadhana level's content: Standards (the rules / do's), the
 * Recommended groups (Songs / Practices / Books), and the Application &
 * Certificate links. Shared by the public, admin and devotee level views.
 */
export function LevelSections({ sections }: { sections: LevelSection[] }) {
  const { standards, recommended, linkSections, other } = groupSections(sections);

  return (
    <div className="space-y-6">
      {/* Standards — the rules / do's for this level */}
      {standards && standards.items.length > 0 ? (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
              <Icon.star className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-saffron-950">Standards</h2>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-saffron-950 marker:font-semibold marker:text-saffron-600">
            {standards.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </Card>
      ) : null}

      {/* Recommended groups */}
      {recommended.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
              <Icon.heart className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-saffron-950">Recommended</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommended.map((section) => (
              <Card key={section.title}>
                <h3 className="text-sm font-semibold text-saffron-800">
                  {section.title.replace(/^Recommended\s*-\s*/, "")}
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-saffron-950">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <Icon.lotus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-saffron-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* Application form + certificate links */}
      {linkSections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {linkSections.map((section) => (
            <Card key={section.title}>
              <h3 className="text-sm font-semibold text-saffron-800">{section.title}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {section.items.map((item, i) => (
                  <li key={i}>
                    <LinkifiedItem text={item} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Any other sections, generic */}
      {other.map((section) => (
        <Card key={section.title}>
          <h3 className="text-sm font-semibold text-saffron-800">{section.title}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-saffron-950">
            {section.items.map((item, i) => (
              <li key={i}>
                <LinkifiedItem text={item} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** Renders "Label: https://…" items as an external link; plain text otherwise. */
export function LinkifiedItem({ text }: { text: string }) {
  const match = text.match(/^(.*?):\s*(https?:\/\/\S+)\s*$/);
  if (!match) return <span className="text-saffron-950">{text}</span>;
  const [, label, url] = match;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-saffron-700 underline hover:text-saffron-800"
    >
      {label || url}
      <Icon.chevron aria-hidden className="h-3.5 w-3.5 -rotate-45" />
    </a>
  );
}
