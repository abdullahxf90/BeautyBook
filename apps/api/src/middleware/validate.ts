import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/http";

export const validate =
  (schema: ZodSchema, source: "body" | "query" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return next(new ApiError(400, msg));
    }
    (req as Request & { validated: unknown }).validated = result.data;
    next();
  };

export function getValidated<T>(req: Request): T {
  return (req as Request & { validated: T }).validated;
}
