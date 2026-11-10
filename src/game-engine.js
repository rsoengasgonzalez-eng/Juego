export const CASE_DURATION_HOURS = 48;
export const CLUE_INTERVAL_MINUTES = 30;
export const CLUE_INTERVAL_HOURS = CLUE_INTERVAL_MINUTES / 60;
export const CLUE_COUNT = 16;
export const MISSION_COUNT = 5;
export const DEFAULT_CATALOG_SIZE = 1000;
export const DEFAULT_CYCLE_START = '2026-11-10T15:00:00.000Z';

const HOUR_MS = 60 * 60 * 1000;
const CASE_MS = CASE_DURATION_HOURS * HOUR_MS;

const SETTINGS = [
  ['El archivo imposible', 'Archivo Regional de Madrid', 'una sala de conservación sin ventanas'],
  ['Silencio en la azotea', 'Gran Vía', 'la azotea técnica de un hotel'],
  ['La última función', 'Teatro Lara', 'el camerino principal'],
  ['Sombras del Retiro', 'Parque del Retiro', 'el pabellón junto al estanque'],
  ['El tren de medianoche', 'Estación de Atocha', 'un andén de servicio clausurado'],
  ['Código Malasaña', 'Malasaña', 'el sótano de un estudio creativo'],
  ['La pieza ausente', 'Museo del Prado', 'el taller de restauración'],
  ['Niebla sobre el Manzanares', 'Madrid Río', 'una pasarela de mantenimiento'],
  ['La mesa reservada', 'Mercado de San Miguel', 'el almacén refrigerado'],
  ['Ecos en Chamberí', 'Andén Cero', 'el antiguo cuarto de señales'],
  ['La llave de cristal', 'Palacio de Cibeles', 'el archivo de la torre'],
  ['El secreto de las letras', 'Barrio de las Letras', 'una imprenta centenaria'],
  ['Medianoche en Lavapiés', 'Lavapiés', 'la trastienda de una galería'],
  ['La ecuación de Moncloa', 'Ciudad Universitaria', 'un laboratorio de prototipos'],
  ['El palco vacío', 'Teatro Real', 'un palco cerrado al público'],
  ['La bóveda 17', 'Paseo de la Castellana', 'la cámara documental de un banco'],
  ['La señal de Argüelles', 'Argüelles', 'un estudio de radio abandonado'],
  ['El reloj de Sol', 'Puerta del Sol', 'la sala interior del reloj'],
  ['Un brindis en Chueca', 'Chueca', 'la cocina privada de un club'],
  ['El mapa de Salamanca', 'Barrio de Salamanca', 'la biblioteca de una casa histórica'],
  ['Bajo la Plaza Mayor', 'Plaza Mayor', 'un pasadizo de suministros'],
  ['La noche del Planetario', 'Planetario de Madrid', 'la cabina de proyección'],
  ['El manuscrito del Rastro', 'El Rastro', 'un anticuario cerrado'],
  ['La frecuencia perdida', 'Torrespaña', 'una sala de emisión auxiliar'],
  ['El jardín sin huellas', 'Campo del Moro', 'el invernadero histórico']
];

