/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a testimony URL with ID and slug
 * Format: testimonies/{id}-{slug}
 */
export function generateTestimonyUrl(
  id: number,
  title: string,
  baseUrl?: string,
): string {
  const slug = generateSlug(title);
  const path = `testimonies/${id}-${slug}`;
  return baseUrl ? `${baseUrl}/${path}` : `/${path}`;
}
