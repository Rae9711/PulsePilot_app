import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Validation Middleware
 *
 * Factory for Express middleware that validates request payloads using Zod schemas.
 * Supports body, query, and params locations.
 * Stores parsed payloads in res.locals for downstream handlers.
 */

// Supported request locations: body, query, params
type RequestLocation = 'body' | 'query' | 'params';


// Accepts Zod object schema or primitive validator
type Schema = AnyZodObject | ZodTypeAny;


// Returns Express middleware that validates and replaces incoming payloads
export const validateRequest = (schema: Schema, location: RequestLocation = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = req[location as keyof Request];
    const parsed = schema.safeParse(target);

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues });
    }

    // Replace payload with parsed data and store in res.locals
    (req as unknown as Record<string, unknown>)[location] = parsed.data;
    res.locals[location] = parsed.data;
    next();
  };
};
