import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/forms/JobForm";

export const metadata = { title: "Add job" };

export default function NewJobPage() {
  return (
    <>
      <PageHeader title="Add job" />
      <JobForm />
    </>
  );
}
