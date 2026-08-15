type FlattenedErrors = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export function unwrapAction<T>(result: {
  data?: T;
  serverError?: string;
  validationErrors?: FlattenedErrors;
}): T {
  if (result.validationErrors) {
    const formMessages = result.validationErrors.formErrors ?? [];
    const fieldMessages = Object.values(
      result.validationErrors.fieldErrors ?? {},
    )
      .flat()
      .filter((message): message is string => Boolean(message));
    throw new Error(formMessages[0] ?? fieldMessages[0] ?? "Invalid input");
  }

  if (result.serverError) {
    throw new Error(result.serverError);
  }

  if (result.data === undefined) {
    throw new Error("Request failed");
  }

  return result.data;
}
