import { BackButton } from "@/components/buttons/back-button";
import { SubmitButton } from "@/components/buttons/submit-button";
import { Headline } from "@/components/general/headline";
import { QuestionMedia } from "@/components/general/question-media";
import { Subheader } from "@/components/general/subheader";
import { ScrollableContainer } from "@/components/wrappers/scrollable-container";
import { getLocalizedValue } from "@/lib/i18n";
import { getUpdatedTtc, useTtc } from "@/lib/ttc";
import { cn, getShuffledChoicesIds, isRTL } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { type TResponseData, type TResponseTtc } from "@formbricks/types/responses";
import type { TSurveyMultipleChoiceQuestion, TSurveyQuestionId } from "@formbricks/types/surveys/types";

interface MultipleChoiceMultiProps {
  question: TSurveyMultipleChoiceQuestion;
  value: string[];
  onChange: (responseData: TResponseData) => void;
  onSubmit: (data: TResponseData, ttc: TResponseTtc) => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  languageCode: string;
  ttc: TResponseTtc;
  setTtc: (ttc: TResponseTtc) => void;
  autoFocusEnabled: boolean;
  currentQuestionId: TSurveyQuestionId;
  isBackButtonHidden: boolean;
}

export function MultipleChoiceMultiQuestion({
  question,
  value,
  onChange,
  onSubmit,
  onBack,
  isFirstQuestion,
  isLastQuestion,
  languageCode,
  ttc,
  setTtc,
  autoFocusEnabled,
  currentQuestionId,
  isBackButtonHidden,
}: Readonly<MultipleChoiceMultiProps>) {
  const [startTime, setStartTime] = useState(performance.now());
  const isMediaAvailable = question.imageUrl || question.videoUrl;
  useTtc(question.id, ttc, setTtc, startTime, setStartTime, question.id === currentQuestionId);
  const isCurrent = question.id === currentQuestionId;
  const shuffledChoicesIds = useMemo(() => {
    if (question.shuffleOption) {
      return getShuffledChoicesIds(question.choices, question.shuffleOption);
    }
    return question.choices.map((choice) => choice.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to recompute this when the shuffleOption changes
  }, [question.shuffleOption, question.choices.length, question.choices[question.choices.length - 1].id]);

  const getChoicesWithoutOtherLabels = useCallback(
    () =>
      question.choices
        .filter((choice) => choice.id !== "other")
        .map((item) => getLocalizedValue(item.label, languageCode)),
    [question, languageCode]
  );
  const [otherSelected, setOtherSelected] = useState<boolean>(
    Boolean(value) &&
      (Array.isArray(value) ? value : [value]).some((item) => {
        return !getChoicesWithoutOtherLabels().includes(item);
      })
  );
  const [otherValue, setOtherValue] = useState(
    (Array.isArray(value) &&
      value.filter((v) => !question.choices.find((c) => c.label[languageCode] === v))[0]) ||
      ""
  );

  const questionChoices = useMemo(() => {
    if (!question.choices) {
      return [];
    }
    if (question.shuffleOption === "none" || question.shuffleOption === undefined) return question.choices;
    return shuffledChoicesIds.map((choiceId) => {
      const choice = question.choices.find((currentChoice) => {
        return currentChoice.id === choiceId;
      });
      return choice;
    });
  }, [question.choices, question.shuffleOption, shuffledChoicesIds]);

  const questionChoiceLabels = questionChoices.map((questionChoice) => {
    return questionChoice?.label[languageCode];
  });

  const otherOption = useMemo(
    () => question.choices.find((choice) => choice.id === "other"),
    [question.choices]
  );

  const otherSpecify = useRef<HTMLInputElement | null>(null);
  const choicesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to the bottom of choices container and focus on 'otherSpecify' input when 'otherSelected' is true
    if (otherSelected && choicesContainerRef.current && otherSpecify.current) {
      choicesContainerRef.current.scrollTop = choicesContainerRef.current.scrollHeight;
      otherSpecify.current.focus();
    }
  }, [otherSelected]);

  const addItem = (item: string) => {
    const isOtherValue = !questionChoiceLabels.includes(item);
    if (Array.isArray(value)) {
      if (isOtherValue) {
        const newValue = value.filter((v) => {
          return questionChoiceLabels.includes(v);
        });
        onChange({ [question.id]: [...newValue, item] });
        return;
      }
      onChange({ [question.id]: [...value, item] });
      return;
    }
    onChange({ [question.id]: [item] }); // if not array, make it an array
  };

  const removeItem = (item: string) => {
    if (Array.isArray(value)) {
      onChange({ [question.id]: value.filter((i) => i !== item) });
      return;
    }
    onChange({ [question.id]: [] }); // if not array, make it an array
  };

  const getIsRequired = () => {
    const responseValues = [...value];
    if (otherSelected && otherValue) {
      responseValues.push(otherValue);
    }
    return question.required && Array.isArray(responseValues) && responseValues.length
      ? false
      : question.required;
  };

  const otherOptionDir = useMemo(() => {
    const placeholder = getLocalizedValue(question.otherOptionPlaceholder, languageCode);
    if (!otherValue) return isRTL(placeholder) ? "rtl" : "ltr";
    return "auto";
  }, [languageCode, question.otherOptionPlaceholder, otherValue]);

  return (
    <ScrollableContainer>
      <form
        key={question.id}
        onSubmit={(e) => {
          e.preventDefault();
          const newValue = value.filter((item) => {
            return getChoicesWithoutOtherLabels().includes(item) || item === otherValue;
          }); // filter out all those values which are either in getChoicesWithoutOtherLabels() (i.e. selected by checkbox) or the latest entered otherValue
          if (otherValue && otherSelected && !newValue.includes(otherValue)) newValue.push(otherValue);
          onChange({ [question.id]: newValue });
          const updatedTtcObj = getUpdatedTtc(ttc, question.id, performance.now() - startTime);
          setTtc(updatedTtcObj);
          onSubmit({ [question.id]: newValue }, updatedTtcObj);
        }}
        className="fb-w-full">
        {isMediaAvailable ? <QuestionMedia imgUrl={question.imageUrl} videoUrl={question.videoUrl} /> : null}
        <Headline
          headline={getLocalizedValue(question.headline, languageCode)}
          questionId={question.id}
          required={question.required}
        />
        <Subheader
          subheader={question.subheader ? getLocalizedValue(question.subheader, languageCode) : ""}
          questionId={question.id}
        />
        <div className="fb-mt-4">
          <fieldset>
            <legend className="fb-sr-only">Options</legend>
            <div className="fb-bg-survey-bg fb-relative fb-space-y-2" ref={choicesContainerRef}>
              {questionChoices.map((choice, idx) => {
                if (!choice || choice.id === "other") return;
                return (
                  <label
                    key={choice.id}
                    tabIndex={isCurrent ? 0 : -1}
                    className={cn(
                      value.includes(getLocalizedValue(choice.label, languageCode))
                        ? "fb-border-brand fb-bg-input-bg-selected fb-z-10"
                        : "fb-border-border fb-bg-input-bg",
                      "fb-text-heading focus-within:fb-border-brand hover:fb-bg-input-bg-selected focus:fb-bg-input-bg-selected fb-rounded-custom fb-relative fb-flex fb-cursor-pointer fb-flex-col fb-border fb-p-4 focus:fb-outline-none"
                    )}
                    onKeyDown={(e) => {
                      // Accessibility: if spacebar was pressed pass this down to the input
                      if (e.key === " ") {
                        e.preventDefault();
                        document.getElementById(choice.id)?.click();
                        document.getElementById(choice.id)?.focus();
                      }
                    }}
                    autoFocus={idx === 0 && autoFocusEnabled}>
                    <span className="fb-flex fb-items-center fb-text-sm" dir="auto">
                      <input
                        type="checkbox"
                        id={choice.id}
                        name={question.id}
                        tabIndex={-1}
                        value={getLocalizedValue(choice.label, languageCode)}
                        className="fb-border-brand fb-text-brand fb-h-4 fb-w-4 fb-flex-shrink-0 fb-border focus:fb-ring-0 focus:fb-ring-offset-0"
                        aria-labelledby={`${choice.id}-label`}
                        onChange={(e) => {
                          if ((e.target as HTMLInputElement).checked) {
                            addItem(getLocalizedValue(choice.label, languageCode));
                          } else {
                            removeItem(getLocalizedValue(choice.label, languageCode));
                          }
                        }}
                        checked={
                          Array.isArray(value) &&
                          value.includes(getLocalizedValue(choice.label, languageCode))
                        }
                        required={getIsRequired()}
                      />
                      <span id={`${choice.id}-label`} className="fb-ml-3 fb-mr-3 fb-grow fb-font-medium">
                        {getLocalizedValue(choice.label, languageCode)}
                      </span>
                    </span>
                  </label>
                );
              })}
              {otherOption ? (
                <label
                  tabIndex={isCurrent ? 0 : -1}
                  className={cn(
                    otherSelected ? "fb-border-brand fb-bg-input-bg-selected fb-z-10" : "fb-border-border",
                    "fb-text-heading focus-within:fb-border-brand fb-bg-input-bg focus-within:fb-bg-input-bg-selected hover:fb-bg-input-bg-selected fb-rounded-custom fb-relative fb-flex fb-cursor-pointer fb-flex-col fb-border fb-p-4 focus:fb-outline-none"
                  )}
                  onKeyDown={(e) => {
                    // Accessibility: if spacebar was pressed pass this down to the input
                    if (e.key === " ") {
                      if (otherSelected) return;
                      document.getElementById(otherOption.id)?.click();
                      document.getElementById(otherOption.id)?.focus();
                    }
                  }}>
                  <span className="fb-flex fb-items-center fb-text-sm" dir="auto">
                    <input
                      type="checkbox"
                      tabIndex={-1}
                      id={otherOption.id}
                      name={question.id}
                      value={getLocalizedValue(otherOption.label, languageCode)}
                      className="fb-border-brand fb-text-brand fb-h-4 fb-w-4 fb-flex-shrink-0 fb-border focus:fb-ring-0 focus:fb-ring-offset-0"
                      aria-labelledby={`${otherOption.id}-label`}
                      onChange={() => {
                        if (otherSelected) {
                          setOtherValue("");
                          onChange({
                            [question.id]: value.filter((item) => {
                              return getChoicesWithoutOtherLabels().includes(item);
                            }),
                          });
                        }
                        setOtherSelected(!otherSelected);
                      }}
                      checked={otherSelected}
                    />
                    <span id={`${otherOption.id}-label`} className="fb-ml-3 fb-mr-3 fb-grow fb-font-medium">
                      {getLocalizedValue(otherOption.label, languageCode)}
                    </span>
                  </span>
                  {otherSelected ? (
                    <input
                      ref={otherSpecify}
                      dir={otherOptionDir}
                      id={`${otherOption.id}-label`}
                      maxLength={250}
                      name={question.id}
                      tabIndex={isCurrent ? 0 : -1}
                      value={otherValue}
                      pattern=".*\S+.*"
                      onChange={(e) => {
                        setOtherValue(e.currentTarget.value);
                      }}
                      className="placeholder:fb-text-placeholder fb-border-border fb-bg-survey-bg fb-text-heading focus:fb-ring-focus fb-rounded-custom fb-mt-3 fb-flex fb-h-10 fb-w-full fb-border fb-px-3 fb-py-2 fb-text-sm focus:fb-outline-none focus:fb-ring-2 focus:fb-ring-offset-2 disabled:fb-cursor-not-allowed disabled:fb-opacity-50"
                      placeholder={
                        getLocalizedValue(question.otherOptionPlaceholder, languageCode).length > 0
                          ? getLocalizedValue(question.otherOptionPlaceholder, languageCode)
                          : "Please specify"
                      }
                      required={question.required}
                      aria-labelledby={`${otherOption.id}-label`}
                      onBlur={() => {
                        const newValue = value.filter((item) => {
                          return getChoicesWithoutOtherLabels().includes(item);
                        });
                        if (otherValue && otherSelected) {
                          newValue.push(otherValue);
                          onChange({ [question.id]: newValue });
                        }
                      }}
                    />
                  ) : null}
                </label>
              ) : null}
            </div>
          </fieldset>
        </div>
        <div className="fb-flex fb-flex-row-reverse fb-w-full fb-justify-between fb-pt-4">
          <SubmitButton
            tabIndex={isCurrent ? 0 : -1}
            buttonLabel={getLocalizedValue(question.buttonLabel, languageCode)}
            isLastQuestion={isLastQuestion}
          />
          {!isFirstQuestion && !isBackButtonHidden && (
            <BackButton
              tabIndex={isCurrent ? 0 : -1}
              backButtonLabel={getLocalizedValue(question.backButtonLabel, languageCode)}
              onClick={() => {
                const updatedTtcObj = getUpdatedTtc(ttc, question.id, performance.now() - startTime);
                setTtc(updatedTtcObj);
                onBack();
              }}
            />
          )}
        </div>
      </form>
    </ScrollableContainer>
  );
}
