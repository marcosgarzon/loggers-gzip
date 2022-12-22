
export function numeroRandom(amount) {
  const cantidadIngresada = amount || 100000000
  for (let index = 0; index < cantidadIngresada  ; index++) {
    Math.floor(Math.random() * 1000 + 1)
  }
  const result = {message: 'Tarea completada', amount: cantidadIngresada }
  return result
}







