export function getCategoryBadgeStyle(rawColor?: string) {
  const baseColor = rawColor || '#6366F1';
  const hex = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  
  return {
    backgroundColor: `${hex}26`,
    borderColor: `${hex}45`,
    color: hex,
    boxShadow: `0 2px 8px -2px ${hex}35`
  };
}
