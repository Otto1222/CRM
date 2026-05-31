export function formatProjectType(type) {
  if (!type || typeof type !== "string") {
    return "Nincs megadva";
  }

  return type
    .replace(/^mt_/i, "")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1).toLowerCase()
    )
    .join(" ");
}