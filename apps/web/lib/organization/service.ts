import "server-only";
import { BILLING_LIMITS, ITEMS_PER_PAGE, PROJECT_FEATURE_KEYS } from "@/lib/constants";
import { getProjects } from "@/lib/project/service";
import { updateUser } from "@/lib/user/service";
import { getBillingPeriodStartDate } from "@/lib/utils/billing";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@formbricks/database";
import { PrismaErrorType } from "@formbricks/database/types/error";
import { logger } from "@formbricks/logger";
import { ZId, ZOptionalNumber, ZString } from "@formbricks/types/common";
import { DatabaseError, ResourceNotFoundError } from "@formbricks/types/errors";
import {
  TOrganization,
  TOrganizationCreateInput,
  TOrganizationUpdateInput,
  ZOrganizationCreateInput,
} from "@formbricks/types/organizations";
import { TUserNotificationSettings } from "@formbricks/types/user";
import { validateInputs } from "../utils/validate";

export const select: Prisma.OrganizationSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  billing: true,
  isAIEnabled: true,
  whitelabel: true,
};

export const getOrganizationsTag = (organizationId: string) => `organizations-${organizationId}`;
export const getOrganizationsByUserIdCacheTag = (userId: string) => `users-${userId}-organizations`;
export const getOrganizationByEnvironmentIdCacheTag = (environmentId: string) =>
  `environments-${environmentId}-organization`;

export const getOrganizationsByUserId = reactCache(
  async (userId: string, page?: number): Promise<TOrganization[]> => {
    validateInputs([userId, ZString], [page, ZOptionalNumber]);

    try {
      const organizations = await prisma.organization.findMany({
        where: {
          memberships: {
            some: {
              userId,
            },
          },
        },
        select,
        take: page ? ITEMS_PER_PAGE : undefined,
        skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
      });
      if (!organizations) {
        throw new ResourceNotFoundError("Organizations by UserId", userId);
      }
      return organizations;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);

export const getOrganizationByEnvironmentId = reactCache(
  async (environmentId: string): Promise<TOrganization | null> => {
    validateInputs([environmentId, ZId]);

    try {
      const organization = await prisma.organization.findFirst({
        where: {
          projects: {
            some: {
              environments: {
                some: {
                  id: environmentId,
                },
              },
            },
          },
        },
        select: { ...select, memberships: true }, // include memberships
      });

      return organization;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(error, "Error getting organization by environment id");
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);

export const getOrganization = reactCache(async (organizationId: string): Promise<TOrganization | null> => {
  validateInputs([organizationId, ZString]);

  try {
    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select,
    });
    return organization;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
});

export const createOrganization = async (
  organizationInput: TOrganizationCreateInput
): Promise<TOrganization> => {
  try {
    validateInputs([organizationInput, ZOrganizationCreateInput]);

    const organization = await prisma.organization.create({
      data: {
        ...organizationInput,
        billing: {
          plan: PROJECT_FEATURE_KEYS.FREE,
          limits: {
            projects: BILLING_LIMITS.FREE.PROJECTS,
            monthly: {
              responses: BILLING_LIMITS.FREE.RESPONSES,
              miu: BILLING_LIMITS.FREE.MIU,
            },
          },
          stripeCustomerId: null,
          periodStart: new Date(),
          period: "monthly",
        },
      },
      select,
    });

    return organization;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const updateOrganization = async (
  organizationId: string,
  data: Partial<TOrganizationUpdateInput>
): Promise<TOrganization> => {
  try {
    const updatedOrganization = await prisma.organization.update({
      where: {
        id: organizationId,
      },
      data,
      select: { ...select, memberships: true, projects: { select: { environments: true } } }, // include memberships & environments
    });

    const organization = {
      ...updatedOrganization,
      memberships: undefined,
      projects: undefined,
    };

    return organization;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PrismaErrorType.RecordDoesNotExist
    ) {
      throw new ResourceNotFoundError("Organization", organizationId);
    }
    throw error; // Re-throw any other errors
  }
};

export const deleteOrganization = async (organizationId: string) => {
  validateInputs([organizationId, ZId]);
  try {
    await prisma.organization.delete({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
        memberships: {
          select: {
            userId: true,
          },
        },
        projects: {
          select: {
            id: true,
            environments: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

export const getMonthlyActiveOrganizationPeopleCount = reactCache(
  async (organizationId: string): Promise<number> => {
    validateInputs([organizationId, ZId]);

    try {
      // temporary solution until we have a better way to track active users
      return 0;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);

export const getMonthlyOrganizationResponseCount = reactCache(
  async (organizationId: string): Promise<number> => {
    validateInputs([organizationId, ZId]);

    try {
      const organization = await getOrganization(organizationId);
      if (!organization) {
        throw new ResourceNotFoundError("Organization", organizationId);
      }

      // Use the utility function to calculate the start date
      const startDate = getBillingPeriodStartDate(organization.billing);

      // Get all environment IDs for the organization
      const projects = await getProjects(organizationId);
      const environmentIds = projects.flatMap((project) => project.environments.map((env) => env.id));

      // Use Prisma's aggregate to count responses for all environments
      const responseAggregations = await prisma.response.aggregate({
        _count: {
          id: true,
        },
        where: {
          AND: [{ survey: { environmentId: { in: environmentIds } } }, { createdAt: { gte: startDate } }],
        },
      });

      // The result is an aggregation of the total count
      return responseAggregations._count.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);

export const subscribeOrganizationMembersToSurveyResponses = async (
  surveyId: string,
  createdBy: string,
  organizationId: string
): Promise<void> => {
  try {
    const surveyCreator = await prisma.user.findUnique({
      where: {
        id: createdBy,
      },
    });

    if (!surveyCreator) {
      throw new ResourceNotFoundError("User", createdBy);
    }

    if (surveyCreator.notificationSettings?.unsubscribedOrganizationIds?.includes(organizationId)) {
      return;
    }

    const defaultSettings = { alert: {} };
    const updatedNotificationSettings: TUserNotificationSettings = {
      ...defaultSettings,
      ...surveyCreator.notificationSettings,
    };

    updatedNotificationSettings.alert[surveyId] = true;

    await updateUser(surveyCreator.id, {
      notificationSettings: updatedNotificationSettings,
    });
  } catch (error) {
    throw error;
  }
};

export const getOrganizationsWhereUserIsSingleOwner = reactCache(
  async (userId: string): Promise<TOrganization[]> => {
    validateInputs([userId, ZString]);
    try {
      const orgs = await prisma.organization.findMany({
        where: {
          memberships: {
            some: {
              userId,
              role: "owner",
            },
          },
        },
        select: {
          ...select,
          memberships: {
            where: {
              role: "owner",
            },
          },
        },
      });

      // Filter to only include orgs where there is exactly one owner
      const filteredOrgs = orgs
        .filter((org) => org.memberships.length === 1)
        .map((org) => ({
          ...org,
          memberships: undefined, // Remove memberships from the return object to match TOrganization type
        }));

      return filteredOrgs;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }
      throw error;
    }
  }
);
