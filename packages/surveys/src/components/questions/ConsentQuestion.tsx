import { TResponseData } from "@formbricks/types/v1/responses";
import type { TSurveyConsentQuestion } from "@formbricks/types/v1/surveys";
import { BackButton } from "../buttons/BackButton";
import SubmitButton from "../buttons/SubmitButton";
import Headline from "../general/Headline";
import HtmlBody from "../general/HtmlBody";

interface ConsentQuestionProps {
  question: TSurveyConsentQuestion;
  value: string | number | string[];
  onChange: (responseData: TResponseData) => void;
  onSubmit: (data: TResponseData) => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  brandColor: string;
}

export default function ConsentQuestion({
  question,
  value,
  onChange,
  onSubmit,
  onBack,
  isFirstQuestion,
  isLastQuestion,
  brandColor,
}: ConsentQuestionProps) {
  return (
    <div>
      <Headline headline={question.headline} questionId={question.id} />
      <HtmlBody htmlString={question.html || ""} questionId={question.id} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ [question.id]: value });
        }}>
        <label className="relative z-10 mt-4 flex w-full cursor-pointer items-center rounded-md border border-[--fb-q-consent-label-border] bg-[--fb-q-consent-label-bg] p-4 text-sm text-[--fb-q-consent-label-color] focus:outline-none">
          <input
            type="checkbox"
            id={question.id}
            name={question.id}
            value={question.label}
            onChange={(e) => {
              if (e.target instanceof HTMLInputElement && e.target.checked) {
                onChange({ [question.id]: "accepted" });
              } else {
                onChange({ [question.id]: "dismissed" });
              }
            }}
            checked={value === "accepted"}
            className="h-4 w-4 border border-[--fb-q-consent-input-border] text-[--fb-q-consent-input-color] focus:ring-0 focus:ring-offset-0"
            aria-labelledby={`${question.id}-label`}
            required={question.required}
          />
          <span id={`${question.id}-label`} className="ml-3 font-medium">
            {question.label}
          </span>
        </label>

        <div className="mt-4 flex w-full justify-between">
          {!isFirstQuestion && (
            <BackButton backButtonLabel={question.backButtonLabel} onClick={() => onBack()} />
          )}
          <div />
          <SubmitButton
            brandColor={brandColor}
            question={question}
            isLastQuestion={isLastQuestion}
            onClick={() => {}}
          />
        </div>
      </form>
    </div>
  );
}