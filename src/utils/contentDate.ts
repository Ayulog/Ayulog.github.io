import { z } from "astro/zod";

// YAML can load timestamps as Date objects; CMS editors can save ISO strings.
export const contentDateSchema = z.union([
  z.date(),
  z.iso
    .datetime({ offset: true })
    .transform(value => new Date(value))
    .pipe(z.date()),
]);

// An empty optional CMS field is unset, while invalid nonempty dates still fail.
export const optionalContentDateSchema = z.preprocess(
  value => (value === "" ? undefined : value),
  contentDateSchema.nullish()
);
