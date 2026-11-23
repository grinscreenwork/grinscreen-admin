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
                  Add <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">GMAIL_USER</code> and{" "}
                  <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">GMAIL_APP_PASSWORD</code> to the admin&apos;s{" "}
                  <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">.env</code> (and to Vercel), then restart. The
                  app password comes from your Google account: turn on 2-Step Verification, then{" "}
                  <span className="text-fg">Google Account → Security → App passwords</span>.
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
