export const CASES = [
  {
    id: 'retiro-cristal',
    title: 'El silencio del Palacio de Cristal',
    subtitle: 'Una gala, un apagón y siete minutos borrados',
    location: 'Parque del Retiro, Madrid',
    victim: 'Álvaro Montes, promotor cultural',
    cover: '🏛️',
    synopsis: 'Tras una gala privada, Álvaro Montes aparece muerto en un almacén lateral. La cámara principal dejó de grabar durante siete minutos. Cuatro personas tenían un motivo para querer silenciarlo.',
    accusationAfterHours: 60,
    suspects: [
      { id: 'ines', name: 'Inés Robles', role: 'Socia de la víctima', avatar: 'IR', alibi: 'Afirma que atendía una llamada junto al estanque.' },
      { id: 'bruno', name: 'Bruno Salcedo', role: 'Técnico de iluminación', avatar: 'BS', alibi: 'Dice que reparaba el cuadro eléctrico.' },
      { id: 'leire', name: 'Leire Vidal', role: 'Periodista cultural', avatar: 'LV', alibi: 'Estaba redactando una crónica en la terraza.' },
      { id: 'dario', name: 'Darío Cruz', role: 'Patrocinador del evento', avatar: 'DC', alibi: 'Asegura que salió a buscar su coche.' }
    ],
    methods: [
      { id: 'toxina', label: 'Toxina en la copa' },
      { id: 'golpe', label: 'Golpe con una pieza de montaje' },
      { id: 'asfixia', label: 'Asfixia con una funda de tela' },
      { id: 'caida', label: 'Caída provocada desde una escalera' }
    ],
    motives: [
      { id: 'fraude', label: 'Ocultar un fraude en las cuentas de la gala' },
      { id: 'venganza', label: 'Venganza por una exposición cancelada' },
      { id: 'chantaje', label: 'Evitar que se publicara un chantaje' },
      { id: 'herencia', label: 'Cobrar una herencia inesperada' }
    ],
    phases: [
      {
        id: 'escena', title: 'La escena', kicker: 'Día 1', availableAfterHours: 0,
        clues: [
          { id: 'r-reloj', title: 'El reloj detenido', kind: 'Objeto', icon: '⌚', body: 'El reloj de Álvaro se rompió a las 22:17. En el cristal hay una fina línea de polvo negro.', hint: 'Compara el polvo con los materiales que usó el equipo técnico.' },
          { id: 'r-camara', title: 'Registro de cámara', kind: 'Informe', icon: '📹', body: 'La cámara se desconectó de 22:14 a 22:21. No fue un fallo general: recibió una orden local desde el panel de servicio.', hint: 'Quien manipuló el panel necesitaba conocer el código de mantenimiento.' }
        ]
      },
      {
        id: 'coartadas', title: 'Coartadas cruzadas', kicker: 'Día 1', availableAfterHours: 18,
        clues: [
          { id: 'r-llamada', title: 'Llamada de Inés', kind: 'Registro', icon: '📱', body: 'La llamada de Inés comenzó a las 22:10 y duró 14 minutos. Una fotografía de un invitado la sitúa junto al estanque a las 22:18.', hint: 'Su coartada está respaldada por dos fuentes independientes.' },
          { id: 'r-ticket', title: 'Ticket del aparcamiento', kind: 'Documento', icon: '🧾', body: 'El coche de Darío salió a las 22:13. El lector de matrícula confirma que conducía él.', hint: 'Darío ya estaba fuera antes del intervalo crítico.' }
        ]
      },
      {
        id: 'giro', title: 'El dato que no encaja', kicker: 'Día 2', availableAfterHours: 42,
        clues: [
          { id: 'r-polvo', title: 'Análisis del polvo', kind: 'Laboratorio', icon: '🔬', body: 'El polvo del reloj es grafito conductor, usado esa noche para suavizar los raíles de los focos. Solo el equipo de iluminación recibió ese material.', hint: 'El grafito conecta físicamente la escena con una función concreta.' },
          { id: 'r-correo', title: 'Borrador de correo', kind: 'Correo', icon: '✉️', body: 'Álvaro iba a denunciar facturas infladas por 38.000 €. El proveedor beneficiado pertenece a una empresa administrada por el hermano de Bruno.', hint: 'El correo aporta el motivo económico y el vínculo familiar.' }
        ]
      },
      {
        id: 'final', title: 'La última pieza', kicker: 'Día 3', availableAfterHours: 60,
        clues: [
          { id: 'r-fibra', title: 'Fibra en la herida', kind: 'Forense', icon: '🧵', body: 'La fibra coincide con la cinta negra de sujeción de un contrapeso. En el carro técnico de Bruno falta una pieza metálica de 1,8 kg.', hint: 'La cinta y el objeto ausente determinan el método.' }
        ]
      }
    ],
    solution: {
      suspectId: 'bruno', methodId: 'golpe', motiveId: 'fraude',
      evidenceClueIds: ['r-camara', 'r-polvo', 'r-correo', 'r-fibra'],
      reveal: 'Bruno desconectó la cámara desde el panel de servicio y golpeó a Álvaro con el contrapeso que después ocultó. El grafito de los raíles quedó en el reloj durante el forcejeo. Quería impedir que saliera a la luz la trama de facturas infladas.'
    }
  },
  {
    id: 'malasana-ultima-cancion',
    title: 'La última canción de Malasaña',
    subtitle: 'Una sala cerrada y una mezcla de audio manipulada',
    location: 'Malasaña, Madrid',
    victim: 'Nora Rey, productora musical',
    cover: '🎚️',
    synopsis: 'Nora cae inconsciente en la cabina de un club y muere poco después. La puerta estaba cerrada por dentro, pero una pista de audio contiene un sonido que nadie recuerda haber oído.',
    accusationAfterHours: 60,
    suspects: [
      { id: 'alex', name: 'Álex Mena', role: 'DJ residente', avatar: 'AM', alibi: 'Actuaba frente a la pista llena.' },
      { id: 'sara', name: 'Sara Navas', role: 'Cantante', avatar: 'SN', alibi: 'Firmaba discos en el vestíbulo.' },
      { id: 'tomas', name: 'Tomás Beltrán', role: 'Dueño del club', avatar: 'TB', alibi: 'Revisaba la caja con la encargada.' },
      { id: 'maya', name: 'Maya Costa', role: 'Ingeniera de sonido', avatar: 'MC', alibi: 'Supervisaba la emisión desde una tableta.' }
    ],
    methods: [
      { id: 'gas', label: 'Gas liberado por la ventilación' },
      { id: 'descarga', label: 'Descarga del equipo de audio' },
      { id: 'veneno', label: 'Veneno en una bebida energética' },
      { id: 'medicacion', label: 'Cambio de su medicación' }
    ],
    motives: [
      { id: 'derechos', label: 'Apropiarse de los derechos de una canción' },
      { id: 'despido', label: 'Evitar un despido anunciado' },
      { id: 'deuda', label: 'Cancelar una deuda del club' },
      { id: 'secreto', label: 'Proteger una identidad secreta' }
    ],
    phases: [
      { id: 'escena', title: 'La cabina cerrada', kicker: 'Día 1', availableAfterHours: 0, clues: [
        { id: 'm-onda', title: 'Forma de onda', kind: 'Audio', icon: '🎵', body: 'A las 00:41 hay 19 segundos de ultrasonido en el canal auxiliar. No era audible en la sala, pero activó un dispositivo cercano.', hint: 'Busca qué equipo de la cabina puede responder a una señal.' },
        { id: 'm-puerta', title: 'Cierre magnético', kind: 'Informe', icon: '🚪', body: 'La puerta se bloquea automáticamente al detectar humo o gas. El registro marca un cierre de emergencia a las 00:42.', hint: 'La puerta cerrada es una consecuencia, no el truco principal.' }
      ]},
      { id: 'coartadas', title: 'La mezcla oculta', kicker: 'Día 1', availableAfterHours: 18, clues: [
        { id: 'm-tableta', title: 'Control remoto', kind: 'Registro', icon: '📲', body: 'La pista auxiliar se cargó desde la tableta de Maya a las 00:39. Ella afirma que una actualización se ejecutó sola.', hint: 'El registro identifica el origen exacto del archivo.' },
        { id: 'm-firma', title: 'Fotos del vestíbulo', kind: 'Imagen', icon: '📸', body: 'Sara aparece firmando discos entre 00:33 y 00:47. Álex estuvo visible en la cabina principal durante todo su set.', hint: 'Dos sospechosos tienen coartadas públicas continuas.' }
      ]},
      { id: 'giro', title: 'Frecuencias peligrosas', kicker: 'Día 2', availableAfterHours: 42, clues: [
        { id: 'm-valvula', title: 'Válvula alterada', kind: 'Forense', icon: '🧪', body: 'Un difusor de efectos contenía monóxido en lugar de CO₂. Su receptor inalámbrico fue reprogramado esa tarde.', hint: 'La señal de audio activó a distancia el dispositivo manipulado.' },
        { id: 'm-contrato', title: 'Contrato sin firmar', kind: 'Documento', icon: '📄', body: 'Nora iba a despedir a Maya por vender copias de sesiones inéditas. La reunión estaba prevista para la mañana siguiente.', hint: 'El documento fija un motivo inmediato.' }
      ]},
      { id: 'final', title: 'Metadatos', kicker: 'Día 3', availableAfterHours: 60, clues: [
        { id: 'm-meta', title: 'Autor del archivo', kind: 'Digital', icon: '💾', body: 'El archivo de 19 segundos fue exportado desde la cuenta “mcosta-studio” seis horas antes. Incluye el identificador único de la licencia de Maya.', hint: 'Los metadatos vinculan preparación y control remoto.' }
      ]}
    ],
    solution: {
      suspectId: 'maya', methodId: 'gas', motiveId: 'despido',
      evidenceClueIds: ['m-tableta', 'm-valvula', 'm-contrato', 'm-meta'],
      reveal: 'Maya sustituyó la carga del difusor, reprogramó su receptor y ocultó la orden de activación en una pista auxiliar. La nube de gas hizo que la puerta se cerrase automáticamente. Actuó al saber que Nora iba a despedirla.'
    }
  },
  {
    id: 'austrias-mapa-roto',
    title: 'El mapa roto de los Austrias',
    subtitle: 'Una subasta clandestina bajo la Plaza Mayor',
    location: 'Madrid de los Austrias',
    victim: 'Eduardo Luján, anticuario',
    cover: '🗺️',
    synopsis: 'Durante una subasta secreta, el anticuario Eduardo Luján aparece muerto junto a un mapa del siglo XVII rasgado en cuatro partes. Una de ellas es una falsificación reciente.',
    accusationAfterHours: 60,
    suspects: [
      { id: 'clara', name: 'Clara Esquivel', role: 'Restauradora', avatar: 'CE', alibi: 'Catalogaba marcos en la sala contigua.' },
      { id: 'ramon', name: 'Ramón Ulloa', role: 'Coleccionista', avatar: 'RU', alibi: 'Hablaba con dos compradores.' },
      { id: 'elia', name: 'Elia Martín', role: 'Archivera', avatar: 'EM', alibi: 'Consultaba el inventario del sótano.' },
      { id: 'victor', name: 'Víctor Lago', role: 'Tasador', avatar: 'VL', alibi: 'Preparaba los lotes del segundo turno.' }
    ],
    methods: [
      { id: 'punzon', label: 'Herida con un punzón de restauración' },
      { id: 'veneno-tinta', label: 'Veneno mezclado con tinta antigua' },
      { id: 'estatua', label: 'Golpe con una pequeña estatua' },
      { id: 'alergeno', label: 'Alérgeno oculto en el lacre' }
    ],
    motives: [
      { id: 'falsificacion', label: 'Ocultar una red de falsificaciones' },
      { id: 'mapa', label: 'Conseguir el mapa para una colección privada' },
      { id: 'reputacion', label: 'Evitar un escándalo profesional' },
      { id: 'deuda', label: 'Saldar una deuda de juego' }
    ],
    phases: [
      { id: 'escena', title: 'El mapa dividido', kicker: 'Día 1', availableAfterHours: 0, clues: [
        { id: 'a-tinta', title: 'Tinta demasiado nueva', kind: 'Laboratorio', icon: '🖋️', body: 'Uno de los fragmentos contiene un pigmento sintetizado por primera vez en 1987.', hint: 'Al menos una parte del mapa se fabricó recientemente.' },
        { id: 'a-marca', title: 'Marca en la mesa', kind: 'Objeto', icon: '🔎', body: 'Junto al cuerpo hay una hendidura triangular de 4 mm y restos de cera verde.', hint: 'Compara la forma con las herramientas de los profesionales presentes.' }
      ]},
      { id: 'coartadas', title: 'El inventario', kicker: 'Día 1', availableAfterHours: 18, clues: [
        { id: 'a-sotano', title: 'Sensor del sótano', kind: 'Registro', icon: '💡', body: 'La luz del archivo se activó con la tarjeta de Elia de 21:04 a 21:29. El crimen ocurrió hacia las 21:17.', hint: 'La permanencia de Elia queda registrada.' },
        { id: 'a-video', title: 'Vídeo de un comprador', kind: 'Vídeo', icon: '🎥', body: 'Ramón aparece conversando al fondo entre 21:12 y 21:20. Clara cruza el pasillo a las 21:15 con una caja cerrada.', hint: 'El vídeo reduce la ventana de oportunidad.' }
      ]},
      { id: 'giro', title: 'La restauración imposible', kicker: 'Día 2', availableAfterHours: 42, clues: [
        { id: 'a-punzon', title: 'Juego de herramientas', kind: 'Inventario', icon: '🧰', body: 'Falta un punzón triangular del estuche de Clara. La cavidad vacía contiene la misma cera verde hallada en la mesa.', hint: 'Herramienta, forma y residuo coinciden.' },
        { id: 'a-factura', title: 'Factura cifrada', kind: 'Documento', icon: '🧾', body: 'Eduardo guardaba pagos por “restauraciones” de piezas que nunca existieron. Las transferencias terminan en una cuenta de Clara.', hint: 'Las restauraciones eran la cobertura del negocio.' }
      ]},
      { id: 'final', title: 'La fibra del embalaje', kicker: 'Día 3', availableAfterHours: 60, clues: [
        { id: 'a-fibra', title: 'Caja de conservación', kind: 'Forense', icon: '📦', body: 'La caja de Clara tiene una salpicadura de sangre bajo el forro y contiene el fragmento auténtico que faltaba del mapa.', hint: 'La caja une el arma, el robo y la sustitución.' }
      ]}
    ],
    solution: {
      suspectId: 'clara', methodId: 'punzon', motiveId: 'falsificacion',
      evidenceClueIds: ['a-tinta', 'a-punzon', 'a-factura', 'a-fibra'],
      reveal: 'Clara llevaba años sustituyendo piezas auténticas por copias. Eduardo descubrió la red y la amenazó con denunciarla. Ella utilizó su punzón, ocultó el fragmento auténtico en la caja y dejó una copia moderna en la escena.'
    }
  }
];
