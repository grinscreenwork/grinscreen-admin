import { PageHeader } from "@/components/ui";
import { ReelForm } from "@/components/forms/ReelForm";

export const metadata = { title: "Add reel" };

export default function NewReelPage() {
  return (
    <>
      <PageHeader title="Add reel" />
      <ReelForm />
    </>
  );
}
