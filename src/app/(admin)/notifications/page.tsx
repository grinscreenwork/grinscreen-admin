import { listRecipients } from "@/lib/queries";
import { mailConfigured, senderAddress } from "@/lib/mail";
import { Card, PageHeader } from "@/components/ui";
import { Recipients } from "./Recipients";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const recipients = await listRecipients();
  const configured = mailConfigured();
  const sender = senderAddress();

  return (
    <>
      <PageHeader
        title="Notifications"
        description="When someone books a call, they get an automatic confirmation email, and everyone below is alerted."
      />

      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${configured ? "bg-brand-bright" : "bg-warn"}`}
          />
          <div className="min-w-0 text-sm">
            {configured ? (
              <p>
                Emails are sent from <strong className="break-all">{sender}</strong>.
              </p>
            ) : (
              <>
                <p className="font-medium text-warn">Email sending isn&apos;t set up yet.</p>
                <p className="mt-1 text-fg-muted">
                  Booking emails can&apos;t be sent until the sender account is connected. Please ask your developer to finish the
                  email setup.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      <Recipients recipients={recipients} configured={configured} />
    </>
  );
}
