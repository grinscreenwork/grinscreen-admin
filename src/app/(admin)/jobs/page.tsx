import Link from "next/link";
import { listJobs } from "@/lib/queries";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { SortableList } from "@/components/SortableList";
import { deleteJob, reorderJobs, setJobPublished } from "@/app/actions/jobs";
import { WORK_MODE_LABELS } from "@/lib/types";

export const metadata = { title: "Careers" };

export default async function JobsPage() {
  const jobs = await listJobs();

  return (
    <>
      <PageHeader
        title="Careers"
        description="Open roles shown on the website's Careers page. Each one has an Apply button that opens the link you set here."
        action={<LinkButton href="/jobs/new" variant="primary">+ Add job</LinkButton>}
      />
      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet. The Careers page will say there are no openings." action={<LinkButton href="/jobs/new" variant="primary">Add your first job</LinkButton>} />
      ) : (
        <SortableList
          onReorder={reorderJobs}
          hint="Drag a row by its handle to reorder. The first one shows first on the Careers page."
          items={jobs.map((j) => ({
            id: j.id,
            label: j.title,
            content: (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 py-3 pr-3 sm:flex sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${j.id}`} className="block truncate font-medium hover:text-brand-bright">
                    {j.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="green">{WORK_MODE_LABELS[j.work_mode]}</Badge>
                    {j.job_type && <Badge>{j.job_type}</Badge>}
                    {j.location && <Badge>{j.location}</Badge>}
                  </div>
                  <p className="mt-2 truncate font-mono text-[11px] text-fg-muted">{j.apply_url}</p>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-3 sm:contents sm:border-0 sm:pt-0">
                  <label className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider text-fg-muted">
                    Live
                    <FlagToggle label={`Published: ${j.title}`} checked={j.published} onToggle={setJobPublished.bind(null, j.id)} />
                  </label>
                  <div className="flex items-center gap-2">
                    <LinkButton href={`/jobs/${j.id}`} size="sm">Edit</LinkButton>
                    <DeleteButton what={`"${j.title}"`} onDelete={deleteJob.bind(null, j.id)} />
                  </div>
                </div>
              </div>
            ),
          }))}
        />
      )}
    </>
  );
}
