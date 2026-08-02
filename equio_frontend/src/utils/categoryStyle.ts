/**
 * Genera estilos ricos, distinguibles y no distractores para los fondos e iconos de categorías.
 * Utiliza opacidad calibrada (~28%), un borde sutil con acento del color y una sombra de resplandor.
 */
export function getCategoryBadgeStyle(rawColor?: string) {
  const baseColor = rawColor || '#6366F1';
  const hex = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  
  return {
    backgroundColor: `${hex}26`, // ~15-18% opacidad tintada suave
    borderColor: `${hex}45`,     // ~27% opacidad en borde limpio
    color: hex,
    boxShadow: `0 2px 8px -2px ${hex}35` // Resplandor sutil del mismo tono
  };
}
