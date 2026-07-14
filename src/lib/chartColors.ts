// Paleta validada (colorblind-safe, contraste comprobado) de la skill de
// dataviz del proyecto. No generar tonos nuevos: usar siempre estos slots.
export const CHART_COLORS = {
  light: {
    categorical: ['#2a78d6', '#1baf7a', '#eda100'], // blue, aqua, yellow
    grid: '#e1e0d9',
    axis: '#898781',
    ink: '#52514e',
  },
  dark: {
    categorical: ['#3987e5', '#199e70', '#c98500'],
    grid: '#2c2c2a',
    axis: '#898781',
    ink: '#c3c2b7',
  },
} as const
