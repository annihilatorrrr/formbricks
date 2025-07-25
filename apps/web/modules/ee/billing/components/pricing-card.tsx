"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";
import { ConfirmationModal } from "@/modules/ui/components/confirmation-modal";
import { useTranslate } from "@tolgee/react";
import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { TOrganization, TOrganizationBillingPeriod } from "@formbricks/types/organizations";
import { TPricingPlan } from "../api/lib/constants";

interface PricingCardProps {
  plan: TPricingPlan;
  planPeriod: TOrganizationBillingPeriod;
  organization: TOrganization;
  onUpgrade: () => Promise<void>;
  onManageSubscription: () => Promise<void>;
  projectFeatureKeys: {
    FREE: string;
    STARTUP: string;
    ENTERPRISE: string;
  };
}

export const PricingCard = ({
  planPeriod,
  plan,
  onUpgrade,
  onManageSubscription,
  organization,
  projectFeatureKeys,
}: PricingCardProps) => {
  const { t } = useTranslate();
  const [loading, setLoading] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const isCurrentPlan = useMemo(() => {
    if (organization.billing.plan === projectFeatureKeys.FREE && plan.id === projectFeatureKeys.FREE) {
      return true;
    }

    if (
      organization.billing.plan === projectFeatureKeys.ENTERPRISE &&
      plan.id === projectFeatureKeys.ENTERPRISE
    ) {
      return true;
    }

    return organization.billing.plan === plan.id && organization.billing.period === planPeriod;
  }, [
    organization.billing.period,
    organization.billing.plan,
    plan.id,
    planPeriod,
    projectFeatureKeys.ENTERPRISE,
    projectFeatureKeys.FREE,
  ]);

  const CTAButton = useMemo(() => {
    if (isCurrentPlan) {
      return null;
    }

    if (plan.id === projectFeatureKeys.ENTERPRISE) {
      return (
        <Button
          variant="outline"
          loading={loading}
          onClick={() => {
            window.open(plan.href, "_blank", "noopener,noreferrer");
          }}
          className="flex justify-center bg-white">
          {plan.CTA ?? t("common.request_pricing")}
        </Button>
      );
    }

    if (plan.id === projectFeatureKeys.STARTUP) {
      if (organization.billing.plan === projectFeatureKeys.FREE) {
        return (
          <Button
            loading={loading}
            variant="default"
            onClick={async () => {
              setLoading(true);
              await onUpgrade();
              setLoading(false);
            }}
            className="flex justify-center">
            {plan.CTA ?? t("common.start_free_trial")}
          </Button>
        );
      }

      return (
        <Button
          loading={loading}
          onClick={() => {
            setUpgradeModalOpen(true);
          }}
          className="flex justify-center">
          {t("environments.settings.billing.switch_plan")}
        </Button>
      );
    }

    return null;
  }, [
    isCurrentPlan,
    loading,
    onUpgrade,
    organization.billing.plan,
    plan.CTA,
    plan.featured,
    plan.href,
    plan.id,
    projectFeatureKeys.ENTERPRISE,
    projectFeatureKeys.FREE,
    projectFeatureKeys.STARTUP,
    t,
  ]);

  return (
    <div
      key={plan.id}
      className={cn(
        plan.featured
          ? "z-10 bg-white shadow-lg ring-1 ring-slate-900/10"
          : "bg-slate-100 ring-1 ring-white/10 lg:bg-transparent lg:pb-8 lg:ring-0",
        "relative rounded-xl"
      )}>
      <div className="p-8 lg:pt-12 xl:p-10 xl:pt-14">
        <div className="flex gap-x-2">
          <h2
            id={plan.id}
            className={cn(
              plan.featured ? "text-slate-900" : "text-slate-800",
              "text-sm font-semibold leading-6"
            )}>
            {plan.name}
          </h2>
          {isCurrentPlan && (
            <Badge type="success" size="normal" text={t("environments.settings.billing.current_plan")} />
          )}
        </div>
        <div className="flex flex-col items-end gap-6 sm:flex-row sm:justify-between lg:flex-col lg:items-stretch">
          <div className="mt-2 flex items-end gap-x-1">
            <p
              className={cn(
                plan.featured ? "text-slate-900" : "text-slate-800",
                "text-4xl font-bold tracking-tight"
              )}>
              {plan.id !== projectFeatureKeys.ENTERPRISE
                ? planPeriod === "monthly"
                  ? plan.price.monthly
                  : plan.price.yearly
                : plan.price.monthly}
            </p>
            {plan.id !== projectFeatureKeys.ENTERPRISE && (
              <div className="text-sm leading-5">
                <p className={plan.featured ? "text-slate-700" : "text-slate-600"}>
                  / {planPeriod === "monthly" ? "Month" : "Year"}
                </p>
              </div>
            )}
          </div>

          {CTAButton}

          {plan.id !== projectFeatureKeys.FREE && isCurrentPlan && (
            <Button
              variant="secondary"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                await onManageSubscription();
                setLoading(false);
              }}
              className="flex justify-center">
              {t("environments.settings.billing.manage_subscription")}
            </Button>
          )}
        </div>
        <div className="mt-8 flow-root sm:mt-10">
          <ul
            className={cn(
              plan.featured
                ? "divide-slate-900/5 border-slate-900/5 text-slate-600"
                : "divide-white/5 border-white/5 text-slate-800",
              "-my-2 divide-y border-t text-sm leading-6 lg:border-t-0"
            )}>
            {plan.mainFeatures.map((mainFeature) => (
              <li key={mainFeature} className="flex gap-x-3 py-2">
                <CheckIcon
                  className={cn(plan.featured ? "text-brand-dark" : "text-slate-500", "h-6 w-5 flex-none")}
                  aria-hidden="true"
                />
                {mainFeature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ConfirmationModal
        title={t("environments.settings.billing.switch_plan")}
        buttonText={t("common.confirm")}
        onConfirm={async () => {
          setLoading(true);
          await onUpgrade();
          setLoading(false);
          setUpgradeModalOpen(false);
        }}
        open={upgradeModalOpen}
        setOpen={setUpgradeModalOpen}
        text={t("environments.settings.billing.switch_plan_confirmation_text", {
          plan: plan.name,
          price: planPeriod === "monthly" ? plan.price.monthly : plan.price.yearly,
          period:
            planPeriod === "monthly"
              ? t("environments.settings.billing.per_month")
              : t("environments.settings.billing.per_year"),
        })}
        buttonVariant="default"
        buttonLoading={loading}
        closeOnOutsideClick={false}
        hideCloseButton
      />
    </div>
  );
};
