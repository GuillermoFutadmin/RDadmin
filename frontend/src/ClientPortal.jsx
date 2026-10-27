import React, { useCallback, useEffect, useState } from 'react';
import ProjectTracking, { getProjectTrackingProgress } from './ProjectTracking';
import useAutoRefresh from './useAutoRefresh';

const MONTHLY_HIGHLIGHTS = [
  {
    month: 'enero',
    theme: 'winter',
    icon: '✨',
    celebrations: [
      { date: '1 de enero', title: 'Año Nuevo', detail: 'Un momento para compartir buenos deseos y nuevos proyectos.' },
      { date: '6 de enero', title: 'Día de Reyes', detail: 'En México se comparte la tradicional Rosca de Reyes.' }
    ],
    curiosity: 'La figura del niño escondida en la rosca se relaciona con la celebración del Día de la Candelaria, el 2 de febrero.'
  },
  {
    month: 'febrero',
    theme: 'candle',
    icon: '🕯️',
    celebrations: [
      { date: '2 de febrero', title: 'Día de la Candelaria', detail: 'Una tradición mexicana para reunirse y compartir tamales.' },
      { date: '5 de febrero', title: 'Día de la Constitución', detail: 'Se conmemora la Constitución mexicana de 1917.' }
    ],
    curiosity: 'La Constitución de 1917 se promulgó en Querétaro y fue pionera en incluir derechos sociales.'
  },
  {
    month: 'marzo',
    theme: 'spring',
    icon: '🌱',
    celebrations: [
      { date: '21 de marzo', title: 'Natalicio de Benito Juárez', detail: 'Una fecha para recordar al expresidente mexicano nacido en Oaxaca.' },
      { date: '20 o 21 de marzo', title: 'Equinoccio de primavera', detail: 'La fecha exacta puede variar cada año.' }
    ],
    curiosity: 'Benito Juárez nació en 1806 en San Pablo Guelatao, en el estado de Oaxaca.'
  },
  {
    month: 'abril',
    theme: 'earth',
    icon: '🌼',
    celebrations: [
      { date: '22 de abril', title: 'Día de la Tierra', detail: 'Una invitación a cuidar el planeta y sus recursos.' },
      { date: '30 de abril', title: 'Día de la Niña y el Niño', detail: 'En México se celebra a las infancias.' }
    ],
    curiosity: 'El Día de la Tierra se conmemora internacionalmente cada 22 de abril.'
  },
  {
    month: 'mayo',
    theme: 'family',
    icon: '🌷',
    celebrations: [
      { date: '1 de mayo', title: 'Día del Trabajo', detail: 'Una fecha dedicada a reconocer los derechos laborales.' },
      { date: '10 de mayo', title: 'Día de las Madres', detail: 'En México se celebra en una fecha fija cada año.' }
    ],
    curiosity: 'A diferencia de muchos países, en México el Día de las Madres se celebra cada 10 de mayo.'
  },
  {
    month: 'junio',
    theme: 'ocean',
    icon: '☀️',
    celebrations: [
      { date: '5 de junio', title: 'Día Mundial del Medio Ambiente', detail: 'Una fecha para impulsar el cuidado de la naturaleza.' },
      { date: 'Tercer domingo', title: 'Día del Padre', detail: 'En México se celebra el tercer domingo de junio.' }
    ],
    curiosity: 'El solsticio de junio marca el inicio del verano astronómico en el hemisferio norte.'
  },
  {
    month: 'julio',
    theme: 'summer',
    icon: '🌞',
    celebrations: [
      { date: '20 de julio', title: 'Llegada a la Luna', detail: 'En 1969, la misión Apollo 11 llegó a la superficie lunar.' },
      { date: '30 de julio', title: 'Día Internacional de la Amistad', detail: 'Una ocasión para celebrar los lazos que nos unen.' }
    ],
    curiosity: 'El 20 de julio de 1969, Neil Armstrong fue la primera persona en caminar sobre la Luna.'
  },
  {
    month: 'agosto',
    theme: 'sunflower',
    icon: '🌻',
    celebrations: [
      { date: '12 de agosto', title: 'Día Internacional de la Juventud', detail: 'La ONU reconoce la participación de las juventudes.' },
      { date: '28 de agosto', title: 'Día de las Personas Adultas Mayores', detail: 'En México se reconoce su experiencia y aportaciones.' }
    ],
    curiosity: 'El nombre agosto honra al emperador romano Augusto.'
  },
  {
    month: 'septiembre',
    theme: 'independence',
    icon: '🎉',
    celebrations: [
      { date: '15 de septiembre', title: 'Noche del Grito', detail: 'La celebración cívica se realiza la noche previa al día de la Independencia.' },
      { date: '16 de septiembre', title: 'Día de la Independencia', detail: 'Se conmemora el inicio de la lucha por la Independencia de México.' }
    ],
    curiosity: 'El Grito de Dolores, que dio inicio al movimiento de Independencia, ocurrió en 1810.'
  },
  {
    month: 'octubre',
    theme: 'autumn',
    icon: '🍁',
    celebrations: [
      { date: '12 de octubre', title: 'Día de la Nación Pluricultural', detail: 'Una fecha para reconocer la diversidad cultural de México.' },
      { date: '31 de octubre', title: 'Noche de Halloween', detail: 'En México coincide con los días previos a las celebraciones de Día de Muertos.' }
    ],
    curiosity: 'Octubre debe su nombre a octo, que significa ocho: en el antiguo calendario romano era el octavo mes.'
  },
  {
    month: 'noviembre',
    theme: 'remembrance',
    icon: '🕯️',
    celebrations: [
      { date: '1 y 2 de noviembre', title: 'Día de Muertos', detail: 'Tradiciones para recordar y honrar a quienes ya no están.' },
      { date: '20 de noviembre', title: 'Revolución Mexicana', detail: 'Se conmemora el inicio del movimiento revolucionario de 1910.' }
    ],
    curiosity: 'La celebración indígena dedicada a los muertos en México fue inscrita por la UNESCO en 2008 como Patrimonio Cultural Inmaterial de la Humanidad.'
  },
  {
    month: 'diciembre',
    theme: 'holidays',
    icon: '⭐',
    celebrations: [
      { date: 'Del 16 al 24', title: 'Las Posadas', detail: 'Nueve noches de reuniones y tradiciones populares mexicanas.' },
      { date: '25 de diciembre', title: 'Navidad', detail: 'Una fecha para compartir en familia y comunidad.' }
    ],
    curiosity: 'Las Posadas mexicanas se celebran durante los nueve días previos a la Navidad.'
  }
];