const FIRST_NAMES = ['Alba','Álex','Amaya','Bruno','Carla','César','Clara','Darío','Elena','Eva','Gael','Hugo','Inés','Irene','Javier','Jimena','Leo','Lucía','Mara','Marcos','Nadia','Nicolás','Noa','Óscar','Paula','Rafael','Sara','Sergio','Vega','Víctor','Yara','Zoe'];
const LAST_NAMES = ['Aguirre','Benet','Carmona','Delgado','Escudero','Ferrer','Galán','Hidalgo','Ibarra','Jurado','Lago','Mena','Navarro','Olmedo','Pardo','Quintana','Rivas','Soler','Téllez','Urbina','Varela','Yuste','Zamora'];
const PROFESSIONS = ['archivista','abogada','analista de datos','arquitecto','comisaria de arte','conservador','consultora','criptógrafa','diseñador de sonido','editora','fotógrafa','ingeniero','investigadora','joyero','periodista','productor cultural','restauradora','técnico de seguridad','traductora','urbanista'];
const RELATIONS = ['socia de la víctima','antiguo colaborador','heredera del proyecto','responsable de seguridad','rival profesional','amiga de la infancia','proveedor habitual','directora del equipo','testigo protegido','beneficiario del contrato','vecina del edificio','investigador asociado'];
const ALIBIS = [
  'Asegura que estaba en una videollamada, pero faltan nueve minutos de grabación.',
  'Dice que salió a tomar aire; ninguna cámara muestra la salida.',
  'Afirma que revisaba inventario en otra planta.',
  'Presenta un recibo correcto, aunque la hora fue corregida a mano.',
  'Sostiene que no abandonó la sala común.',
  'Declara que recibió una llamada urgente en el patio.',
  'Asegura que acompañaba a un proveedor que no recuerda su nombre.',
  'Dice que el ascensor quedó bloqueado mientras subía.'
];
const MOTIVES = [
  ['encubrir un fraude documental', 'un informe que demostraba años de falsificaciones'],
  ['apropiarse de una herencia', 'un cambio de testamento todavía sin registrar'],
  ['evitar la cancelación de un contrato', 'una auditoría que iba a publicarse al amanecer'],
  ['ocultar un plagio', 'el original que probaba la verdadera autoría'],
  ['vengarse por una traición profesional', 'una grabación de la reunión en la que fue apartada'],
  ['recuperar una obra comprometida', 'una pieza que contenía información incriminatoria'],
  ['impedir una denuncia', 'la copia de seguridad preparada para la policía'],
  ['controlar una patente', 'el cuaderno con la única fórmula completa'],
  ['proteger una identidad secreta', 'el expediente que conectaba dos nombres'],
  ['borrar una deuda millonaria', 'el libro contable original'],
  ['ganar una disputa societaria', 'las acciones que cambiaban la mayoría de voto'],
  ['silenciar un chantaje', 'los mensajes que documentaban los pagos']
];
const METHODS = [
  ['sedante de acción retardada', 'un compuesto soluble hallado en una taza'],
  ['dispositivo electromagnético manipulado', 'una sobrecarga programada desde el panel'],
  ['gas liberado desde el sistema de ventilación', 'una válvula sustituida horas antes'],
  ['mecanismo de cierre alterado', 'un resorte limado con una herramienta de precisión'],
  ['medicación intercambiada', 'dos cápsulas con sellos rehechos'],
  ['cable de seguridad saboteado', 'un corte cubierto con resina oscura'],
  ['alarma acústica de alta frecuencia', 'un emisor oculto dentro de una caja técnica'],
  ['bebida contaminada', 'restos del reactivo en un tapón aparentemente intacto']
];
const COLORS = ['verde oliva','azul cobalto','rojo granate','amarillo mostaza','gris plata','violeta','naranja cobre','blanco marfil'];
const OBJECTS = ['una estilográfica antigua','un llavero hexagonal','un pañuelo bordado','una pulsera magnética','una libreta azul','un mechero de latón','un colgante geométrico','una funda de gafas roja'];
const VICTIMS = ['Adrián Valdés','Beatriz Montes','Celia Santoro','Damián Robles','Elisa Montalbán','Fernando Cid','Gabriela Navas','Héctor Leiva','Isabel Soria','Julián Orbe','Laura Miret','Mateo Salas'];

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function shuffled(list, random) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function buildCase(caseIndex) {
  const normalizedIndex = Math.abs(Number(caseIndex) || 0) % DEFAULT_CATALOG_SIZE;
  const random = mulberry32(normalizedIndex * 2654435761 + 1907);
  const [title, district, crimeScene] = SETTINGS[normalizedIndex % SETTINGS.length];
  const victim = VICTIMS[(normalizedIndex * 7 + 3) % VICTIMS.length];
  const [motive, motiveEvidence] = pick(MOTIVES, random);
  const [method, methodEvidence] = pick(METHODS, random);
  const names = shuffled(FIRST_NAMES, random).slice(0, 4);
  const surnames = shuffled(LAST_NAMES, random).slice(0, 4);
  const professions = shuffled(PROFESSIONS, random).slice(0, 4);
  const relations = shuffled(RELATIONS, random).slice(0, 4);
  const alibis = shuffled(ALIBIS, random).slice(0, 4);
  const colors = shuffled(COLORS, random).slice(0, 4);
  const objects = shuffled(OBJECTS, random).slice(0, 4);
  const badges = shuffled(Array.from({ length: 900 }, (_, index) => String(index + 100)), random).slice(0, 4);
  const culpritIndex = Math.floor(random() * 4);

  const suspects = names.map((name, index) => ({
    id: `s-${normalizedIndex}-${index}`,
    name: `${name} ${surnames[index]}`,
    profession: professions[index],
    relation: relations[index],
    alibi: alibis[index],
    badgeSuffix: badges[index],
    signature: `${objects[index]} · ${colors[index]}`
  }));
  const culprit = suspects[culpritIndex];
  const decoys = suspects.filter((_, index) => index !== culpritIndex);
  const caseCode = `MM-${String(normalizedIndex + 1).padStart(4, '0')}`;

  const clues = [
    ['Apertura del expediente', `A las 22:17, ${victim} fue hallado sin respuesta en ${crimeScene}. La sala estaba cerrada y las cuatro personas investigadas tenían acceso al edificio.`],
    ['Inspección de la escena', `La puerta no fue forzada. Junto al sistema de cierre apareció una fibra ${culprit.signature.split(' · ')[1]}, demasiado pequeña para identificar a su propietario por sí sola.`],
    ['Testimonio de mantenimiento', `Una técnica oyó una discusión sobre ${motiveEvidence}. Vio a alguien guardar ${culprit.signature.split(' · ')[0]}, pero solo pudo distinguir la silueta.`],
    ['Las cuatro coartadas', `${decoys[0].name} y ${decoys[1].name} aparecen en cámaras separadas. La franja de ${culprit.name} conserva un vacío de once minutos; ${decoys[2].name} fue visto lejos de la sala.`],
    ['Informe forense', `El laboratorio determina que se utilizó ${method}. La causa coincide con ${methodEvidence}. La intervención ocurrió entre las 21:58 y las 22:08.`],
    ['Registro de accesos', `El lector guardó un acceso incompleto terminado en “${culprit.badgeSuffix.slice(-2)}”. Dos credenciales comparten un dígito, por lo que el registro todavía no es concluyente.`],
    ['Mensaje recuperado', `Del móvil de la víctima se recupera: “Si publicas lo de ${motiveEvidence}, mañana todo habrá terminado”. El mensaje se borró a las 22:04.`],
    ['Ruta del edificio', `Los datos de paso descartan a ${decoys[0].name}: su credencial cruzó un torno incompatible con la cronología. La persona culpable permaneció en la zona restringida.`],
    ['Reflejo en una cámara', `Un reflejo muestra el contorno de ${culprit.signature.split(' · ')[0]}. El color no se aprecia, pero el objeto coincide con uno descrito en las fichas de sospechosos.`],
    ['El vínculo oculto', `Un documento confirma que ${culprit.name} podía beneficiarse de ${motive}. La firma de autorización iba a quedar anulada a primera hora.`],
    ['Segunda prueba de laboratorio', `Partículas halladas en la ropa de ${culprit.name} son compatibles con ${methodEvidence}. La explicación ofrecida no coincide con su recorrido.`],
    ['La contradicción', `${culprit.name} aseguró no conocer ${crimeScene}, pero su dispositivo se conectó al punto interno de esa sala a las 22:02.`],
    ['El objeto que faltaba', `Una revisión localiza ${culprit.signature.split(' · ')[0]} con restos microscópicos vinculados al mecanismo. Había sido limpiado de forma apresurada.`],
    ['Prueba decisiva', `El acceso terminado en “${culprit.badgeSuffix}” pertenece a ${culprit.name}. El registro, el objeto y el mensaje forman una misma secuencia sin huecos.`],
    ['Ventana de acusación abierta', `Ya puedes presentar una acusación. Identifica a la persona, el motivo, el método y el lugar. La respuesta quedará registrada y no podrá cambiarse.`],
    ['Última orientación', `Ordena los hechos entre las 21:58 y las 22:08. La clave no es quién tenía un motivo, sino quién reúne acceso, rastro físico y contradicción digital.`]
  ].map(([clueTitle, content], index) => ({
    id: `c-${normalizedIndex}-${index}`,
    number: index + 1,
    title: clueTitle,
    unlockAtHours: index * CLUE_INTERVAL_HOURS,
    content
  }));

  const missions = [
    {
      id: `m-${normalizedIndex}-timeline`,
      order: 1,
      title: 'Reconstruir la ventana temporal',
      prompt: '¿En qué intervalo sitúa el informe forense la intervención?',
      unlockAfterClue: 5,
      options: ['21:42–21:52', '21:58–22:08', '22:11–22:21', '22:25–22:35'],
      answer: '21:58–22:08'
    },
    {
      id: `m-${normalizedIndex}-access`,
      order: 2,
      title: 'Identificar la credencial',
      prompt: '¿Qué terminación completa corresponde al acceso decisivo?',
      unlockAfterClue: 7,
      options: shuffled(suspects.map(suspect => suspect.badgeSuffix), random),
      answer: culprit.badgeSuffix
    },
    {
      id: `m-${normalizedIndex}-object`,
      order: 3,
      title: 'Vincular el objeto',
      prompt: '¿Qué objeto conecta la escena con la persona responsable?',
      unlockAfterClue: 9,
      options: shuffled(suspects.map(suspect => suspect.signature.split(' · ')[0]), random),
      answer: culprit.signature.split(' · ')[0]
    },
    {
      id: `m-${normalizedIndex}-motive`,
      order: 4,
      title: 'Aislar el móvil',
      prompt: '¿Qué motivo explica mejor el mensaje y el beneficio descubierto?',
      unlockAfterClue: 12,
      options: shuffled([motive, ...shuffled(MOTIVES.map(item => item[0]).filter(item => item !== motive), random).slice(0, 3)], random),
      answer: motive
    },
    {
      id: `m-${normalizedIndex}-method`,
      order: 5,
      title: 'Validar el método',
      prompt: '¿Qué método coincide con las dos pruebas de laboratorio?',
      unlockAfterClue: 15,
      options: shuffled([method, ...shuffled(METHODS.map(item => item[0]).filter(item => item !== method), random).slice(0, 3)], random),
      answer: method
    }
  ];

  return {
    id: `case-${normalizedIndex}`,
    index: normalizedIndex,
    code: caseCode,
    title,
    district,
    crimeScene,
    victim,
    synopsis: `Un incidente imposible, cuatro versiones incompatibles y 48 horas para reconstruir lo ocurrido en ${district}.`,
    suspects,
    clues,
    missions,
    choices: {
      motives: shuffled([motive, ...shuffled(MOTIVES.map(item => item[0]).filter(item => item !== motive), random).slice(0, 3)], random),
      methods: shuffled([method, ...shuffled(METHODS.map(item => item[0]).filter(item => item !== method), random).slice(0, 3)], random),
      locations: shuffled([crimeScene, district, 'la sala de reuniones principal', 'el acceso de servicio'], random)
    },
    answer: { suspectId: culprit.id, suspectName: culprit.name, motive, method, location: crimeScene },
    solution: `${culprit.name} actuó para ${motive}. Preparó ${method} en ${crimeScene} y trató de borrar la conexión entre su credencial, el objeto y el mensaje recuperado.`
  };
}

