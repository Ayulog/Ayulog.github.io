import type { CollectionEntry } from "astro:content";
import config from "@/config";

export const isLocalPreview =
  import.meta.env.DEV && import.meta.env.MODE === "local-preview";

/**
 * Determines whether a post is eligible to be listed/rendered.
 *
 * - Includes drafts only in the explicit local preview mode
 * - In production, excludes scheduled posts until `pubDatetime` minus the configured margin
 * - In dev, always shows non-draft posts to make authoring easier
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return (
    (isLocalPreview || !data.draft) &&
    (import.meta.env.DEV || isPublishTimePassed)
  );
}
