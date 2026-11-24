/* Prima del primo disegno: dice al CSS che il JavaScript c'è. Senza, le
   animazioni di ingresso non nascondono nulla. È un file esterno perché la
   Content Security Policy non debba ammettere script in linea. */
document.documentElement.classList.add('js')