const SEASONAL_DECORATIONS = {
  winter: { colors: ['#38bdf8', '#e0f2fe', '#818cf8', '#ffffff'], flower: 'snowflake' },
  candle: { colors: ['#f59e0b', '#fef3c7', '#c2410c', '#ffffff'], flower: 'candle' },
  spring: { colors: ['#16a34a', '#f472b6', '#facc15', '#7dd3fc'], flower: 'flower' },
  family: { colors: ['#be185d', '#fb7185', '#facc15', '#ffffff'], flower: 'flower' },
  summer: { colors: ['#0284c7', '#38bdf8', '#facc15', '#fb923c'], flower: 'sun' },
  independence: { colors: ['#15803d', '#ffffff', '#dc2626', '#15803d'], flower: 'star' },
  autumn: { colors: ['#c2410c', '#d97706', '#854d0e', '#fbbf24'], flower: 'leaf' },
  remembrance: { colors: ['#ea580c', '#c026d3', '#16a34a', '#2563eb'], flower: 'marigold' },
  revolution: { colors: ['#15803d', '#f8fafc', '#dc2626', '#d4a373'], flower: 'star' },
  holidays: { colors: ['#15803d', '#dc2626', '#facc15', '#ffffff'], flower: 'star' }
};

function getMexicoCalendarDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date);
  return {
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value)
  };
}

function getSeasonalDecoration(date) {
  const { month, day } = getMexicoCalendarDate(date);
  if ((month === 10 && day >= 25) || (month === 11 && day <= 2)) return 'remembrance';
  if (month === 11 && day <= 20) return 'revolution';
  if ((month === 12 && day >= 16) || (month === 1 && day <= 6)) return 'holidays';
  if (month === 9 && day >= 1 && day <= 16) return 'independence';
  if (month === 2 && day >= 1 && day <= 5) return 'candle';
  if ((month === 3 && day >= 20) || month === 4 || (month === 5 && day <= 10)) {
    return month === 5 ? 'family' : 'spring';
  }
  if ((month === 6 && day <= 5) || (month === 6 && day >= 21) || month === 7 || month === 8) return 'summer';
  if (month === 9 || month === 10 || (month === 11 && day > 20)) return 'autumn';
  if (month === 12 || month === 1) return 'winter';
  if (month === 2 || month === 3) return 'spring';
  return 'summer';
}

