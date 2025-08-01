import {
  DEBUG,
  MAIL_FROM,
  MAIL_FROM_NAME,
  SMTP_AUTHENTICATED,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_REJECT_UNAUTHORIZED_TLS,
  SMTP_SECURE_ENABLED,
  SMTP_USER,
  WEBAPP_URL,
} from "@/lib/constants";
import { getPublicDomain } from "@/lib/getPublicUrl";
import { createEmailChangeToken, createInviteToken, createToken, createTokenForLinkSurvey } from "@/lib/jwt";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import NewEmailVerification from "@/modules/email/emails/auth/new-email-verification";
import { EmailCustomizationPreviewEmail } from "@/modules/email/emails/general/email-customization-preview-email";
import { getTranslate } from "@/tolgee/server";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { logger } from "@formbricks/logger";
import type { TLinkSurveyEmailData } from "@formbricks/types/email";
import { InvalidInputError } from "@formbricks/types/errors";
import type { TResponse } from "@formbricks/types/responses";
import type { TSurvey } from "@formbricks/types/surveys/types";
import { TUserEmail, TUserLocale } from "@formbricks/types/user";
import { ForgotPasswordEmail } from "./emails/auth/forgot-password-email";
import { PasswordResetNotifyEmail } from "./emails/auth/password-reset-notify-email";
import { VerificationEmail } from "./emails/auth/verification-email";
import { InviteAcceptedEmail } from "./emails/invite/invite-accepted-email";
import { InviteEmail } from "./emails/invite/invite-email";
import { EmbedSurveyPreviewEmail } from "./emails/survey/embed-survey-preview-email";
import { LinkSurveyEmail } from "./emails/survey/link-survey-email";
import { ResponseFinishedEmail } from "./emails/survey/response-finished-email";

export const IS_SMTP_CONFIGURED = Boolean(SMTP_HOST && SMTP_PORT);

interface SendEmailDataProps {
  to: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html: string;
}

export const sendEmail = async (emailData: SendEmailDataProps): Promise<boolean> => {
  if (!IS_SMTP_CONFIGURED) {
    logger.info("SMTP is not configured, skipping email sending");
    return false;
  }
  try {
    const transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE_ENABLED, // true for 465, false for other ports
      ...(SMTP_AUTHENTICATED
        ? {
            auth: {
              type: "LOGIN",
              user: SMTP_USER,
              pass: SMTP_PASSWORD,
            },
          }
        : {}),
      tls: {
        rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED_TLS,
      },
      logger: DEBUG,
      debug: DEBUG,
    } as SMTPTransport.Options);

    const emailDefaults = {
      from: `${MAIL_FROM_NAME ?? "Formbricks"} <${MAIL_FROM ?? "noreply@formbricks.com"}>`,
    };
    await transporter.sendMail({ ...emailDefaults, ...emailData });

    return true;
  } catch (error) {
    logger.error(error, "Error in sendEmail");
    throw new InvalidInputError("Incorrect SMTP credentials");
  }
};

export const sendVerificationNewEmail = async (id: string, email: string): Promise<boolean> => {
  try {
    const t = await getTranslate();
    const token = createEmailChangeToken(id, email);
    const verifyLink = `${WEBAPP_URL}/verify-email-change?token=${encodeURIComponent(token)}`;

    const html = await render(await NewEmailVerification({ verifyLink }));

    return await sendEmail({
      to: email,
      subject: t("emails.verification_new_email_subject"),
      html,
    });
  } catch (error) {
    logger.error(error, "Error in sendVerificationNewEmail");
    throw error;
  }
};