export function getCycleState(nowInput = Date.now(), cycleStartInput = DEFAULT_CYCLE_START, catalogSizeInput = DEFAULT_CATALOG_SIZE) {
  const nowMs = typeof nowInput === 'number' ? nowInput : new Date(nowInput).getTime();
  const cycleStartMs = new Date(cycleStartInput || DEFAULT_CYCLE_START).getTime();
  if (!Number.isFinite(nowMs) || !Number.isFinite(cycleStartMs)) throw new Error('Fecha de ciclo no válida');
  const catalogSize = Math.max(1, Math.floor(Number(catalogSizeInput) || DEFAULT_CATALOG_SIZE));
  const deltaMs = nowMs - cycleStartMs;
  const started = deltaMs >= 0;
  const cycleNumber = started ? Math.floor(deltaMs / CASE_MS) : 0;
  const elapsedMs = started ? deltaMs - cycleNumber * CASE_MS : 0;
  const caseIndex = cycleNumber % catalogSize;
  const caseStartMs = cycleStartMs + cycleNumber * CASE_MS;
  const caseEndMs = caseStartMs + CASE_MS;
  const elapsedHours = elapsedMs / HOUR_MS;
  const unlockedCount = started ? Math.min(CLUE_COUNT, Math.floor(elapsedHours / CLUE_INTERVAL_HOURS) + 1) : 0;
  const nextClueMs = unlockedCount < CLUE_COUNT ? caseStartMs + unlockedCount * CLUE_INTERVAL_HOURS * HOUR_MS : null;
  return {
    started,
    cycleNumber,
    caseIndex,
    catalogSize,
    caseStartMs,
    caseEndMs,
    elapsedMs,
    elapsedHours,
    unlockedCount,
    nextClueMs,
    accusationOpen: false,
    accusationOpenMs: null
  };
}

