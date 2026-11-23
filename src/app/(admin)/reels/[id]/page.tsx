import { getReel } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ReelForm } from "@/components/forms/ReelForm";

export const metadata = { title: "Edit reel" };

export default async function EditReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reel = await getReel(id);
  return (
    <>
      <PageHeader title="Edit reel" description={reel.title} />
      <ReelForm reel={reel} />
    </>
  );
}