function PortalSeasonalDecor({ theme }) {
  const decoration = SEASONAL_DECORATIONS[theme];
  const flags = Array.from({ length: 14 }, (_, index) => {
    const x = 12 + index * 70;
    const position = x / 1000;
    const y = 7 + 48 * position * (1 - position);
    return (
      <g key={x} transform={`translate(${x} ${y})`}>
        <g
          className="client-papel-picado-flag"
          style={{ '--flag-index': index }}
        >
          <path
            d="M0 0h60v27c-6-4-10-3-13 3l-5 7c-3 5-9 5-12 0l-5-7c-3-6-8-7-13-3L0 27Z"
            fill={decoration.colors[index % decoration.colors.length]}
          />
          <path d="M30 5c-5-6-10 0 0 7 10-7 5-13 0-7Z" fill="#fff8ed" opacity=".92" />
          <path d="M30 14v10m-9-5h18m-14-4 10 10m0-10L25 25" stroke="#fff8ed" strokeWidth="1.8" opacity=".9" />
          <circle cx="30" cy="19" r="3.3" fill={decoration.colors[index % decoration.colors.length]} />
          <path d="M7 24c4-5 7-5 11 0m35 0c-4-5-7-5-11 0M10 8l5 4m35-4-5 4" fill="none" stroke="#fff8ed" strokeLinecap="round" strokeWidth="1.6" opacity=".9" />
          <circle cx="11" cy="18" r="1.4" fill="#fff8ed" />
          <circle cx="49" cy="18" r="1.4" fill="#fff8ed" />
        </g>
      </g>
    );
  });

  return (
    <div className={`client-season-decor client-season-decor--${theme}`} aria-hidden="true">
      {/* Guirnalda superior de papel picado (papel china) */}
      <svg className="client-season-garland" viewBox="0 0 1000 60" preserveAspectRatio="none">
        <path d="M8 7 Q500 31 992 7" fill="none" stroke="#7c5c43" strokeWidth="2.5" />
        {flags.map((flag, index) => (
          <path
            key={`string-${index}`}
            d={`M${12 + index * 70} ${7 + 48 * (12 + index * 70) / 1000 * (1 - (12 + index * 70) / 1000)} v4`}
            stroke="#7c5c43"
            strokeWidth="1.4"
          />
        ))}
        {flags}
      </svg>

      {(theme === 'spring' || theme === 'family') && (
        <>
          <span className="client-season-flower client-season-flower--top-left"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--top-right"><SeasonalFlower /></span>
        </>
      )}

      {theme === 'remembrance' && (
        <>
          {/* Tiras laterales de papel china en ambos bordes */}
          <SidePapelChina side="left" />
          <SidePapelChina side="right" />

          {/* Flores de cempasúchil en todo el borde izquierdo */}
          <span className="client-season-flower client-season-flower--top-left"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--mid-left"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--lower-left"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--bottom-left"><SeasonalFlower /></span>

          {/* Flores de cempasúchil en todo el borde derecho */}
          <span className="client-season-flower client-season-flower--top-right"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--mid-right"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--lower-right"><SeasonalFlower /></span>
          <span className="client-season-flower client-season-flower--bottom-right"><SeasonalFlower /></span>

          {/* Mariposas monarca aleteando en ambos bordes */}
          <span className="client-season-butterfly client-season-butterfly--top-left"><MonarchButterfly /></span>
          <span className="client-season-butterfly client-season-butterfly--mid-left"><MonarchButterfly /></span>
          <span className="client-season-butterfly client-season-butterfly--lower-left"><MonarchButterfly /></span>

          <span className="client-season-butterfly client-season-butterfly--top-right"><MonarchButterfly /></span>
          <span className="client-season-butterfly client-season-butterfly--mid-right"><MonarchButterfly /></span>
          <span className="client-season-butterfly client-season-butterfly--lower-right"><MonarchButterfly /></span>

          {/* Calaverita en los bordes laterales */}
          <span className="client-season-skull client-season-skull--side-left"><SugarSkull /></span>
          <span className="client-season-skull client-season-skull--side-right"><SugarSkull /></span>

          {/* En el centro parte baja: Altarcito acompañado de dos calaveritas de azúcar a los lados */}
          <div className="client-season-altar-dock">
            <span className="client-season-altar-flank client-season-altar-flank--left" title="Calaverita de azúcar">
              <SugarSkull />
            </span>
            <div className="client-season-altar" title="Altarcito de Día de Muertos">
              <DiaDeMuertosAltar />
            </div>
            <span className="client-season-altar-flank client-season-altar-flank--right" title="Calaverita de azúcar">
              <SugarSkull />
            </span>
          </div>
        </>
      )}

      {theme === 'revolution' && (
        <span className="client-season-rosette client-season-rosette--left">✦</span>
      )}
      {theme === 'holidays' && (
        <>
          <span className="client-season-ornament client-season-ornament--left">✦</span>
          <span className="client-season-ornament client-season-ornament--right">✦</span>
        </>
      )}
    </div>
  );
}

