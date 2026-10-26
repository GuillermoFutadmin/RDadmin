export const MATERIAL_CATEGORIES = [
  {
    category: 'Triplay y enchapados',
    icon: '🪵',
    color: '#7C4A1E',
    items: [
      {
        id: 'BirchNatural34',
        label: 'Triplay Birch Natural 3/4',
        img: '/enchapados/birch_natural.jpg',
        badge: '#E8D9B5',
        desc: 'Triplay de abedul natural 3/4", capas uniformes y finas. Alta resistencia y superficie lisa ideal para lacas y enchapes.'
      },
      {
        id: 'Alder',
        label: 'Aliso (Alder)',
        img: '/enchapados/alder.jpg',
        badge: '#C39A6B',
        desc: 'Madera suave con veta recta, toma el tinte muy bien.'
      },
      {
        id: 'Walnut',
        label: 'Nogal (Walnut)',
        img: '/enchapados/walnut.jpg',
        badge: '#5C3A21',
        desc: 'Tonos oscuros y lujosos, grano fino y muy elegante.'
      },
      {
        id: 'Cherry',
        label: 'Cerezo (Cherry)',
        img: '/enchapados/cherry.jpg',
        badge: '#9F5B36',
        desc: 'Color cálido y rojizo que se enriquece con el tiempo.'
      },
      {
        id: 'HardMaple',
        label: 'Maple Duro',
        img: '/enchapados/hard_maple.jpg',
        badge: '#E4CC9C',
        desc: 'Muy denso y claro, excelente resistencia y apariencia limpia.'
      },
      {
        id: 'Mahogany',
        label: 'Caoba (Mahogany)',
        img: '/enchapados/mahogany.jpg',
        badge: '#7B3F2A',
        desc: 'Acabado premium rojizo suave y vetas clásicas.'
      },
      {
        id: 'RedOak',
        label: 'Roble Rojo',
        img: '/enchapados/red_oak.jpg',
        badge: '#C79A73',
        desc: 'Patrón de veta muy pronunciado y cálido.'
      },
      {
        id: 'SoftMaple',
        label: 'Maple Suave',
        img: '/enchapados/soft_maple.jpg',
        badge: '#DFD1B3',
        desc: 'Similar al Maple duro pero más ligero.'
      },
      {
        id: 'WhiteOak',
        label: 'Roble Blanco',
        img: '/enchapados/white_oak.jpg',
        badge: '#D3B88A',
        desc: 'Veta fuerte, color más grisáceo/dorado que el roble rojo.'
      },
      {
        id: 'WhitePine',
        label: 'Pino Blanco',
        img: '/enchapados/white_pine.jpg',
        badge: '#EBDCB9',
        desc: 'Muy claro, ligero y de grano sutil.'
      }
    ]
  },
,
  {
    category: 'Melamina (Catálogo Real)',
    icon: '🍀',
    color: '#2E7D32',
    hasFilters: true,
    items: [
      // Maderas Claras / Escandinavas
      { id: 'Melamina - Espiga', label: 'Espiga', subcat: 'Maderas Claras', img: '/melaminas/espiga.jpg', desc: 'Patrón espiga / herringbone en roble claro escandinavo.' },
      { id: 'Melamina - Chardonnay', label: 'Chardonnay', subcat: 'Maderas Claras', img: '/melaminas/chardonnay.jpg', desc: 'Tono crema cálido con suave veta lineal.' },
      { id: 'Melamina - Encino Polar', label: 'Encino Polar', subcat: 'Maderas Claras', img: '/melaminas/encino_polar.jpg', desc: 'Roble polar blanqueado de alta luminosidad.' },
      { id: 'Melamina - Fresno Bruma', label: 'Fresno Bruma', subcat: 'Maderas Claras', img: '/melaminas/fresno_bruma.jpg', desc: 'Grisáceo nórdico con poro suave.' },

      // Maderas Cálidas / Naturales
      { id: 'Melamina - Roble Santana', label: 'Roble Santana', subcat: 'Maderas Cálidas', img: '/melaminas/roble_santana.jpg', desc: 'Roble natural de veta amplia y cálida.' },
      { id: 'Melamina - Nogal Británico', label: 'Nogal Británico', subcat: 'Maderas Cálidas', img: '/melaminas/nogal_britanico.jpg', desc: 'Nogal clásico de tono medio balanceado.' },
      { id: 'Melamina - Malta', label: 'Malta', subcat: 'Maderas Cálidas', img: '/melaminas/malta.jpg', desc: 'Madera miel con vetas sutiles elegantes.' },
      { id: 'Melamina - Latte', label: 'Latte', subcat: 'Maderas Cálidas', img: '/melaminas/latte.jpg', desc: 'Tono café latte con nudos y vetas rústicas.' },
      { id: 'Melamina - Monarca', label: 'Monarca', subcat: 'Maderas Cálidas', img: '/melaminas/monarca.jpg', desc: 'Tono tostado suave muy versátil.' },
      { id: 'Melamina - Durango', label: 'Durango', subcat: 'Maderas Cálidas', img: '/melaminas/durango.jpg', desc: 'Madera oscura rústica con carácter marcado.' },
      { id: 'Melamina - Cerezo', label: 'Cerezo', subcat: 'Maderas Cálidas', img: '/melaminas/cerezo.jpg', desc: 'Cálido rojizo con textura tradicional.' },
      { id: 'Melamina - Rioja', label: 'Rioja', subcat: 'Maderas Cálidas', img: '/melaminas/rioja.jpg', desc: 'Madera rojiza profunda de gran elegancia.' },
      { id: 'Melamina - Dakota', label: 'Dakota', subcat: 'Maderas Cálidas', img: '/melaminas/dakota.jpg', desc: 'Efecto duelas ensambladas estilo rústico.' },
      { id: 'Melamina - Roble Mérida', label: 'Roble Mérida', subcat: 'Maderas Cálidas', img: '/melaminas/roble_merida.jpg', desc: 'Roble dorado clásico y luminoso.' },

      // Maderas Oscuras / Contemporáneas
      { id: 'Melamina - Wengué', label: 'Wengué', subcat: 'Maderas Oscuras', img: '/melaminas/wengue.jpg', desc: 'Tono chocolate muy oscuro casi negro.' },
      { id: 'Melamina - Ébano Indi', label: 'Ébano Indi', subcat: 'Maderas Oscuras', img: '/melaminas/ebano_indi.jpg', desc: 'Veta vertical negra carbón profunda.' },
      { id: 'Melamina - Nogal Neo', label: 'Nogal Neo', subcat: 'Maderas Oscuras', img: '/melaminas/nogal_neo.jpg', desc: 'Nogal contemporáneo de veta definida.' },
      { id: 'Melamina - Oporto', label: 'Oporto', subcat: 'Maderas Oscuras', img: '/melaminas/oporto.jpg', desc: 'Café ahumado con estilo arquitectónico.' },
      { id: 'Melamina - Anáhuac', label: 'Anáhuac', subcat: 'Maderas Oscuras', img: '/melaminas/anahuac.jpg', desc: 'Azul noche con veta profunda contemporánea.' },

      // Lisos / Unicolores
      { id: 'Melamina - Blanco Absoluto', label: 'Blanco Absoluto', subcat: 'Lisos y Unicolores', img: '/melaminas/blanco_absoluto.jpg', desc: 'Blanco puro mate de máxima pulcritud.' },
      { id: 'Melamina - Blanco Frosty', label: 'Blanco Frosty', subcat: 'Lisos y Unicolores', img: '/melaminas/blanco_frosty.jpg', desc: 'Blanco frío reflectante de fácil limpieza.' },
      { id: 'Melamina - Negro', label: 'Negro', subcat: 'Lisos y Unicolores', img: '/melaminas/negro.jpg', desc: 'Negro profundo sobrio de alto impacto.' },
      { id: 'Melamina - Zafiro', label: 'Zafiro', subcat: 'Lisos y Unicolores', img: '/melaminas/zafiro.jpg', desc: 'Azul marino zafiro intenso de tendencia.' },
      { id: 'Melamina - Jade', label: 'Jade', subcat: 'Lisos y Unicolores', img: '/melaminas/jade.jpg', desc: 'Verde bosque profundo contemporáneo.' },
      { id: 'Melamina - Terra', label: 'Terra', subcat: 'Lisos y Unicolores', img: '/melaminas/terra.jpg', desc: 'Terracota tierra cálido y acogedor.' },
      { id: 'Melamina - Gris Claro', label: 'Gris Claro', subcat: 'Lisos y Unicolores', img: '/melaminas/gris_claro.jpg', desc: 'Gris neutro suave y minimalista.' },
      { id: 'Melamina - Gris', label: 'Gris', subcat: 'Lisos y Unicolores', img: '/melaminas/gris.jpg', desc: 'Gris medio neutro ideal para contrastes.' },
      { id: 'Melamina - Visón', label: 'Visón', subcat: 'Lisos y Unicolores', img: '/melaminas/vison.jpg', desc: 'Gris topo / visón cálido europeo.' },
      { id: 'Melamina - Oxford', label: 'Oxford', subcat: 'Lisos y Unicolores', img: '/melaminas/oxford.jpg', desc: 'Gris carbón oscuro formal.' },
      { id: 'Melamina - Níquel', label: 'Níquel', subcat: 'Lisos y Unicolores', img: '/melaminas/niquel.jpg', desc: 'Grafito metálico / níquel vanguardista.' },

      // Texturas y Diseños Especiales
      { id: 'Melamina - Turmalina', label: 'Turmalina', subcat: 'Piedra y Especiales', img: '/melaminas/turmalina.jpg', desc: 'Piedra turmalina gris volcánica mineral.' },
      { id: 'Melamina - Cairo', label: 'Cairo', subcat: 'Piedra y Especiales', img: '/melaminas/cairo.jpg', desc: 'Textura textil tipo lino cálido tramado.' },
      { id: 'Melamina - Precompuesto Ceniza', label: 'Precompuesto Ceniza', subcat: 'Piedra y Especiales', img: '/melaminas/precompuesto_ceniza.jpg', desc: 'Diseño lineal fino con gradiente cenizo.' }
    ]
  },
  {
    category: 'Madera Sólida',
    icon: '🌳',
    color: '#4E342E',
    items: [
      {
        id: 'Roble',
        label: 'Roble',
        img: '/maderas/roble.jpg',
        badge: '#C8A96E',
        desc: 'Fuerte y duradero, conocido por sus patrones de veta clásicos.'
      },
      {
        id: 'Maple',
        label: 'Maple',
        img: '/maderas/maple.jpg',
        badge: '#E2C98A',
        desc: 'Madera de grano fino y superficie lisa, aspecto claro y limpio.'
      },
      {
        id: 'Cerezo',
        label: 'Cerezo',
        img: '/maderas/cerezo.jpg',
        badge: '#A0522D',
        desc: 'Color rojizo que se intensifica con el tiempo, textura suave y elegante.'
      },
      {
        id: 'Nogal',
        label: 'Nogal',
        img: '/maderas/nogal.jpg',
        badge: '#5C3A1E',
        desc: 'Tonos oscuros y lujosos con veta fina y elegante. Muy premium.'
      },
      {
        id: 'Caoba',
        label: 'Caoba',
        img: '/maderas/caoba.jpg',
        badge: '#7B3F2A',
        desc: 'Madera premium con acabado rojizo suave y tonos cálidos.'
      },
      {
        id: 'Teca',
        label: 'Teca',
        img: '/maderas/teca.jpg',
        badge: '#8B6914',
        desc: 'Naturalmente aceitosa, muy resistente a la humedad y la intemperie.'
      },
      {
        id: 'Pino',
        label: 'Pino',
        img: '/maderas/pino.jpg',
        badge: '#D4B483',
        desc: 'Ligero y asequible con veta recta, ideal para muebles funcionales.'
      },
      {
        id: 'Abedul',
        label: 'Abedul',
        img: '/maderas/abedul.jpg',
        badge: '#F0E0B0',
        desc: 'Claro en color, textura uniforme y veta sutil. Ligero y resistente.'
      },
      {
        id: 'Fresno',
        label: 'Fresno',
        img: '/maderas/fresno.jpg',
        badge: '#C9A96E',
        desc: 'Fuerte y flexible con un patrón de veta pronunciado y llamativo.'
      },
      {
        id: 'Haya',
        label: 'Haya',
        img: '/maderas/haya.jpg',
        badge: '#D2A679',
        desc: 'Dura, pesada y excelente para uso cotidiano y mobiliario resistente.'
      },
      {
        id: 'Cecia',
        label: 'Cecia',
        img: '/maderas/cecia.jpg',
        badge: '#C49A6C',
        desc: 'Fuerte y durable con un cálido tinte rojizo y veta fina.'
      },
      {
        id: 'Cedro',
        label: 'Cedro',
        img: '/maderas/cedro.jpg',
        badge: '#B5651D',
        desc: 'Naturalmente fragante y resistente a insectos. Ideal para clósets.'
      },
      {
        id: 'Nogal Americano',
        label: 'Nogal Americano',
        img: '/maderas/nogal_americano.jpg',
        badge: '#6B4226',
        desc: 'Extremadamente fuerte con un patrón de veta llamativo y contrastante.'
      },
      {
        id: 'Ébano',
        label: 'Ébano',
        img: '/maderas/ebano.jpg',
        badge: '#1C0F0A',
        desc: 'Madera excepcionalmente densa, color negro profundo y acabado lujoso.'
      },
      {
        id: 'Palo de Rosa',
        label: 'Palo de Rosa',
        img: '/maderas/palo_de_rosa.jpg',
        badge: '#C17B6F',
        desc: 'Exótico y bello, con veta única y colores rojizos intensos.'
      }
    ]
  }
];

