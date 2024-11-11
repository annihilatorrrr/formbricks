import { OrganizationSettingsNavbar } from "@/app/(app)/environments/[environmentId]/settings/(organization)/components/OrganizationSettingsNavbar";
import { getTranslations } from "next-intl/server";
import { IS_FORMBRICKS_CLOUD } from "@formbricks/lib/constants";
import { PageContentWrapper } from "@formbricks/ui/components/PageContentWrapper";
import { PageHeader } from "@formbricks/ui/components/PageHeader";

const Loading = async () => {
  const t = await getTranslations();
  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("environments.settings.general.organization_settings")}>
        <OrganizationSettingsNavbar isFormbricksCloud={IS_FORMBRICKS_CLOUD} activeId="billing" loading />
      </PageHeader>
      <div className="my-8 h-64 animate-pulse rounded-xl bg-slate-200"></div>
      <div className="my-8 h-96 animate-pulse rounded-md bg-slate-200"></div>
    </PageContentWrapper>
  );
};

export default Loading;