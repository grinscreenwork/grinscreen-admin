import { getCaseStudy, listReels } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { CaseStudyForm } from "@/components/forms/CaseStudyForm";

export const metadata = { title: "Edit case study" };

export default async function EditCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [study, library] = await Promise.all([getCaseStudy(id), listReels()]);
  return (
    <>
      <PageHeader title="Edit case study" description={study.brand} />
      <CaseStudyForm study={study} library={library} />
    </>
  );
}
