import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Social OS",
  description: "How Social OS handles information when you use the service.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <a href="/" className="text-sm text-indigo-700 hover:underline">← Social OS</a>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 13, 2026</p>
      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Scope</h2>
          <p>This policy describes how Social OS handles information when you use the web application and choose to connect a social media account. The information processed depends on the features you use and the permissions you grant.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Information we may process</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Account and workspace information:</strong> authentication identifiers, workspace membership, and settings needed to operate the service.</li>
            <li><strong>Content you provide:</strong> brand information, prompts, drafts, captions, and media or other materials you choose to submit.</li>
            <li><strong>Connected-platform information:</strong> identifiers, display names, authorization scopes, and access or refresh tokens needed to maintain a connection, when you authorize a platform integration.</li>
            <li><strong>Operational information:</strong> service events and technical information needed to maintain security, troubleshoot issues, and operate features.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. How information is used</h2>
          <p>Information is used to authenticate users, operate workspaces, provide requested AI-assisted content workflows, connect authorized social accounts, perform actions explicitly enabled by a platform integration, maintain security, and troubleshoot or improve the service.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. TikTok authorization and data</h2>
          <p>If you connect TikTok, Social OS uses the permissions you approve to complete the requested integration features. TikTok authorization tokens are stored in encrypted form by the application. Tokens are used to maintain or perform the authorized connection and are not intended for advertising or sale. Social OS does not claim to publish content unless the platform confirms the result.</p>
          <p>Social OS does not request or use TikTok permissions beyond those configured for the integration. The data actually accessible depends on the products, scopes, app review status, and consent granted to the application.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">5. Service providers and sharing</h2>
          <p>Information may be processed by infrastructure or service providers required to operate the application, such as hosting, database, authentication, and AI providers, according to the features you use. Information may also be disclosed where required by law or where necessary to protect the service, users, or others. Social OS does not sell personal information.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">6. Storage and security</h2>
          <p>We use technical measures intended to protect information, including access controls and encryption of connected-platform tokens. No method of storage or transmission can be guaranteed to be completely secure. Information is retained only as needed for service operation, security, legal obligations, and legitimate operational purposes.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">7. Your choices and deletion requests</h2>
          <p>You can stop using an integration and revoke its authorization through TikTok where supported. To request deletion of information associated with your Social OS account or a connected platform, use the support or contact channel provided within the application. Some records may be retained where required for security, legal, or operational reasons.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">8. Children</h2>
          <p>Social OS is not designed for children who are not permitted to use the service under applicable law or the terms of connected platforms.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">9. International processing and third-party services</h2>
          <p>Information may be processed in countries where service providers operate. Third-party platforms are governed by their own privacy policies and terms.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">10. Changes to this policy</h2>
          <p>This policy may be updated as Social OS features and integrations evolve. The updated date above indicates the latest revision.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">11. Contact</h2>
          <p>For privacy questions or deletion requests, use the support or contact channel provided within the Social OS application.</p>
        </section>
      </div>
    </main>
  );
}
