import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { outageQuery, setOutage } from "@/api/outage";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SimulationControls() {
  const queryClient = useQueryClient();
  const outage = useQuery(outageQuery);
  const toggle = useMutation({
    mutationFn: setOutage,
    onSuccess: (state) => queryClient.setQueryData(outageQuery.queryKey, state),
  });
  const active = outage.data?.active ?? false;
  return (
    <section aria-labelledby="simulation-heading" className="px-4 py-6 md:px-6">
      <h3 id="simulation-heading">Simulation controls</h3>
      <p className="text-sm text-muted-foreground">
        Turn this on to make SnailPay fail every payment, as if it had an
        internal problem. It affects everyone using this server.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Switch
          id="outage-switch"
          checked={active}
          disabled={outage.isFetching || toggle.isPending}
          onCheckedChange={(checked) => toggle.mutate(checked)}
        />
        <Label htmlFor="outage-switch">
          SnailPay outage: {active ? "on" : "off"}
        </Label>
      </div>
      {(outage.isError || toggle.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t reach SnailPay. Try again.
        </p>
      )}
    </section>
  );
}
