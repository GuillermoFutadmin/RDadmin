export const SIDEBAR_NOTES_KEY = 'rd_sidebar_notes_hidden';

export const SIDEBAR_NOTES = {
  Dashboard: {
    title: 'Inicio',
    lines: [
      'Elige un módulo en el menú para empezar.',
      'Los módulos con ▸ tienen submenús.'
    ]
  },
  Prospectos: {
    title: 'Prospectos',
    lines: [
      'Registra al cliente y sus datos de contacto.',
      'Toma medidas y fotos del espacio.',
      'Abre su valoración y genera la cotización.',
      'Al aprobarlo pasa a Clientes.'
    ]
  },
  Ventas: {
    title: 'Valoración',
    lines: [
      'Captura las piezas por área (cocina, clóset, baño…).',
      'Solo lo que tenga cantidad pasa a la estimación.',
      'Revisa totales antes de cotizar.'
    ]
  },
  Contratos: {
    title: 'Clientes',
    lines: [
      'Aquí están los prospectos aprobados.',
      'Define el render, la estimación y el contrato.',
      'Con todo listo, envíalo a Producción.'
    ]
  },
  Estimacion: {
    title: 'Estimación',
    lines: [
      'Ajusta materiales y piezas por hoja.',
      'Solo los materiales con cantidad se llevan a producción.',
      'Guarda antes de salir.'
    ]
  },
  Produccion: {
    title: 'Producción',
    lines: [
      'Da clic en un cliente o área para abrir su ficha.',
      'Naranja = lo que debes trabajar o revisar.',
      'Gris = datos de consulta.',
      'Avanza la etapa desde la ficha.'
    ]
  },
  Avances: {
    title: 'Avances',
    lines: [
      'Sube foto y comentario del avance del día.',
      'El calendario marca los proyectos sin avance.',
      'Da clic en un evento para ir al proyecto.'
    ]
  },
  Proveedores: {
    title: 'Proveedores',
    lines: [
      'Da de alta proveedores y sus datos de contacto.',
      'Mantén actualizados los materiales que surten.'
    ]
  },
  Colaboradores: {
    title: 'Colaboradores',
    lines: [
      'Registra al personal y sus datos.',
      'Asistencia y nómina están en el submenú.'
    ]
  },
  Asistencia: {
    title: 'Asistencia',
    lines: [
      'Registra entradas y salidas del personal.',
      'Revisa el historial antes del corte.'
    ]
  },
  Nomina: {
    title: 'Corte de nómina',
    lines: [
      'Elige el periodo y revisa las horas trabajadas.',
      'Verifica el total antes de cerrar el corte.'
    ]
  },
  Tarifas: {
    title: 'Tarifas por hora',
    lines: [
      'Define el pago por hora de cada colaborador.',
      'Los cambios aplican a los siguientes cortes.'
    ]
  },
  Accesos: {
    title: 'Accesos',
    lines: [
      'Crea usuarios y asigna sus permisos.',
      'Cada usuario solo ve los módulos que tenga permitidos.'
    ]
  }
};