function SidePapelChina({ side = 'left' }) {
  const flags = [
    { color: '#ea580c', delay: '-0.3s' },
    { color: '#c026d3', delay: '-0.8s' },
    { color: '#16a34a', delay: '-1.4s' },
    { color: '#2563eb', delay: '-1.9s' },
    { color: '#facc15', delay: '-2.5s' }
  ];
  return (
    <div className={`client-season-side-flags client-season-side-flags--${side}`}>
      {flags.map((item, index) => (
        <svg key={index} viewBox="0 0 38 42" className="client-side-flag" style={{ animationDelay: item.delay }}>
          <path d="M 3 2 h 32 v 28 l -8 -5 l -8 5 l -8 -5 l -8 5 Z" fill={item.color} />
          <circle cx="19" cy="14" r="3.6" fill="#ffffff" opacity="0.85" />
          <path d="M 11 8 l 4 4 M 27 8 l -4 4 M 13 20 l 3 -3 M 25 20 l -3 -3" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        </svg>
      ))}
    </div>
  );
}

function DiaDeMuertosAltar() {
  return (
    <svg viewBox="0 0 240 160" className="client-altar-svg" aria-label="Altarcito de Día de Muertos">
      <defs>
        <radialGradient id="altar-candle-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="altar-bread-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {/* Arco de flor de cempasúchil */}
      <path d="M 40 148 C 40 38, 200 38, 200 148" fill="none" stroke="#78350f" strokeWidth="3" opacity="0.35" />
      {Array.from({ length: 17 }, (_, i) => {
        const t = (i + 0.5) / 17;
        const angle = Math.PI * (1 - t);
        const cx = 120 - 78 * Math.cos(angle);
        const cy = 142 - 105 * Math.sin(angle);
        const color = i % 2 === 0 ? '#f97316' : '#fbbf24';
        const innerColor = i % 2 === 0 ? '#fbbf24' : '#ea580c';
        return (
          <g key={`arch-flower-${i}`} transform={`translate(${cx} ${cy})`}>
            <circle r="7.2" fill={color} />
            <circle r="4.2" fill={innerColor} />
            <circle r="1.8" fill="#78350f" />
          </g>
        );
      })}

      {/* Nivel 3 - Escalon Superior */}
      <g className="altar-tier-3">
        <rect x="85" y="66" width="70" height="26" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M 85 78 h 70 v 14 l -5 -4 l -5 4 l -5 -4 l -5 4 l -5 -4 l -5 4 l -5 -4 l -5 4 l -5 -4 l -5 4 l -5 -4 l -5 4 l -5 -4 l -5 4 Z" fill="#9333ea" />
        <circle cx="95" cy="84" r="1.5" fill="#f8fafc" />
        <circle cx="105" cy="84" r="1.5" fill="#f8fafc" />
        <circle cx="115" cy="84" r="1.5" fill="#f8fafc" />
        <circle cx="125" cy="84" r="1.5" fill="#f8fafc" />
        <circle cx="135" cy="84" r="1.5" fill="#f8fafc" />
        <circle cx="145" cy="84" r="1.5" fill="#f8fafc" />

        {/* Retablo / Cuadro con recuerdo */}
        <rect x="106" y="44" width="28" height="24" rx="2" fill="#fbbf24" stroke="#b45309" strokeWidth="1.8" />
        <rect x="109" y="47" width="22" height="18" rx="1" fill="#475569" />
        <circle cx="120" cy="56" r="4.8" fill="#fde047" opacity="0.9" />
        <path d="M 120 50 Q 123 54 120 58 Q 117 54 120 50 Z" fill="#f97316" />
      </g>

      {/* Nivel 2 - Escalon Intermedio */}
      <g className="altar-tier-2">
        <rect x="58" y="90" width="124" height="28" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M 58 102 h 124 v 16 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 Z" fill="#db2777" />
        {Array.from({ length: 11 }, (_, i) => (
          <circle key={`t2-dot-${i}`} cx={64 + i * 11} cy="108" r="1.4" fill="#ffffff" />
        ))}

        {/* Veladora izquierda */}
        <rect x="68" y="78" width="10" height="13" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
        <path d="M 73 78 v -4" stroke="#334155" strokeWidth="1" strokeLinecap="round" />
        <circle cx="73" cy="71" r="7" fill="url(#altar-candle-glow)" className="client-candle-glow" />
        <path d="M 73 68 Q 75 72 73 75 Q 71 72 73 68 Z" fill="#f59e0b" className="client-candle-flame" />

        {/* Veladora derecha */}
        <rect x="162" y="78" width="10" height="13" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
        <path d="M 167 78 v -4" stroke="#334155" strokeWidth="1" strokeLinecap="round" />
        <circle cx="167" cy="71" r="7" fill="url(#altar-candle-glow)" className="client-candle-glow" />
        <path d="M 167 68 Q 169 72 167 75 Q 165 72 167 68 Z" fill="#f59e0b" className="client-candle-flame" />

        {/* Pan de Muerto tradicional */}
        <g transform="translate(120 86)">
          <ellipse cx="0" cy="2" rx="15" ry="9" fill="url(#altar-bread-grad)" stroke="#78350f" strokeWidth="1" />
          <path d="M -11 0 Q 0 -3 11 0 M -8 -4 Q 0 4 8 4" stroke="#fef3c7" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="0" cy="-2" r="2.8" fill="#fef3c7" />
          <circle cx="-5" cy="1" r="0.8" fill="#ffffff" />
          <circle cx="5" cy="0" r="0.8" fill="#ffffff" />
          <circle cx="1" cy="4" r="0.8" fill="#ffffff" />
        </g>
      </g>

      {/* Nivel 1 - Escalon Inferior / Base */}
      <g className="altar-tier-1">
        <rect x="25" y="116" width="190" height="32" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M 25 128 h 190 v 18 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 l -5.5 5 l -5.5 -5 Z" fill="#ea580c" />
        {Array.from({ length: 17 }, (_, i) => (
          <circle key={`t1-dot-${i}`} cx={32 + i * 11} cy="135" r="1.5" fill="#fef08a" />
        ))}

        {/* Jarrito de barro */}
        <g transform="translate(42 114)">
          <path d="M 0 0 Q -5 4 -3 10 Q 0 13 6 13 Q 12 13 15 10 Q 17 4 12 0 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
          <circle cx="6" cy="-2" r="5" fill="#fbbf24" />
          <circle cx="6" cy="-2" r="2.5" fill="#ea580c" />
        </g>

        {/* Canasta de frutas */}
        <g transform="translate(182 116)">
          <ellipse cx="6" cy="7" rx="10" ry="5" fill="#a16207" stroke="#78350f" strokeWidth="1" />
          <circle cx="2" cy="4" r="3.5" fill="#dc2626" />
          <circle cx="8" cy="3" r="3.8" fill="#f97316" />
          <circle cx="11" cy="5" r="3" fill="#84cc16" />
        </g>

        {/* Sahumador con copal */}
        <g transform="translate(120 118)">
          <path d="M -6 10 L 6 10 L 4 4 L 7 1 L -7 1 L -4 4 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
          <path d="M 0 0 Q 3 -5 0 -10 Q -3 -15 1 -20" fill="none" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" className="client-copal-smoke" />
        </g>
      </g>

      {/* Camino de pétalos en la base */}
      <g className="altar-petals">
        <ellipse cx="120" cy="152" rx="42" ry="5" fill="#f97316" opacity="0.85" />
        <ellipse cx="120" cy="152" rx="28" ry="3.5" fill="#fbbf24" opacity="0.9" />
        <circle cx="85" cy="151" r="2" fill="#ea580c" />
        <circle cx="95" cy="154" r="2.5" fill="#fbbf24" />
        <circle cx="145" cy="152" r="2" fill="#ea580c" />
        <circle cx="155" cy="154" r="2.5" fill="#f97316" />
      </g>
    </svg>
  );
}

