// utils.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockProjectId, mockSurveyId } from "@/lib/common/tests/__mocks__/config.mock";
import {
  checkUrlMatch,
  diffInDays,
  evaluateNoCodeConfigClick,
  filterSurveys,
  getDefaultLanguageCode,
  getIsDebug,
  getLanguageCode,
  getSecureRandom,
  getStyling,
  handleHiddenFields,
  handleUrlFilters,
  isNowExpired,
  shouldDisplayBasedOnPercentage,
  wrapThrows,
  wrapThrowsAsync,
} from "@/lib/common/utils";
import type {
  TEnvironmentState,
  TEnvironmentStateActionClass,
  TEnvironmentStateProject,
  TEnvironmentStateSurvey,
  TSurveyStyling,
  TUserState,
} from "@/types/config";
import { type TActionClassNoCodeConfig, type TActionClassPageUrlRule } from "@/types/survey";

const mockSurveyId1 = "e3kxlpnzmdp84op9qzxl9olj";
const mockSurveyId2 = "qo9rwjmms42hoy3k85fp8vgu";
const mockSegmentId1 = "p6yrnz3s2tvoe5r0l28unq7k";
const mockSegmentId2 = "wz43zrxeddhb1uo9cicustar";

describe("utils.ts", () => {
  // ---------------------------------------------------------------------------------
  // diffInDays
  // ---------------------------------------------------------------------------------
  describe("diffInDays()", () => {
    test("calculates correct day difference", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-05");
      expect(diffInDays(date1, date2)).toBe(4); // four days apart
    });

    test("handles negative differences (abs)", () => {
      const date1 = new Date("2023-01-10");
      const date2 = new Date("2023-01-05");
      expect(diffInDays(date1, date2)).toBe(5);
    });

    test("0 if same day", () => {
      const date = new Date("2023-01-01");
      expect(diffInDays(date, date)).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------
  // wrapThrows
  // ---------------------------------------------------------------------------------
  describe("wrapThrows()", () => {
    test("returns ok on success", () => {
      const fn = vi.fn(() => "success");
      const wrapped = wrapThrows(fn);
      const result = wrapped();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("success");
      }
    });

    test("returns err on error", () => {
      const fn = vi.fn(() => {
        throw new Error("Something broke");
      });
      const wrapped = wrapThrows(fn);
      const result = wrapped();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("Something broke");
      }
    });

    test("passes arguments to wrapped function", () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      const wrapped = wrapThrows(fn);
      const result = wrapped(2, 3);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(5);
      }
      expect(fn).toHaveBeenCalledWith(2, 3);
    });

    test("handles async function", () => {
      const fn = vi.fn(async () => {
        await new Promise((r) => {
          setTimeout(r, 10);
        });
        return "async success";
      });
      const wrapped = wrapThrows(fn);
      const result = wrapped();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeInstanceOf(Promise);
      }
    });
  });

  // ---------------------------------------------------------------------------------
  // wrapThrowsAsync
  // ---------------------------------------------------------------------------------
  describe("wrapThrowsAsync()", () => {
    test("returns ok on success", async () => {
      const fn = vi.fn(async (x: number) => {
        await new Promise((r) => {
          setTimeout(r, 10);
        });
        return x * 2;
      });

      const wrapped = wrapThrowsAsync(fn);

      const result = await wrapped(5);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(10);
      }
    });

    test("returns err on error", async () => {
      const fn = vi.fn(async () => {
        await new Promise((r) => {
          setTimeout(r, 10);
        });
        throw new Error("Something broke");
      });
      const wrapped = wrapThrowsAsync(fn);

      const result = await wrapped();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("Something broke");
      }
    });
  });

  // ---------------------------------------------------------------------------------
  // filterSurveys
  // ---------------------------------------------------------------------------------
  describe("filterSurveys()", () => {
    // We'll create a minimal environment state
    let environment: TEnvironmentState;
    let user: TUserState;
    const baseSurvey: Partial<TEnvironmentStateSurvey> = {
      id: mockSurveyId,
      displayOption: "displayOnce",
      displayLimit: 1,
      recontactDays: null,
      languages: [],
    };

    beforeEach(() => {
      environment = {
        expiresAt: new Date(),
        data: {
          project: {
            id: mockProjectId,
            recontactDays: 7, // fallback if survey doesn't have it
            clickOutsideClose: false,
            darkOverlay: false,
            placement: "bottomRight",
            inAppSurveyBranding: true,
            styling: { allowStyleOverwrite: false },
          } as TEnvironmentStateProject,
          surveys: [],
          actionClasses: [],
        },
      };
      user = {
        expiresAt: null,
        data: {
          userId: null,
          contactId: null,
          segments: [],
          displays: [],
          responses: [],
          lastDisplayAt: null,
        },
      };
    });

    test("returns no surveys if user has no segments and userId is set", () => {
      user.data.userId = "user_abc";
      // environment has a single survey
      environment.data.surveys = [
        { ...baseSurvey, id: mockSurveyId1, segment: { id: mockSegmentId1 } } as TEnvironmentStateSurvey,
      ];

      const result = filterSurveys(environment, user);
      expect(result).toEqual([]); // no segments => none pass
    });

    test("returns surveys if user has no userId but displayOnce and no displays yet", () => {
      // userId is null => it won't segment filter
      environment.data.surveys = [
        { ...baseSurvey, id: mockSurveyId1, displayOption: "displayOnce" } as TEnvironmentStateSurvey,
      ];

      const result = filterSurveys(environment, user);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSurveyId1);
    });

    test("skips surveys that already displayed if displayOnce is used", () => {
      environment.data.surveys = [
        { ...baseSurvey, id: mockSurveyId1, displayOption: "displayOnce" } as TEnvironmentStateSurvey,
      ];
      user.data.displays = [{ surveyId: mockSurveyId1, createdAt: new Date() }];

      const result = filterSurveys(environment, user);
      expect(result).toEqual([]);
    });

    test("skips surveys if user responded to them and displayOption=displayMultiple", () => {
      environment.data.surveys = [
        { ...baseSurvey, id: mockSurveyId1, displayOption: "displayMultiple" } as TEnvironmentStateSurvey,
      ];
      user.data.responses = [mockSurveyId1];

      const result = filterSurveys(environment, user);
      expect(result).toEqual([]);
    });

    test("handles displaySome logic with displayLimit", () => {
      environment.data.surveys = [
        {
          ...baseSurvey,
          id: mockSurveyId1,
          displayOption: "displaySome",
          displayLimit: 2,
        } as TEnvironmentStateSurvey,
      ];
      // user has 1 display of s1
      user.data.displays = [{ surveyId: mockSurveyId1, createdAt: new Date() }];

      // No responses => so it's still allowed
      const result = filterSurveys(environment, user);
      expect(result).toHaveLength(1);
    });

    test("filters out surveys if recontactDays not met", () => {
      // Suppose survey uses project fallback (7 days)
      environment.data.surveys = [
        { ...baseSurvey, id: mockSurveyId1, displayOption: "displayOnce" } as TEnvironmentStateSurvey,
      ];
      // user last displayAt is only 3 days ago
      user.data.lastDisplayAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const result = filterSurveys(environment, user);
      expect(result).toHaveLength(0);
    });

    test("passes surveys if enough days have passed since lastDisplayAt", () => {
      // user last displayAt is 8 days ago
      user.data.lastDisplayAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      environment.data.surveys = [
        {
          ...baseSurvey,
          id: mockSurveyId1,
          displayOption: "respondMultiple",
          recontactDays: null,
        } as TEnvironmentStateSurvey,
      ];
      const result = filterSurveys(environment, user);
      expect(result).toHaveLength(1);
    });

    test("filters by segment if userId is set and user has segments", () => {
      user.data.userId = "user_abc";
      user.data.segments = [mockSegmentId1];
      environment.data.surveys = [
        {
          ...baseSurvey,
          id: mockSurveyId1,
          segment: { id: mockSegmentId1 },
          displayOption: "respondMultiple",
        } as TEnvironmentStateSurvey,
        {
          ...baseSurvey,
          id: mockSurveyId2,
          segment: { id: mockSegmentId2 },
          displayOption: "respondMultiple",
        } as TEnvironmentStateSurvey,
      ];

      const result = filterSurveys(environment, user);
      // only the one that matches user's segment
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockSurveyId1);
    });
  });

  // ---------------------------------------------------------------------------------
  // getStyling
  // ---------------------------------------------------------------------------------
  describe("getStyling()", () => {
    test("returns project styling if allowStyleOverwrite=false", () => {
      const project = {
        id: "p1",
        styling: { allowStyleOverwrite: false, brandColor: { light: "#fff" } },
      } as TEnvironmentStateProject;
      const survey = {
        styling: {
          overwriteThemeStyling: true,
          brandColor: { light: "#000" },
        } as TSurveyStyling,
      } as TEnvironmentStateSurvey;

      const result = getStyling(project, survey);
      // should get project styling
      expect(result).toEqual(project.styling);
    });

    test("returns project styling if allowStyleOverwrite=true but survey overwriteThemeStyling=false", () => {
      const project = {
        id: "p1",
        styling: { allowStyleOverwrite: true, brandColor: { light: "#fff" } },
      } as TEnvironmentStateProject;
      const survey = {
        styling: {
          overwriteThemeStyling: false,
          brandColor: { light: "#000" },
        } as TSurveyStyling,
      } as TEnvironmentStateSurvey;

      const result = getStyling(project, survey);
      // should get project styling still
      expect(result).toEqual(project.styling);
    });

    test("returns survey styling if allowStyleOverwrite=true and survey overwriteThemeStyling=true", () => {
      const project = {
        id: "p1",
        styling: { allowStyleOverwrite: true, brandColor: { light: "#fff" } },
      } as TEnvironmentStateProject;
      const survey = {
        styling: {
          overwriteThemeStyling: true,
          brandColor: { light: "#000" },
        } as TSurveyStyling,
      } as TEnvironmentStateSurvey;

      const result = getStyling(project, survey);
      expect(result).toEqual(survey.styling);
    });
  });

  // ---------------------------------------------------------------------------------
  // getDefaultLanguageCode
  // ---------------------------------------------------------------------------------
  describe("getDefaultLanguageCode()", () => {
    test("returns code of the language if it is flagged default", () => {
      const survey = {
        languages: [
          {
            language: { code: "en" },
            default: false,
            enabled: true,
          },
          {
            language: { code: "fr" },
            default: true,
            enabled: true,
          },
        ],
      } as unknown as TEnvironmentStateSurvey;
      expect(getDefaultLanguageCode(survey)).toBe("fr");
    });

    test("returns undefined if no default language found", () => {
      const survey = {
        languages: [
          { language: { code: "en" }, default: false, enabled: true },
          { language: { code: "fr" }, default: false, enabled: true },
        ],
      } as unknown as TEnvironmentStateSurvey;
      expect(getDefaultLanguageCode(survey)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------------
  // getLanguageCode
  // ---------------------------------------------------------------------------------
  describe("getLanguageCode()", () => {
    test("returns 'default' if no language param is passed", () => {
      const survey = {
        languages: [{ language: { code: "en" }, default: true, enabled: true }],
      } as unknown as TEnvironmentStateSurvey;
      const code = getLanguageCode(survey, undefined);
      expect(code).toBe("default");
    });

    test("returns 'default' if the chosen language is the default one", () => {
      const survey = {
        languages: [
          { language: { code: "en" }, default: true, enabled: true },
          { language: { code: "fr" }, default: false, enabled: true },
        ],
      } as unknown as TEnvironmentStateSurvey;
      const code = getLanguageCode(survey, "en");
      expect(code).toBe("default");
    });

    test("returns undefined if language not found or disabled", () => {
      const survey = {
        languages: [
          { language: { code: "en" }, default: true, enabled: true },
          { language: { code: "fr" }, default: false, enabled: false },
        ],
      } as unknown as TEnvironmentStateSurvey;
      const code = getLanguageCode(survey, "fr");
      expect(code).toBeUndefined();
    });

    test("returns the language code if found and enabled", () => {
      const survey = {
        languages: [
          { language: { code: "en", alias: "English" }, default: true, enabled: true },
          { language: { code: "fr", alias: "fr-FR" }, default: false, enabled: true },
        ],
      } as unknown as TEnvironmentStateSurvey;
      expect(getLanguageCode(survey, "fr")).toBe("fr");
      expect(getLanguageCode(survey, "fr-FR")).toBe("fr");
    });
  });

  // ---------------------------------------------------------------------------------
  // shouldDisplayBasedOnPercentage
  // ---------------------------------------------------------------------------------
  describe("shouldDisplayBasedOnPercentage()", () => {
    test("returns true if random number <= displayPercentage", () => {
      const mockGetRandomValues = vi
        .spyOn(crypto, "getRandomValues")
        .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
          if (array instanceof Uint32Array) {
            array[0] = Math.floor((20 / 100) * 2 ** 32);
            return array;
          }
          return array;
        });
      expect(shouldDisplayBasedOnPercentage(30)).toBe(true);

      mockGetRandomValues.mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        if (array instanceof Uint32Array) {
          array[0] = Math.floor((80 / 100) * 2 ** 32);
          return array;
        }
        return array;
      });
      expect(shouldDisplayBasedOnPercentage(30)).toBe(false);

      mockGetRandomValues.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------------
  // isNowExpired
  // ---------------------------------------------------------------------------------
  describe("isNowExpired()", () => {
    test("returns true if expiration date is in the past", () => {
      const expirationDate = new Date(Date.now() - 1000);
      expect(isNowExpired(expirationDate)).toBe(true);
    });

    test("returns false if expiration date is in the future", () => {
      const expirationDate = new Date(Date.now() + 1000);
      expect(isNowExpired(expirationDate)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // checkUrlMatch
  // ---------------------------------------------------------------------------------
  describe("checkUrlMatch()", () => {
    test("returns true if url matches", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/path";
      const pageUrlRule = "exactMatch" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/other";
      const pageUrlRule = "exactMatch" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });

    test("returns true if url matches with startsWith rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com";
      const pageUrlRule = "startsWith" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match with startsWith rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/other";
      const pageUrlRule = "startsWith" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });

    test("returns true if url matches with endsWith rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "path";
      const pageUrlRule = "endsWith" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match with endsWith rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "other";
      const pageUrlRule = "endsWith" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });

    test("returns true if url matches with contains rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "path";
      const pageUrlRule = "contains" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match with contains rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "other";
      const pageUrlRule = "contains" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });

    test("returns true if url matches with notMatch rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/other";
      const pageUrlRule = "notMatch" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match with notMatch rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/path";
      const pageUrlRule = "notMatch" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });

    test("returns true if url matches with notContains rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "https://example.com/other";
      const pageUrlRule = "notContains" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(true);
    });

    test("returns false if url does not match with notContains rule", () => {
      const url = "https://example.com/path";
      const pageUrlValue = "path";
      const pageUrlRule = "notContains" as unknown as TActionClassPageUrlRule;

      expect(checkUrlMatch(url, pageUrlValue, pageUrlRule)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // handleUrlFilters
  // ---------------------------------------------------------------------------------
  describe("handleUrlFilters()", () => {
    test("returns true if url matches with urlFilters", () => {
      const urlFilters = [
        {
          value: "https://example.com/path",
          rule: "exactMatch" as unknown as TActionClassPageUrlRule,
        },
      ];

      // mock window.location.href
      vi.stubGlobal("window", {
        location: {
          href: "https://example.com/path",
        },
      });

      const result = handleUrlFilters(urlFilters);
      expect(result).toBe(true);
    });

    test("returns true if urlFilters is empty", () => {
      const urlFilters: TActionClassNoCodeConfig["urlFilters"] = [];

      const result = handleUrlFilters(urlFilters);
      expect(result).toBe(true);
    });

    test("returns false if no urlFilters match", () => {
      const urlFilters = [
        {
          value: "https://example.com/other",
          rule: "exactMatch" as unknown as TActionClassPageUrlRule,
        },
      ];

      // mock window.location.href
      vi.stubGlobal("window", {
        location: {
          href: "https://example.com/path",
        },
      });

      const result = handleUrlFilters(urlFilters);
      expect(result).toBe(false);
    });

    test("returns true if any urlFilter matches", () => {
      const urlFilters = [
        {
          value: "https://example.com/other",
          rule: "exactMatch" as unknown as TActionClassPageUrlRule,
        },
        {
          value: "path",
          rule: "contains" as unknown as TActionClassPageUrlRule,
        },
      ];

      // mock window.location.href
      vi.stubGlobal("window", {
        location: {
          href: "https://example.com/path",
        },
      });

      const result = handleUrlFilters(urlFilters);
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------
  // evaluateNoCodeConfigClick
  // ---------------------------------------------------------------------------------
  describe("evaluateNoCodeConfigClick()", () => {
    test("returns false if type is not click", () => {
      const targetElement = document.createElement("div");

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "pageView",
          urlFilters: [],
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(false);
    });

    test("returns false if innerHtml does not match", () => {
      const targetElement = document.createElement("div");
      targetElement.innerHTML = "Test";

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [],
          elementSelector: {
            innerHtml: "Testing",
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(false);
    });

    test("returns true if cssSelector matches", () => {
      const targetElement = document.createElement("div");
      const cssSelector = ".test";
      targetElement.className = "test";

      targetElement.matches = vi.fn(() => true);

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [],
          elementSelector: {
            cssSelector,
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(true);
    });

    test("returns false if cssSelector does not match", () => {
      const targetElement = document.createElement("div");
      const cssSelector = ".test";
      targetElement.className = "other";

      targetElement.matches = vi.fn(() => false);

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [],
          elementSelector: {
            cssSelector,
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(false);
    });

    test("returns false if neither innerHtml nor cssSelector is provided", () => {
      const targetElement = document.createElement("div");

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [],
          elementSelector: {},
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(false);
    });

    test("returns false if urlFilters do not match", () => {
      const targetElement = document.createElement("div");
      targetElement.innerHTML = "Test";

      // mock window.location.href
      vi.stubGlobal("window", {
        location: {
          href: "https://example.com/path",
        },
      });

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [
            {
              value: "https://example.com/other",
              rule: "exactMatch" as unknown as TActionClassPageUrlRule,
            },
          ],
          elementSelector: {
            innerHtml: "Test",
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(false);
    });

    test("returns true if both innerHtml and urlFilters match", () => {
      const targetElement = document.createElement("div");
      targetElement.innerHTML = "Test";

      // mock window.location.href
      vi.stubGlobal("window", {
        location: {
          href: "https://example.com/path",
        },
      });

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [
            {
              value: "path",
              rule: "contains" as unknown as TActionClassPageUrlRule,
            },
          ],
          elementSelector: {
            innerHtml: "Test",
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(true);
    });

    test("handles multiple cssSelectors correctly", () => {
      const targetElement = document.createElement("div");
      targetElement.className = "test other";

      targetElement.matches = vi.fn((selector) => {
        return selector === ".test" || selector === ".other";
      });

      const action: TEnvironmentStateActionClass = {
        id: "clabc123abc",
        name: "Test Action",
        type: "noCode",
        key: null,
        noCodeConfig: {
          type: "click",
          urlFilters: [],
          elementSelector: {
            cssSelector: ".test .other",
          },
        },
      };

      const result = evaluateNoCodeConfigClick(targetElement, action);
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------
  // getIsDebug
  // ---------------------------------------------------------------------------------
  describe("getIsDebug()", () => {
    beforeEach(() => {
      // Reset window.location.search before each test
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });
    });

    test("returns true if debug parameter is set", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?formbricksDebug=true" },
        writable: true,
      });
      expect(getIsDebug()).toBe(true);
    });

    test("returns false if debug parameter is not set", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?otherParam=value" },
        writable: true,
      });
      expect(getIsDebug()).toBe(false);
    });

    test("returns false if search string is empty", () => {
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });
      expect(getIsDebug()).toBe(false);
    });

    test("returns false if search string is just '?'", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?" },
        writable: true,
      });
      expect(getIsDebug()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // handleHiddenFields
  // ---------------------------------------------------------------------------------
  describe("handleHiddenFields()", () => {
    test("returns empty object when hidden fields are not enabled", () => {
      const hiddenFieldsConfig = {
        enabled: false,
        fieldIds: ["field1", "field2"],
      };
      const hiddenFields = {
        field1: "value1",
        field2: "value2",
      };

      const result = handleHiddenFields(hiddenFieldsConfig, hiddenFields);
      expect(result).toEqual({});
    });

    test("returns empty object when no hidden fields are provided", () => {
      const hiddenFieldsConfig = {
        enabled: true,
        fieldIds: ["field1", "field2"],
      };

      const result = handleHiddenFields(hiddenFieldsConfig);
      expect(result).toEqual({});
    });

    test("filters and returns only valid hidden fields", () => {
      const hiddenFieldsConfig = {
        enabled: true,
        fieldIds: ["field1", "field2"],
      };
      const hiddenFields = {
        field1: "value1",
        field2: "value2",
        field3: "value3", // This should be filtered out
      };

      const result = handleHiddenFields(hiddenFieldsConfig, hiddenFields);
      expect(result).toEqual({
        field1: "value1",
        field2: "value2",
      });
    });

    test("handles empty fieldIds array", () => {
      const hiddenFieldsConfig = {
        enabled: true,
        fieldIds: [],
      };
      const hiddenFields = {
        field1: "value1",
        field2: "value2",
      };

      const result = handleHiddenFields(hiddenFieldsConfig, hiddenFields);
      expect(result).toEqual({});
    });

    test("handles null fieldIds", () => {
      const hiddenFieldsConfig = {
        enabled: true,
        fieldIds: undefined,
      };
      const hiddenFields = {
        field1: "value1",
        field2: "value2",
      };

      const result = handleHiddenFields(hiddenFieldsConfig, hiddenFields);
      expect(result).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------------
  // getSecureRandom
  // ---------------------------------------------------------------------------------
  describe("getSecureRandom()", () => {
    test("returns a number between 0 and 1", () => {
      const result = getSecureRandom();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    test("returns different values on subsequent calls", () => {
      const result1 = getSecureRandom();
      const result2 = getSecureRandom();
      expect(result1).not.toBe(result2);
    });

    test("uses crypto.getRandomValues", () => {
      const mockGetRandomValues = vi.spyOn(crypto, "getRandomValues");
      getSecureRandom();
      expect(mockGetRandomValues).toHaveBeenCalled();
      mockGetRandomValues.mockRestore();
    });
  });
});
