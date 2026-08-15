import { createSafeActionClient } from "next-safe-action";
import { TransitError } from "@/lib/errors";

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: "flattened",
  handleServerError(error) {
    if (error instanceof TransitError) {
      return error.message;
    }
    console.error(error);
    return "Something went wrong";
  },
});
