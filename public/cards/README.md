# Arte de cartas

Aquí se colocan las imágenes reales de las cartas del juego.

## Convención

1. **Nombre del archivo = id de la carta** + extensión:
   - `p_soldado.png`, `p_cazadora.png`, `e_dragon.png`, `e_lican.png`...
   - Los ids exactos están en `src/game/cards.ts` (primer argumento de cada `u(...)` y `s(...)`).
2. **Formato**: PNG o JPG. Se recomienda proporción **4:5** (p. ej. 512×640 px) porque la
   zona de arte de la carta es vertical y se recorta con `object-cover`.
3. **Activar una carta**:
   - Si el archivo es `/cards/{id}.png`: añade el id al array `WITH_ART` de `src/game/cards.ts`.
   - Si usas otro formato o ruta: pasa la opción por carta:
     - Unidad: `u('p_x', ..., { art: '/cards/p_x.jpg' })`
     - Hechizo: `s('p_y', ..., 'cita', true)` o `s('p_y', ..., 'cita', '/cards/p_y.jpg')`

Las cartas **sin** archivo siguen mostrando su sigilo procedural: no se rompe nada
y puedes migrar el arte carta por carta, cuando quieras.

El arte se muestra en: mano, Colección, Tienda, apertura de sobres, armador de mazo
(vista previa) y en las unidades desplegadas sobre el tablero.
