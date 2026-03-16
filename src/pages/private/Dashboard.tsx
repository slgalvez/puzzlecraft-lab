import PrivateLayout from "@/components/private/PrivateLayout";

const Dashboard = () => {
  return (
    <PrivateLayout title="Overview">
      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active", value: "0" },
            { label: "Pending", value: "0" },
            { label: "Resolved", value: "0" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Recent Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Nothing to show yet. Activity will appear here once available.
          </p>
        </div>
      </div>
    </PrivateLayout>
  );
};

export default Dashboard;
