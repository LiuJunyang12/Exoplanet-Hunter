export interface PlanetData {
  name: string;
  zhName?: string;
  trueDepth: number; // in %
  truePeriod: number; // in days
  trueRadius: number; // in R_earth
  trueDistance: number; // in AU
  temp: number; // in K
  habitable: boolean;
  gases: string[];
  desc: string;
  zhDesc?: string;
}

export interface StarSystem {
  id: string;
  name: string;
  type: string;
  zhType?: string;
  mass: number; // M_sun
  radius: number; // R_sun
  temp: number; // K
  color: string;
  noiseLevel: number;
  planet: PlanetData;
}

export type FilterType = 'VIS' | 'IR' | 'UV';

export const STAR_SYSTEMS: StarSystem[] = [
  {
    id: 'trappist1',
    name: 'TRAPPIST-1',
    type: 'M8.5V (Ultra-Cool Red Dwarf)',
    zhType: 'M8.5V (超冷红矮星)',
    mass: 0.09, // M_sun
    radius: 0.12, // R_sun
    temp: 2560, // K
    color: '#ff6b4a',
    noiseLevel: 0.3,
    planet: {
      name: 'TRAPPIST-1 e',
      zhName: 'TRAPPIST-1 e',
      trueDepth: 0.72, // %
      truePeriod: 6.1, // days
      trueRadius: 0.92, // R_earth
      trueDistance: 0.029, // AU
      temp: 250, // K
      habitable: true,
      gases: ['H₂O', 'CO₂', 'O₃'],
      desc: 'A terrestrial world orbiting in the core habitable zone. JWST spectroscopy detected strong signatures of atmospheric water vapor and ozone!',
      zhDesc: '一颗位于宜居带核心区的类地岩石行星。韦伯望远镜光谱分析探测到显著的水蒸气(H₂O)和臭氧(O₃)大气吸收谱线！'
    }
  },
  {
    id: 'proximacentauri',
    name: 'Proxima Centauri',
    type: 'M5.5V (Red Dwarf)',
    zhType: 'M5.5V (红矮星)',
    mass: 0.12,
    radius: 0.15,
    temp: 3042,
    color: '#ff8c66',
    noiseLevel: 0.8, // Flare noise in VIS
    planet: {
      name: 'Proxima Centauri b',
      zhName: '比邻星 b',
      trueDepth: 0.35,
      truePeriod: 11.2,
      trueRadius: 1.07,
      trueDistance: 0.048,
      temp: 234,
      habitable: true,
      gases: ['N₂', 'CO₂'],
      desc: 'The closest known exoplanet to Earth! Despite intense stellar UV flaring, a robust planetary magnetosphere may protect its atmosphere.',
      zhDesc: '距离地球最近的已知系外行星！虽然母星存在较强紫外耀斑，但强大的行星磁场可能有效保护了其稠密大气层。'
    }
  },
  {
    id: 'lhs1140',
    name: 'LHS 1140',
    type: 'M4.5V (Dim Red Dwarf)',
    zhType: 'M4.5V (平静暗弱红矮星)',
    mass: 0.18,
    radius: 0.21,
    temp: 3216,
    color: '#ffa366',
    noiseLevel: 0.2,
    planet: {
      name: 'LHS 1140 b',
      zhName: 'LHS 1140 b',
      trueDepth: 1.25,
      truePeriod: 24.7,
      trueRadius: 1.73,
      trueDistance: 0.093,
      temp: 226,
      habitable: true,
      gases: ['H₂O', 'N₂', 'CH₄'],
      desc: 'A promising Super-Earth in a quiet stellar environment. Density models suggest a potential global liquid ocean or icy ocean world.',
      zhDesc: '母星极为平静的优质超级地球候选体。密度与热力学模型表明它极可能拥有全球性液态水海洋或富冰水世界。'
    }
  },
  {
    id: 'hd209458',
    name: 'HD 209458 (Osiris)',
    type: 'G0V (Sun-like Yellow Dwarf)',
    zhType: 'G0V (类太阳黄矮星)',
    mass: 1.15,
    radius: 1.20,
    temp: 6065,
    color: '#fff4e6',
    noiseLevel: 0.15,
    planet: {
      name: 'HD 209458 b (Osiris)',
      zhName: 'HD 209458 b (奥西里斯)',
      trueDepth: 1.48,
      truePeriod: 3.5,
      trueRadius: 13.8, // Hot Jupiter
      trueDistance: 0.047,
      temp: 1400,
      habitable: false,
      gases: ['Na', 'CO', 'H₂O'],
      desc: 'A classic "Hot Jupiter"! Scorching surface temperatures cause its atmosphere to expand rapidly, forming a comet-like evaporating tail.',
      zhDesc: '著名的“热木星”原型！由于极度贴近母星，地表超过1400K的高温使其大气剧烈蒸发外逸，拖曳出类似彗星的气体尾巴。'
    }
  },
  {
    id: 'kepler1649',
    name: 'Kepler-1649',
    type: 'M5.0V (Red Dwarf)',
    zhType: 'M5.0V (红矮星)',
    mass: 0.22,
    radius: 0.23,
    temp: 3240,
    color: '#ff9980',
    noiseLevel: 0.25,
    planet: {
      name: 'Kepler-1649 c',
      zhName: '开普勒-1649 c',
      trueDepth: 0.65,
      truePeriod: 19.5,
      trueRadius: 1.06,
      trueDistance: 0.065,
      temp: 234,
      habitable: true,
      gases: ['O₂', 'N₂', 'CO₂'],
      desc: 'An Earth-size exoplanet re-analyzed in archival Kepler data! Highly similar to Earth in radius and stellar irradiation levels.',
      zhDesc: '从开普勒封存数据中重新挖掘出的珍贵宝藏！其半径约为地球的1.06倍，接收到的母星光照通量与地球高度吻合。'
    }
  }
];