function SeasonalFlower() {
  return (
    <svg viewBox="0 0 100 100">
      <path d="M50 68c-1 12-4 20-12 27m12-19c8 2 15 6 20 13M49 81c-9-5-16-4-24 0" fill="none" stroke="#3f7d3b" strokeWidth="4" strokeLinecap="round" />
      <path d="M46 81c-12-11-18-8-23-3 7 8 14 9 23 3Zm9 3c11-10 18-7 22-2-7 8-14 8-22 2Z" fill="#5b963f" />
      <circle cx="50" cy="48" r="32" fill="#b94a0c" />
      {Array.from({ length: 20 }, (_, index) => (
        <ellipse
          key={index}
          cx="50"
          cy="25"
          rx="5.6"
          ry="17"
          transform={`rotate(${index * 18} 50 48)`}
          fill={index % 3 ? '#f97316' : '#fbbf24'}
        />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <ellipse
          key={`inner-${index}`}
          cx="50"
          cy="35"
          rx="3.8"
          ry="10"
          transform={`rotate(${index * 30 + 15} 50 48)`}
          fill={index % 2 ? '#fbbf24' : '#fb923c'}
        />
      ))}
      <circle cx="50" cy="48" r="12" fill="#7c2d12" />
      <circle cx="50" cy="48" r="8" fill="#a34b17" />
      {Array.from({ length: 9 }, (_, index) => (
        <circle
          key={`seed-${index}`}
          cx={50 + Math.cos(index * Math.PI * 2 / 9) * 5}
          cy={48 + Math.sin(index * Math.PI * 2 / 9) * 5}
          r="1.2"
          fill="#fde68a"
        />
      ))}
    </svg>
  );
}