export const WOOD_TONES = [
  { id: 'natural', label: 'Natural' },
  { id: 'golden_honey', label: 'Miel Dorada' },
  { id: 'warm_chestnut', label: 'Castaño Cálido' },
  { id: 'cinnamon', label: 'Canela' },
  { id: 'nutmeg', label: 'Nuez' },
  { id: 'merlot', label: 'Merlot' },
  { id: 'tuscan_coffee', label: 'Café Toscano' }
];

export const STAIN_COLORS = [
  { name: 'Blanca', code: 'TS-6101', hex: '#EBE4D5', img: '/manchas/ts_6101.jpg' },
  { name: 'Negra', code: 'TS-6102', hex: '#2A2A2A', img: '/manchas/ts_6102.jpg' },
  { name: 'Ocre', code: 'TS-6103', hex: '#C98D26', img: '/manchas/ts_6103.jpg' },
  { name: 'Amarillo Oro', code: 'TS-6105', hex: '#EBB414', img: '/manchas/ts_6105.jpg' },
  { name: 'Rojo Colonial', code: 'TS-6106', hex: '#9B3331', img: '/manchas/ts_6106.jpg' },
  { name: 'Rojo Vivo', code: 'TS-6107', hex: '#B8282E', img: '/manchas/ts_6107.jpg' },
  { name: 'Naranja', code: 'TS-6108', hex: '#CD4C1B', img: '/manchas/ts_6108.jpg' },
  { name: 'Azul', code: 'TS-6109', hex: '#2A467F', img: '/manchas/ts_6109.jpg' },
  { name: 'Verde', code: 'TS-6110', hex: '#379057', img: '/manchas/ts_6110.jpg' },
  { name: 'Royal Marrón', code: 'TS-6111', hex: '#632731', img: '/manchas/ts_6111.jpg' },
  { name: 'Early American', code: 'TS-6112', hex: '#583D22', img: '/manchas/ts_6112.jpg' },
  { name: 'Verde Ficus', code: 'TS-6113', hex: '#394A30', img: '/manchas/ts_6113.jpg' },
  { name: 'Nogal americano', code: 'TS-6114', hex: '#5E412A', img: '/manchas/ts_6114.jpg' },
  { name: 'Nogal clásico', code: 'TS-6115', hex: '#51371B', img: '/manchas/ts_6115.jpg' },
  { name: 'Maple', code: 'TS-6116', hex: '#A8573E', img: '/manchas/ts_6116.jpg' },
  { name: 'Caoba inglés', code: 'TS-6117', hex: '#7A2C34', img: '/manchas/ts_6117.jpg' },
  { name: 'Caoba comercial', code: 'TS-6118', hex: '#652321', img: '/manchas/ts_6118.jpg' },
  { name: 'Caoba clásico', code: 'TS-6119', hex: '#763124', img: '/manchas/ts_6119.jpg' },
  { name: 'Roble', code: 'TS-6120', hex: '#633B18', img: '/manchas/ts_6120.jpg' },
  { name: 'Arce', code: 'TS-6121', hex: '#D89018', img: '/manchas/ts_6121.jpg' },
  { name: 'Cedro', code: 'TS-6122', hex: '#AD591B', img: '/manchas/ts_6122.jpg' },
  { name: 'Olmo', code: 'TS-6123', hex: '#AC8324', img: '/manchas/ts_6123.jpg' },
  { name: 'Oyamel', code: 'TS-6124', hex: '#752A26', img: '/manchas/ts_6124.jpg' },
  { name: 'Magnolia', code: 'TS-6125', hex: '#B15918', img: '/manchas/ts_6125.jpg' },
  { name: 'Ciprés', code: 'TS-6126', hex: '#583918', img: '/manchas/ts_6126.jpg' },
  { name: 'Amaranto', code: 'TS-6127', hex: '#672733', img: '/manchas/ts_6127.jpg' },
  { name: 'Palo de rosa', code: 'TS-6128', hex: '#481932', img: '/manchas/ts_6128.jpg' },
  { name: 'Chocolate', code: 'TS-6129', hex: '#2C2729', img: '/manchas/ts_6129.jpg' },
  { name: 'Avellana', code: 'TS-6130', hex: '#491E1C', img: '/manchas/ts_6130.jpg' },
  { name: 'Cherry', code: 'TS-6131', hex: '#5E1B28', img: '/manchas/ts_6131.jpg' },
  { name: 'Nogal claro', code: 'TS-6132', hex: '#4B2F1C', img: '/manchas/ts_6132.jpg' },
  { name: 'Encino americano', code: 'TS-6133', hex: '#7A3521', img: '/manchas/ts_6133.jpg' },
  { name: 'Gris Perla', code: 'TS-6134', hex: '#C5C0B8', img: '/manchas/ts_6134.jpg' },
  { name: 'Gris Titanio', code: 'TS-6135', hex: '#7C7872', img: '/manchas/ts_6135.jpg' },
  { name: 'Gris Grafito', code: 'TS-6136', hex: '#3A3836', img: '/manchas/ts_6136.jpg' },
  { name: 'Álamo', code: 'TS-6137', hex: '#8A7A6A', img: '/manchas/ts_6137.jpg' },
  { name: 'Cacao', code: 'TS-6138', hex: '#3C2E27', img: '/manchas/ts_6138.jpg' },
  { name: 'Abeto', code: 'TS-6139', hex: '#5B6E52', img: '/manchas/ts_6139.jpg' }
];

export const KITCHEN_LAYOUTS = [
  { id: 'LINEAL', label: 'Lineal', img: '/layouts/cocina_lineal.png', desc: 'Sobre una sola pared' },
  { id: 'EN L', label: 'En "L"', img: '/layouts/cocina_l.png', desc: 'En escuadra de dos muros' },
  { id: 'PARALELO', label: 'Paralelo', img: '/layouts/cocina_paralelo.png', desc: 'Dos frentes enfrentados' },
  { id: 'EN U', label: 'En "U"', img: '/layouts/cocina_u.png', desc: 'En tres paredes contiguas' },
];

export const KITCHEN_ADDONS = [
  { id: 'CON ISLA', label: 'Con Isla', icon: '🏝️', img: '/layouts/cocina_isla.png', desc: 'Módulo central exento de trabajo o barra' },
  { id: 'CON PENÍNSULA', label: 'Con Península', icon: '🍹', img: '/layouts/cocina_peninsula.png', desc: 'Extensión fija unida a un lateral o muro' },
];