export function getPublicGame(nowInput = Date.now(), options = {}) {
  const cycle = getCycleState(nowInput, options.cycleStart, options.catalogSize);
  const mystery = buildCase(cycle.caseIndex);
  const clues = mystery.clues.map(clue => {
    const unlockAt = cycle.caseStartMs + clue.unlockAtHours * HOUR_MS;
    const unlocked = cycle.started && new Date(nowInput).getTime() >= unlockAt;
    return unlocked
      ? { ...clue, unlocked: true, unlockAt: new Date(unlockAt).toISOString() }
      : { id: clue.id, number: clue.number, title: clue.title, unlockAtHours: clue.unlockAtHours, unlocked: false, unlockAt: new Date(unlockAt).toISOString() };
  });
  const { answer, solution, missions, ...safeMystery } = mystery;
  const publicMissions = missions.map(({ answer: _answer, ...mission }) => mission);
  let previousSolution = null;
  if (cycle.started && cycle.cycleNumber > 0) {
    const previousIndex = (cycle.caseIndex - 1 + cycle.catalogSize) % cycle.catalogSize;
    const previous = buildCase(previousIndex);
    previousSolution = { code: previous.code, title: previous.title, answer: previous.answer, solution: previous.solution };
  }
  return {
    serverNow: new Date(nowInput).toISOString(),
    rules: {
      caseDurationHours: CASE_DURATION_HOURS,
      clueIntervalMinutes: CLUE_INTERVAL_MINUTES,
      clueIntervalHours: CLUE_INTERVAL_HOURS,
      clueCount: CLUE_COUNT,
      missionCount: MISSION_COUNT,
      catalogSize: cycle.catalogSize
    },
    cycle: {
      started: cycle.started,
      number: cycle.cycleNumber,
      caseIndex: cycle.caseIndex,
      startsAt: new Date(cycle.caseStartMs).toISOString(),
      endsAt: new Date(cycle.caseEndMs).toISOString(),
      nextClueAt: cycle.nextClueMs ? new Date(cycle.nextClueMs).toISOString() : null,
      unlockedCount: cycle.unlockedCount
    },
    case: { ...safeMystery, clues, missions: publicMissions },
    previousSolution
  };
}

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase('es-ES');
}

export function scoreAccusation(mystery, accusation, elapsedHours = 0) {
  const checks = {
    suspect: accusation.suspectId === mystery.answer.suspectId,
    motive: normalized(accusation.motive) === normalized(mystery.answer.motive),
    method: normalized(accusation.method) === normalized(mystery.answer.method),
    location: normalized(accusation.location) === normalized(mystery.answer.location)
  };
  const base = (checks.suspect ? 500 : 0) + (checks.motive ? 200 : 0) + (checks.method ? 200 : 0) + (checks.location ? 100 : 0);
  const speedBonus = base === 1000 ? Math.max(0, Math.round(500 - Math.max(0, elapsedHours) * 20)) : 0;
  return { checks, base, speedBonus, total: base + speedBonus, isCorrect: base === 1000 };
}

export function caseFingerprint(mystery) {
  return slug(`${mystery.title}-${mystery.victim}-${mystery.answer.suspectName}-${mystery.answer.motive}-${mystery.answer.method}`);
}