function SugarSkull() {
  const eyePetals = Array.from({ length: 8 }, (_, index) => (
    <ellipse
      key={index}
      cx="0"
      cy="-8"
      rx="3.2"
      ry="5.2"
      transform={`rotate(${index * 45})`}
      fill={index % 2 ? '#ec4899' : '#fbbf24'}
    />
  ));

  return (
    <svg viewBox="0 0 90 104">
      <path d="M45 5C23 5 10 20 11 43c0 12 3 21 9 27 4 4 8 6 13 7l2 13c1 5 5 6 10 1 5 5 9 4 10-1l2-13c5-1 9-3 13-7 6-6 9-15 9-27C79 20 66 5 45 5Z" fill="#fff8e9" stroke="#624331" strokeWidth="3" />
      <path d="M20 32c5-7 12-9 20-7m10 0c8-2 15 0 20 7M22 60c6 4 13 5 20 5m6 0c7 0 14-1 20-5" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" />
      <g transform="translate(30 43)">
        <circle r="12" fill="#7c2d12" />
        {eyePetals}
        <circle r="3.5" fill="#fef3c7" />
      </g>
      <g transform="translate(60 43)">
        <circle r="12" fill="#7c2d12" />
        {eyePetals}
        <circle r="3.5" fill="#fef3c7" />
      </g>
      <path d="m45 51-5 8h10Z" fill="#7c2d12" />
      <path d="M31 70h28m-24 0v8m8-8v10m8-10v10m8-10v8" stroke="#624331" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 45c-5 1-7 4-6 8m60-8c5 1 7 4 6 8M35 17c3-4 7-5 10-2 3-3 7-2 10 2" fill="none" stroke="#7e22ce" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M45 15v7m-4-3h8" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="57" r="2" fill="#2563eb" />
      <circle cx="73" cy="57" r="2" fill="#2563eb" />
    </svg>
  );
}

function MonarchButterfly() {
  return (
    <svg viewBox="0 0 90 76">
      <g className="client-butterfly-wing client-butterfly-wing--left">
        <path d="M43 36C31 12 10 3 6 15c-5 14 7 28 32 30-17 0-26 13-18 22 8 8 20-2 25-20Z" fill="#f97316" stroke="#38251c" strokeWidth="3" strokeLinejoin="round" />
        <path d="M39 38C27 26 17 18 8 16m28 23C24 39 16 43 12 51m26-10c-7 7-11 14-13 21" fill="none" stroke="#38251c" strokeWidth="2.5" />
        <path d="M13 18c2-3 5-3 7 0m4 5c2-3 5-3 7 0m-16 7c2-3 5-3 7 0m8 26c2-2 5-2 7 1" fill="none" stroke="#fff6e8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="client-butterfly-wing client-butterfly-wing--right">
        <path d="M47 36C59 12 80 3 84 15c5 14-7 28-32 30 17 0 26 13 18 22-8 8-20-2-25-20Z" fill="#f97316" stroke="#38251c" strokeWidth="3" strokeLinejoin="round" />
        <path d="M51 38c12-12 22-20 31-22M54 39c14 0 22 4 26 12M52 41c7 7 11 14 13 21" fill="none" stroke="#38251c" strokeWidth="2.5" />
        <path d="M77 18c-2-3-5-3-7 0m-4 5c-2-3-5-3-7 0m16 7c-2-3-5-3-7 0m-8 26c-2-2-5-2-7 1" fill="none" stroke="#fff6e8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M45 31c-4 8-4 17 0 28 4-11 4-20 0-28Z" fill="#38251c" />
      <path d="M43 32c-2-8-6-10-9-11m13 11c2-8 6-10 9-11" fill="none" stroke="#38251c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="20" r="1.5" fill="#38251c" />
      <circle cx="56" cy="20" r="1.5" fill="#38251c" />
    </svg>
  );
}

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              const parts = [];
              if (item.type || item.name) parts.push(item.type || item.name);
              if (item.measurements && item.measurements !== '0') parts.push(`Medidas: ${item.measurements}`);
              if (item.notes) parts.push(item.notes);
              if (parts.length) return `• ${parts.join(' — ')}`;
            }
            return `• ${typeof item === 'string' ? item : JSON.stringify(item)}`;
          }).join('\n');
        }
      } catch {
        // Fallback al valor como texto
      }
    }
    return value;
  }
  return JSON.stringify(value, null, 2);
};