export const sendVerificationEmail = async ({
  id,
  email,
}: {
  id: string;
  email: TUserEmail;
}): Promise<boolean> => {
  try {
    const t = await getTranslate();
    const token = createToken(id, email, {
      expiresIn: "1d",
    });
    const verifyLink = `${WEBAPP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
    const verificationRequestLink = `${WEBAPP_URL}/auth/verification-requested?token=${encodeURIComponent(token)}`;

    const html = await render(await VerificationEmail({ verificationRequestLink, verifyLink }));

    return await sendEmail({
      to: email,
      subject: t("emails.verification_email_subject"),
      html,
    });
  } catch (error) {
    logger.error(error, "Error in sendVerificationEmail");
    throw error; // Re-throw the error to maintain the original behavior
  }
};

export const sendForgotPasswordEmail = async (user: {
  id: string;
  email: TUserEmail;
  locale: TUserLocale;
}): Promise<boolean> => {
  const t = await getTranslate();
  const token = createToken(user.id, user.email, {
    expiresIn: "1d",
  });
  const verifyLink = `${WEBAPP_URL}/auth/forgot-password/reset?token=${encodeURIComponent(token)}`;
  const html = await render(await ForgotPasswordEmail({ verifyLink }));
  return await sendEmail({
    to: user.email,
    subject: t("emails.forgot_password_email_subject"),
    html,
  });
};

export const sendPasswordResetNotifyEmail = async (user: { email: string }): Promise<boolean> => {
  const t = await getTranslate();
  const html = await render(await PasswordResetNotifyEmail());
  return await sendEmail({
    to: user.email,
    subject: t("emails.password_reset_notify_email_subject"),
    html,
  });
};

export const sendInviteMemberEmail = async (
  inviteId: string,
  email: string,
  inviterName: string,
  inviteeName: string
): Promise<boolean> => {
  const token = createInviteToken(inviteId, email, {
    expiresIn: "7d",
  });
  const t = await getTranslate();

  const verifyLink = `${WEBAPP_URL}/invite?token=${encodeURIComponent(token)}`;

  const html = await render(await InviteEmail({ inviteeName, inviterName, verifyLink }));
  return await sendEmail({
    to: email,
    subject: t("emails.invite_member_email_subject"),
    html,
  });
};

export const sendInviteAcceptedEmail = async (
  inviterName: string,
  inviteeName: string,
  email: string
): Promise<void> => {
  const t = await getTranslate();
  const html = await render(await InviteAcceptedEmail({ inviteeName, inviterName }));
  await sendEmail({
    to: email,
    subject: t("emails.invite_accepted_email_subject"),
    html,
  });
};

export const sendResponseFinishedEmail = async (
  email: string,
  environmentId: string,
  survey: TSurvey,
  response: TResponse,
  responseCount: number
): Promise<void> => {
  const t = await getTranslate();
  const personEmail = response.contactAttributes?.email;
  const organization = await getOrganizationByEnvironmentId(environmentId);

  if (!organization) {
    throw new Error("Organization not found");
  }

  const html = await render(
    await ResponseFinishedEmail({
      survey,
      responseCount,
      response,
      WEBAPP_URL,
      environmentId,
      organization,
    })
  );

  await sendEmail({
    to: email,
    subject: personEmail
      ? t("emails.response_finished_email_subject_with_email", {
          personEmail,
          surveyName: survey.name,
        })
      : t("emails.response_finished_email_subject", {
          surveyName: survey.name,
        }),
    replyTo: personEmail?.toString() ?? MAIL_FROM,
    html,
  });
};

export const sendEmbedSurveyPreviewEmail = async (
  to: string,
  innerHtml: string,
  environmentId: string,
  logoUrl?: string
): Promise<boolean> => {
  const t = await getTranslate();
  const html = await render(await EmbedSurveyPreviewEmail({ html: innerHtml, environmentId, logoUrl }));
  return await sendEmail({
    to,
    subject: t("emails.embed_survey_preview_email_subject"),
    html,
  });
};

export const sendEmailCustomizationPreviewEmail = async (
  to: string,
  userName: string,
  logoUrl?: string
): Promise<boolean> => {
  const t = await getTranslate();
  const emailHtmlBody = await render(await EmailCustomizationPreviewEmail({ userName, logoUrl }));

  return await sendEmail({
    to,
    subject: t("emails.email_customization_preview_email_subject"),
    html: emailHtmlBody,
  });
};

export const sendLinkSurveyToVerifiedEmail = async (data: TLinkSurveyEmailData): Promise<boolean> => {
  const surveyId = data.surveyId;
  const email = data.email;
  const surveyName = data.surveyName;
  const singleUseId = data.suId;
  const logoUrl = data.logoUrl || "";
  const token = createTokenForLinkSurvey(surveyId, email);
  const t = await getTranslate();
  const getSurveyLink = (): string => {
    if (singleUseId) {
      return `${getPublicDomain()}/s/${surveyId}?verify=${encodeURIComponent(token)}&suId=${singleUseId}`;
    }
    return `${getPublicDomain()}/s/${surveyId}?verify=${encodeURIComponent(token)}`;
  };
  const surveyLink = getSurveyLink();

  const html = await render(await LinkSurveyEmail({ surveyName, surveyLink, logoUrl }));
  return await sendEmail({
    to: data.email,
    subject: t("emails.verified_link_survey_email_subject"),
    html,
  });
};
