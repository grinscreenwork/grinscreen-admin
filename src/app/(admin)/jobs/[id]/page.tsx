import { getJob } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/forms/JobForm";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  return (
    <>
      <PageHeader title="Edit job" description={job.title} />
      <JobForm job={job} />
    </>
  );
}
