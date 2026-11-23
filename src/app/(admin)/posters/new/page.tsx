import { PageHeader } from "@/components/ui";
import { PosterForm } from "@/components/forms/PosterForm";

export const metadata = { title: "Add poster" };

export default function NewPosterPage() {
  return (
    <>
      <PageHeader title="Add poster" />
      <PosterForm />
    </>
  );
}