export default function ClientPortal() {
  const [project, setProject] = useState(null);
  const [publicId, setPublicId] = useState('');
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMonthlyCuriosity, setShowMonthlyCuriosity] = useState(false);
  const [monthlyContext, setMonthlyContext] = useState(null);
  const [seasonalTheme, setSeasonalTheme] = useState('');

  useEffect(() => {
    const updateMonthlyContext = () => {
      const today = new Date();
      const isPreviewingNextMonth = today.getDate() >= 25;
      const monthIndex = (today.getMonth() + Number(isPreviewingNextMonth)) % MONTHLY_HIGHLIGHTS.length;
      setMonthlyContext({ isPreviewingNextMonth, monthIndex });
    };

    updateMonthlyContext();
    const intervalId = window.setInterval(updateMonthlyContext, 60 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const updateSeasonalTheme = () => setSeasonalTheme(getSeasonalDecoration(new Date()));
    updateSeasonalTheme();
    const intervalId = window.setInterval(updateSeasonalTheme, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const refreshProject = useCallback(async () => {
    if (!credentials) return;
    try {
      const response = await fetch('/api/client-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (response.status === 401) {
        setProject(null);
        setCredentials(null);
        setPassword('');
        setLoginError('La contraseña cambió o el acceso fue revocado. Ingresa de nuevo.');
        return;
      }
      if (!response.ok) throw new Error('No se pudo actualizar el proyecto.');
      setProject(await response.json());
      setSyncError('');
    } catch (error) {
      setSyncError(error.message || 'No se pudo actualizar el proyecto.');
    }
  }, [credentials]);

  useAutoRefresh(refreshProject, { enabled: Boolean(credentials), intervalMs: 30000 });

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const loginCredentials = { public_id: publicId.trim().toUpperCase(), password };
      const response = await fetch('/api/client-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials)
      });
      let result = null;
      try {
        result = await response.json();
      } catch {
        throw new Error(response.status >= 500 ? 'El servidor del portal de clientes no pudo procesar la solicitud en este momento. Intenta nuevamente.' : `Error de comunicación (${response.status})`);
      }
      if (!response.ok) throw new Error(result?.detail || 'No se pudo validar el acceso.');
      setCredentials(loginCredentials);
      setProject(result);
      setPassword('');
      setSyncError('');
    } catch (error) {
      setLoginError(error.message || 'No se pudo validar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCredentials(null);
    setProject(null);
    setPassword('');
    setLoginError('');
    setSyncError('');
  };

  const isEmbedded = typeof window !== 'undefined' && window.parent !== window;

  if (!project) {
    return (
      <main className="client-portal-login" style={{ minHeight: isEmbedded ? 'auto' : '100vh', padding: isEmbedded ? '0.25rem 0' : '1.5rem 0' }}>
        <section id="client-portal-container" className="client-portal-login-form">
          {loginError && <div role="alert" style={{ marginBottom: 14, padding: '0.7rem 0.8rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.82rem' }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <label htmlFor="client-public-id" style={{ display: 'block', marginBottom: 5, color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>ID del contrato</label>
            <input id="client-public-id" type="text" required autoCapitalize="characters" autoComplete="username" value={publicId} onChange={event => setPublicId(event.target.value)} placeholder="Ej. DSN49X"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.78rem 0.85rem', marginBottom: 14, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem' }} />
            <label htmlFor="client-password" style={{ display: 'block', marginBottom: 5, color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>Contraseña de acceso</label>
            <input id="client-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.78rem 0.85rem', marginBottom: 18, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem' }} />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #ba4b24 0%, #7c2d12 100%)', color: '#fff', border: 0, borderRadius: 8, fontWeight: 800, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Validando...' : 'Ver mi proyecto'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const projectDetails = [
    ['Tipo de proyecto', project.project_type],
    ['Detalle solicitado', project.project_type_other],
    ['Descripción del proyecto', project.restoration_details],
    ['Descripción acordada', project.quote_description],
    ['Prioridades', project.project_priorities],
    ['Lo que esperas del proyecto', project.expectations]
  ].map(([label, value]) => [label, displayValue(value)]).filter(([, value]) => value);
  const tracking = getProjectTrackingProgress(project);
  const hasProductionStages = tracking.production.stages.length > 0
    || tracking.workItems.some(item => Array.isArray(item.production_data?.stages) && item.production_data.stages.length > 0);
  const monthlyHighlight = monthlyContext ? MONTHLY_HIGHLIGHTS[monthlyContext.monthIndex] : null;

  return (
    <main style={{
      minHeight: isEmbedded ? 'auto' : '100vh',
      padding: isEmbedded ? '0.25rem 0 1rem' : '1.25rem',
      background: isEmbedded ? 'transparent' : '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div className={`client-portal-frame client-portal-frame--${seasonalTheme || 'default'}`}>
        {seasonalTheme && <PortalSeasonalDecor theme={seasonalTheme} />}
        <div id="client-portal-container" className="client-portal-content" style={{ width: 'min(100%, 960px)', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '0.9rem 1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-rd-oficial.png?v=2" alt="RD Carpintería" style={{ height: 48, width: 'auto', maxWidth: 80, objectFit: 'contain', display: 'block' }} />
            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Portal de clientes</div>
              <h1 style={{ margin: '0.15rem 0 0', color: '#172b4d', fontSize: '1.2rem' }}>Hola, {project.name || 'cliente'}</h1>
              <div style={{ marginTop: 3, color: '#64748b', fontSize: '0.76rem' }}>ID de contrato: <strong>{project.public_id}</strong></div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} style={{ padding: '0.55rem 0.85rem', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </header>

        {syncError && (
          <div role="status" style={{ marginTop: 12, padding: '0.7rem 0.85rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: '0.82rem' }}>
            {syncError} Se volverá a intentar automáticamente.
          </div>
        )}

        <ProjectTracking prospect={project} showEvidence requestDetails={projectDetails} />

        {!hasProductionStages && (
          <section style={{ marginTop: 12, padding: '1rem', background: '#fff', border: '1px solid #dbe5ef', borderRadius: 14, boxShadow: '0 3px 12px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ margin: '0 0 0.75rem', color: '#172b4d', fontSize: '1rem' }}>Lo que solicitaste</h2>
            {projectDetails.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {projectDetails.map(([label, value]) => (
                  <div key={label}>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ marginTop: 3, color: '#334155', fontSize: '0.86rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>Aún no hay una descripción capturada para este proyecto.</p>
            )}
          </section>
        )}

        {monthlyHighlight && <section className={`client-monthly-highlight client-monthly-highlight--${monthlyHighlight.theme}`} aria-labelledby="client-monthly-title">
          <div className="client-monthly-heading">
            <span className="client-monthly-icon" aria-hidden="true">{monthlyHighlight.icon}</span>
            <div>
              <div className="client-monthly-eyebrow">{monthlyContext.isPreviewingNextMonth ? 'Se acerca' : 'Este mes'}</div>
              <h2 id="client-monthly-title">Tradiciones de {monthlyHighlight.month}</h2>
            </div>
          </div>
          <div className="client-monthly-events">
            {monthlyHighlight.celebrations.map(event => (
              <article className="client-monthly-event" key={event.title}>
                <span className="client-monthly-date">{event.date}</span>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="client-monthly-toggle"
            aria-expanded={showMonthlyCuriosity}
            aria-controls="client-monthly-curiosity"
            onClick={() => setShowMonthlyCuriosity(value => !value)}
          >
            {showMonthlyCuriosity ? 'Ocultar dato curioso' : 'Descubrir dato curioso'}
            <span aria-hidden="true">{showMonthlyCuriosity ? '−' : '+'}</span>
          </button>
          {showMonthlyCuriosity && (
            <p className="client-monthly-curiosity" id="client-monthly-curiosity">
              <strong>¿Sabías que?</strong> {monthlyHighlight.curiosity}
            </p>
          )}
        </section>}

        <p style={{ margin: '1rem 0', color: '#94a3b8', textAlign: 'center', fontSize: '0.72rem' }}>
          La información de avance se actualiza automáticamente.
        </p>
        </div>
      </div>
    </main>
  );
}
