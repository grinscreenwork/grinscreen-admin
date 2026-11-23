import Link from "next/link";
import { listCaseStudies } from "@/lib/queries";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { deleteCaseStudy, setCaseStudyFlag } from "@/app/actions/case-studies";

export const metadata = { title: "Case studies" };

export default async function CaseStudiesPage() {
  const studies = await listCaseStudies();

  return (
    <>
      <PageHeader
        title="Case studies"
        description="Full write-ups with the numbers. Every published one appears on the case studies page; featured ones also appear on the portfolio."
        action={<LinkButton href="/case-studies/new" variant="primary">+ Add case study</LinkButton>}
      />
      {studies.length === 0 ? (
        <EmptyState title="No case studies yet." action={<LinkButton href="/case-studies/new" variant="primary">Add your first case study</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {studies.map((s) => (
            <li key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-surface p-3 sm:flex sm:gap-4">
              <Link href={`/case-studies/${s.id}`} className="shrink-0">
                <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-md bg-white p-1.5">
                  {s.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/case-studies/${s.id}`} className="block truncate font-medium hover:text-brand-bright">
                  {s.brand}
                </Link>
                <p className="truncate text-xs text-fg-muted">{s.tagline.replace(/\n/g, " ")}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">/{s.slug} · order {s.sort_order}</p>
              </div>
              {/* Mobile: its own row under the title. Desktop (`contents`): inline, as before. */}
              <div className="col-span-2 flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents">
              <div className="flex items-center gap-5">
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Live
                  <FlagToggle label={`Published: ${s.brand}`} checked={s.published} onToggle={setCaseStudyFlag.bind(null, s.id, "published")} />
                </label>
                <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Portfolio
                  <FlagToggle label={`Featured on portfolio: ${s.brand}`} checked={s.featured} onToggle={setCaseStudyFlag.bind(null, s.id, "featured")} />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <LinkButton href={`/case-studies/${s.id}`} size="sm">Edit</LinkButton>
                <DeleteButton what={`the ${s.brand} case study`} onDelete={deleteCaseStudy.bind(null, s.id)} />
              </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
