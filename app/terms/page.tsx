import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Social OS",
  description: "Terms governing use of Social OS.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <a href="/" className="text-sm text-indigo-700 hover:underline">← Social OS</a>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 13, 2026</p>
      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. About Social OS</h2>
          <p>Social OS is a web-based tool designed to help users organize social media workflows and create content with AI assistance. Available features may change as the service is developed.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Accounts and workspaces</h2>
          <p>You are responsible for maintaining the security of your account and for activity performed through your account. You must provide accurate information and use only workspaces and social accounts you are authorized to manage.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Connected social platforms</h2>
          <p>When you connect a third-party account, you authorize Social OS to access only the information and actions covered by the permissions you grant. Your use of TikTok and other third-party services remains subject to their respective terms and policies. You can revoke authorization through the relevant platform where supported.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. AI-generated content and publishing</h2>
          <p>AI-generated content may be inaccurate, incomplete, or unsuitable for your audience. You are responsible for reviewing content, media, captions, disclosures, and destinations before using or publishing them. A generated or queued draft is not proof that a post was successfully published. Publishing depends on platform permissions, availability, and applicable review or audit requirements.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">5. Acceptable use</h2>
          <p>You must not use Social OS to violate laws, infringe rights, bypass platform safeguards, mislead users, or access accounts or data without authorization. You must comply with the policies of every connected platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">6. Availability and changes</h2>
          <p>Social OS is provided on an evolving basis. Features may be unavailable, changed, or discontinued, and third-party platform APIs may impose limits or change their requirements. We do not guarantee uninterrupted service or successful delivery of content to a third-party platform.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">7. Suspension and termination</h2>
          <p>Access may be suspended or terminated where reasonably necessary to protect users, the service, third parties, or to comply with applicable requirements.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">8. Limitation</h2>
          <p>To the extent permitted by applicable law, Social OS is provided without warranties regarding uninterrupted availability, accuracy of AI outputs, or third-party platform outcomes. Nothing in these terms limits rights that cannot lawfully be limited.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">9. Changes to these terms</h2>
          <p>These terms may be updated as the service evolves. The updated date above indicates the latest revision.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p>For questions about these terms, use the support or contact channel provided within the Social OS application.</p>
        </section>
      </div>
    </main>
  );
}
