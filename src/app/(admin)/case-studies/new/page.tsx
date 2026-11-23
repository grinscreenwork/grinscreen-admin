import { PageHeader } from "@/components/ui";
import { CaseStudyForm } from "@/components/forms/CaseStudyForm";
import { listReels } from "@/lib/queries";

export const metadata = { title: "Add case study" };

export default async function NewCaseStudyPage() {
  const library = await listReels();
  return (
    <>
      <PageHeader title="Add case study" />
      <CaseStudyForm library={library} />
    </>
  );
}
