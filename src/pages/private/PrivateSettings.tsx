import PrivateLayout from "@/components/private/PrivateLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PrivateSettings = () => {
  return (
    <PrivateLayout title="Settings">
      <div className="p-6 max-w-lg space-y-8">
        {/* Profile section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Display Name
              </label>
              <Input
                placeholder="Your name"
                className="bg-secondary border-border text-foreground"
                disabled
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <Input
                placeholder="you@example.com"
                className="bg-secondary border-border text-foreground"
                disabled
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Settings will be configurable once your account is connected.
          </p>
        </section>

        <Button disabled variant="outline" className="border-border">
          Save Changes
        </Button>
      </div>
    </PrivateLayout>
  );
};

export default PrivateSettings;
