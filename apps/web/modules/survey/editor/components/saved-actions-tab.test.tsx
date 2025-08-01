import { ActionClass } from "@prisma/client";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { TSurvey } from "@formbricks/types/surveys/types";
import { SavedActionsTab } from "./saved-actions-tab";

describe("SavedActionsTab", () => {
  afterEach(() => {
    cleanup();
  });

  test("categorizes actionClasses into codeActions and noCodeActions and displays them under the correct headings", () => {
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "No Code Action",
        description: "Description for No Code Action",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [{ rule: "exactMatch", value: "https://example.com" }],
          elementSelector: {
            cssSelector: ".button",
          },
        },
      } as unknown as ActionClass,
      {
        id: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Code Action",
        description: "Description for Code Action",
        type: "code",
        environmentId: "env1",
        key: "code-action-key",
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    // Check if the headings are present
    expect(screen.getByText("common.no_code")).toBeInTheDocument();
    expect(screen.getByText("common.code")).toBeInTheDocument();

    // Check if the actions are rendered under the correct headings
    expect(screen.getByText("No Code Action")).toBeInTheDocument();
    expect(screen.getByText("Code Action")).toBeInTheDocument();
  });

  test("updates localSurvey and closes the modal when an action is clicked", async () => {
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Action One",
        description: "Description for Action One",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [{ rule: "contains", value: "/dashboard" }],
          elementSelector: {
            cssSelector: ".button",
          },
        },
      } as unknown as ActionClass,
    ];

    const initialSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={initialSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    const actionElement = screen.getByText("Action One");
    await userEvent.click(actionElement);

    expect(setLocalSurvey).toHaveBeenCalledTimes(1);
    // Check that the function passed to setLocalSurvey returns the expected object
    const updateFunction = setLocalSurvey.mock.calls[0][0];
    const result = updateFunction(initialSurvey);
    expect(result).toEqual(
      expect.objectContaining({
        ...initialSurvey,
        triggers: expect.arrayContaining([
          expect.objectContaining({
            actionClass: actionClasses[0],
          }),
        ]),
      })
    );
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  test("displays action classes with regex URL filters correctly", () => {
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Regex Action",
        description: "Action with regex URL filter",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "pageView",
          urlFilters: [{ rule: "matchesRegex", value: "user/\\d+" }],
        },
      } as unknown as ActionClass,
      {
        id: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Multiple Filters Action",
        description: "Action with multiple URL filters including regex",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [
            { rule: "startsWith", value: "https://app.example.com" },
            { rule: "matchesRegex", value: "dashboard.*\\?tab=\\w+" },
          ],
          elementSelector: {
            cssSelector: ".nav-button",
          },
        },
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    // Check if actions with regex filters are displayed
    expect(screen.getByText("Regex Action")).toBeInTheDocument();
    expect(screen.getByText("Multiple Filters Action")).toBeInTheDocument();

    // Verify the ActionClassInfo component displays the URL filters
    expect(screen.getByText("Action with regex URL filter")).toBeInTheDocument();
    expect(screen.getByText("Action with multiple URL filters including regex")).toBeInTheDocument();
  });

  test("displays 'No saved actions found' message when no actions are available", () => {
    const actionClasses: ActionClass[] = [];
    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;
    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    const noActionsMessage = screen.getByText("No saved actions found");
    expect(noActionsMessage).toBeInTheDocument();
  });

  test("excludes actions that are already used as triggers in the survey", () => {
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Available Action",
        description: "This action is available",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [{ rule: "exactMatch", value: "https://example.com" }],
          elementSelector: {
            cssSelector: ".button",
          },
        },
      } as unknown as ActionClass,
      {
        id: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Used Action",
        description: "This action is already used",
        type: "code",
        environmentId: "env1",
        key: "used-action-key",
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [
        { actionClass: actionClasses[1] }, // "Used Action" is already a trigger
      ],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    // Available action should be displayed
    expect(screen.getByText("Available Action")).toBeInTheDocument();

    // Used action should not be displayed
    expect(screen.queryByText("Used Action")).not.toBeInTheDocument();
  });

  test("filters actionClasses correctly with special characters, diacritics, and non-Latin scripts", async () => {
    const user = userEvent.setup();
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Action with éàçüö",
        description: "Description for Action One",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [{ rule: "contains", value: "special" }],
          elementSelector: {
            cssSelector: ".special",
          },
        },
      } as unknown as ActionClass,
      {
        id: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Действие Два",
        description: "Description for Action Two",
        type: "code",
        environmentId: "env1",
        key: "cyrillic-action",
      } as unknown as ActionClass,
      {
        id: "3",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Action with !@#$",
        description: "Description for Another Action",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "pageView",
          urlFilters: [{ rule: "matchesRegex", value: "special.*symbols" }],
        },
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search actions");

    // Simulate user typing "éàçüö" in the search field
    await user.type(searchInput, "éàçüö");

    // Check if "Action with éàçüö" is present
    expect(screen.getByText("Action with éàçüö")).toBeInTheDocument();

    // Check if other actions are not present
    expect(screen.queryByText("Действие Два")).toBeNull();
    expect(screen.queryByText("Action with !@#$")).toBeNull();
  });

  test("filters actionClasses based on user input in the search field and updates the displayed actions", async () => {
    const user = userEvent.setup();
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Action One",
        description: "Description for Action One",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [{ rule: "exactMatch", value: "https://example.com" }],
          elementSelector: {
            cssSelector: ".button-one",
          },
        },
      } as unknown as ActionClass,
      {
        id: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Action Two",
        description: "Description for Action Two",
        type: "code",
        environmentId: "env1",
        key: "action-two-key",
      } as unknown as ActionClass,
      {
        id: "3",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Another Action",
        description: "Description for Another Action",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "pageView",
          urlFilters: [{ rule: "matchesRegex", value: "another.*page" }],
        },
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search actions");

    // Simulate user typing "One" in the search field
    await user.type(searchInput, "One");

    // Check if "Action One" is present
    expect(screen.getByText("Action One")).toBeInTheDocument();

    // Check if "Action Two" and "Another Action" are not present
    expect(screen.queryByText("Action Two")).toBeNull();
    expect(screen.queryByText("Another Action")).toBeNull();

    // Clear the search input
    await user.clear(searchInput);

    // Simulate user typing "Two" in the search field
    await user.type(searchInput, "Two");

    // Check if "Action Two" is present
    expect(screen.getByText("Action Two")).toBeInTheDocument();

    // Check if "Action One" and "Another Action" are not present
    expect(screen.queryByText("Action One")).toBeNull();
    expect(screen.queryByText("Another Action")).toBeNull();

    // Clear the search input
    await user.clear(searchInput);

    // Simulate user typing "Another" in the search field
    await user.type(searchInput, "Another");

    // Check if "Another Action" is present
    expect(screen.getByText("Another Action")).toBeInTheDocument();

    // Check if "Action One" and "Action Two" are not present
    expect(screen.queryByText("Action One")).toBeNull();
    expect(screen.queryByText("Action Two")).toBeNull();
  });

  test("handles action classes with mixed URL filter rule types including regex", async () => {
    const user = userEvent.setup();
    const actionClasses: ActionClass[] = [
      {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Mixed Rules Action",
        description: "Action with multiple rule types",
        type: "noCode",
        environmentId: "env1",
        noCodeConfig: {
          type: "click",
          urlFilters: [
            { rule: "startsWith", value: "https://app" },
            { rule: "contains", value: "/dashboard" },
            { rule: "matchesRegex", value: "\\?section=\\w+" },
            { rule: "endsWith", value: "#main" },
          ],
          elementSelector: {
            cssSelector: ".complex-button",
          },
        },
      } as unknown as ActionClass,
    ];

    const localSurvey: TSurvey = {
      id: "survey1",
      createdAt: new Date(),
      updatedAt: new Date(),
      name: "Test Survey",
      questions: [],
      triggers: [],
      environmentId: "env1",
      status: "draft",
    } as any;

    const setLocalSurvey = vi.fn();
    const setOpen = vi.fn();

    render(
      <SavedActionsTab
        actionClasses={actionClasses}
        localSurvey={localSurvey}
        setLocalSurvey={setLocalSurvey}
        setOpen={setOpen}
      />
    );

    // Verify the action is displayed
    expect(screen.getByText("Mixed Rules Action")).toBeInTheDocument();
    expect(screen.getByText("Action with multiple rule types")).toBeInTheDocument();

    // Click on the action to add it as a trigger
    const actionElement = screen.getByText("Mixed Rules Action");
    await user.click(actionElement);

    // Verify the action was added to triggers
    expect(setLocalSurvey).toHaveBeenCalledTimes(1);
    const updateFunction = setLocalSurvey.mock.calls[0][0];
    const result = updateFunction(localSurvey);
    expect(result.triggers).toHaveLength(1);
    expect(result.triggers[0].actionClass).toEqual(actionClasses[0]);
  });
});
