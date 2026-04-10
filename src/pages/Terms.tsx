import Layout from "@/components/layout/Layout";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 10, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using Puzzlecraft you agree to these terms. If you do not agree, please do not use the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Use of the Service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may use Puzzlecraft for personal, non-commercial purposes. You agree not to misuse the service, attempt to gain unauthorized access, or interfere with other users' enjoyment of the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Accounts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials. We reserve the right to suspend accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Subscriptions &amp; Payments</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premium features require a paid subscription. Subscriptions auto-renew unless cancelled before the renewal date. Refunds are handled according to the platform's (App Store / Google Play) refund policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Puzzlecraft is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Changes to Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </Layout>
  );
}
