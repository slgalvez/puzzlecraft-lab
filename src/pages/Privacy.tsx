import Layout from "@/components/layout/Layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 10, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you create an account we collect your email address and display name. We also store your puzzle progress, solve times, and ratings to provide leaderboard and statistics features. No personal data is shared with third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is used solely to operate the app — saving progress, displaying leaderboards, and syncing across devices. We do not sell, rent, or trade your personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Cookies &amp; Local Storage</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use browser local storage to save your puzzle progress and preferences. No third-party tracking cookies are used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account data is retained as long as your account is active. You may request deletion of your data at any time by contacting us.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about this policy, please reach out via the Help &amp; FAQ page in the app.
          </p>
        </section>
      </div>
    </Layout>
  );
}
