export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export const FEEDBACK_CATEGORIES = [
  {
    value: "bug",
    label: "Bug",
    description: "Something is not working as expected.",
  },
  {
    value: "usability",
    label: "Usability",
    description: "Something could be clearer or easier to use.",
  },
  {
    value: "idea",
    label: "Idea",
    description: "Share an idea for making Sync better.",
  },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === "string" &&
    FEEDBACK_CATEGORIES.some((category) => category.value === value)
  );
}

export function feedbackCategoryLabel(category: string): string {
  return (
    FEEDBACK_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}
