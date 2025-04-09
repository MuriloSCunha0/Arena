export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFD')               // Split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // Remove all diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word characters
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}
