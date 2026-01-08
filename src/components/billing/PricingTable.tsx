import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    members: "Up to 149 members",
    price: 99,
    features: [
      "Unlimited check-ins",
      "Member management",
      "Attendance analytics",
      "SMS campaigns",
      "Service management",
      "Groups & ministries",
      "Visitor tracking",
      "1 branch included",
    ],
  },
  {
    name: "Growth",
    members: "150 - 5,000 members",
    price: 299,
    popular: true,
    features: [
      "Everything in Starter",
      "Advanced analytics",
      "Bulk member import",
      "Custom reports",
      "Priority support",
      "Admin roles & permissions",
      "1 branch included",
    ],
  },
  {
    name: "Enterprise",
    members: "5,001+ members",
    price: 599,
    features: [
      "Everything in Growth",
      "Unlimited analytics history",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "Multi-branch management",
      "1 branch included",
    ],
  },
];

interface PricingTableProps {
  highlightTier?: number; // 99, 299, or 599
}

export function PricingTable({ highlightTier }: PricingTableProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((tier) => {
        const isHighlighted = highlightTier === tier.price;
        const isPopular = tier.popular;

        return (
          <Card
            key={tier.name}
            className={`relative ${
              isHighlighted
                ? "border-primary shadow-lg ring-2 ring-primary"
                : isPopular
                ? "border-primary/50"
                : ""
            }`}
          >
            {(isPopular || isHighlighted) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  {isHighlighted ? "Your Plan" : "Most Popular"}
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">{tier.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tier.members}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">GHS {tier.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {/* Branch Add-on */}
      <div className="md:col-span-3">
        <Card className="bg-muted/30">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <h4 className="font-medium">Additional Branches</h4>
              <p className="text-sm text-muted-foreground">
                First branch included in all plans. Add more as you grow.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">+GHS 100</span>
              <span className="text-muted-foreground">/branch/month</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
