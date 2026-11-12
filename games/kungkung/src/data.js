// 공룡, 먹이, 모자, 화석 데이터.
window.DinoData = {
  STAGE_LABEL: { baby: '아기', kid: '어린이', adult: '어른' },
  BUS_M: 12,

  COLORS: {
    fern: { label: '풀잎', c0: '#A8E86B', c1: '#5CBF45', cd: '#2E8B4A', c2: '#EAF7B4', c3: '#1F7A5C', ln: '#14503D' },
    coral: { label: '산호', c0: '#FFB27A', c1: '#F9774B', cd: '#D1432F', c2: '#FFE9C4', c3: '#B8312E', ln: '#7A1F24' },
    lagoon: { label: '바다', c0: '#7FE3EA', c1: '#2FB3D1', cd: '#1878A8', c2: '#D8F8EE', c3: '#125E93', ln: '#0C3F6B' },
    sun: { label: '햇살', c0: '#FFE27A', c1: '#FBB829', cd: '#E0851A', c2: '#FFF6CF', c3: '#C8611A', ln: '#7F3B12' },
    berry: { label: '열매', c0: '#F7A6D2', c1: '#DB5FA8', cd: '#A9368C', c2: '#FFE6F1', c3: '#7E2A83', ln: '#4F1A5E' },
  },

  // 일꾼 공룡. cost는 첫 고용 비용, rate는 레벨 1의 초당 코인.
  WORKERS: [
    { id: 'berry', species: 'stego', name: '열매 줍기', cost: 15, rate: 0.5 },
    { id: 'fish', species: 'ptero', name: '물고기 잡기', cost: 100, rate: 3 },
    { id: 'shell', species: 'para', name: '조개 캐기', cost: 1100, rate: 16 },
    { id: 'rock', species: 'tricera', name: '돌 나르기', cost: 12000, rate: 90 },
    { id: 'ore', species: 'ankylo', name: '광석 캐기', cost: 130000, rate: 520 },
    { id: 'tree', species: 'brachio', name: '높은 열매 따기', cost: 1400000, rate: 3000 },
    { id: 'post', species: 'raptor', name: '번개 배달', cost: 20000000, rate: 20000 },
    { id: 'dive', species: 'spino', name: '보물 잠수', cost: 330000000, rate: 140000 },
  ],

  // 평생 번 코인으로 오르는 섬 등급.
  // 오래 두고 이루는 목표. stat은 idle.js의 achvStats가 만드는 값의 이름이다.
  ACHIEVEMENTS: [
    { id: 'coin1', name: '코인 모으기 시작', text: '코인을 모두 1만 개 모아요', stat: 'life', goal: 1e4, stars: 5 },
    { id: 'coin2', name: '코인 부자', text: '코인을 모두 100만 개 모아요', stat: 'life', goal: 1e6, stars: 15 },
    { id: 'coin3', name: '코인 대장', text: '코인을 모두 1억 개 모아요', stat: 'life', goal: 1e8, stars: 40 },
    { id: 'coin4', name: '코인의 왕', text: '코인을 모두 100억 개 모아요', stat: 'life', goal: 1e10, stars: 80 },
    { id: 'friend1', name: '친구가 생겼어요', text: '공룡 친구를 3마리 모아요', stat: 'dinos', goal: 3, stars: 10 },
    { id: 'friend2', name: '북적북적 공룡섬', text: '공룡 친구를 6마리 모아요', stat: 'dinos', goal: 6, stars: 25 },
    { id: 'friend3', name: '공룡 박사', text: '공룡 친구를 모두 모아요', stat: 'dinos', goal: 10, stars: 60 },
    { id: 'adult1', name: '다 컸어요', text: '공룡 3마리를 어른으로 키워요', stat: 'adults', goal: 3, stars: 20 },
    { id: 'plus1', name: '튼튼 공룡', text: '공룡 한 마리를 +5까지 강화해요', stat: 'plusBest', goal: 5, stars: 10 },
    { id: 'plus2', name: '최강 공룡', text: '공룡 한 마리를 +10까지 강화해요', stat: 'plusBest', goal: 10, stars: 30 },
    { id: 'plus3', name: '강화 달인', text: '강화 단계를 모두 합쳐 30을 채워요', stat: 'plusSum', goal: 30, stars: 50 },
    { id: 'boss1', name: '첫 보스 승리', text: '지역 보스를 1마리 이겨요', stat: 'regions', goal: 1, stars: 10 },
    { id: 'boss2', name: '섬의 영웅', text: '모든 지역의 보스를 이겨요', stat: 'regions', goal: 5, stars: 50 },
    { id: 'move1', name: '새 섬으로', text: '새 섬으로 1번 이사해요', stat: 'moves', goal: 1, stars: 15 },
    { id: 'move2', name: '섬 탐험가', text: '새 섬으로 5번 이사해요', stat: 'moves', goal: 5, stars: 40 },
    { id: 'fossil1', name: '화석 수집가', text: '화석을 모두 찾아요', stat: 'fossils', goal: 6, stars: 30 },
    { id: 'stamp1', name: '꾸준한 친구', text: '도장을 7개 모아요', stat: 'stamps', goal: 7, stars: 20 },
  ],
  RANKS: [
    { at: 0, name: '작은 둥지', stars: 0 },
    { at: 1e3, name: '열매 마을', stars: 10 },
    { at: 1e5, name: '공룡 마을', stars: 15 },
    { at: 1e6, name: '번쩍 항구', stars: 20 },
    { at: 1e7, name: '황금 도시', stars: 25 },
    { at: 1e8, name: '보물 왕국', stars: 30 },
    { at: 1e9, name: '전설의 섬', stars: 40 },
    { at: 1e10, name: '공룡 제국', stars: 50 },
  ],

  // 공룡별 말투(음높이, 빠르기)와 울음소리(기본 음, 음절별 배수, 음절 길이, 파형).
  VOICES: {
    trex: { pitch: 0.8, rate: 0.95, cry: { hz: 110, notes: [1, 1.25, 0.8], step: 0.16, wave: 'sawtooth' } },
    tricera: { pitch: 1, rate: 0.95, cry: { hz: 170, notes: [1, 1.2], step: 0.13, wave: 'triangle' } },
    brachio: { pitch: 0.78, rate: 0.82, cry: { hz: 95, notes: [1, 0.9, 1.1], step: 0.2, wave: 'triangle' } },
    stego: { pitch: 0.95, rate: 0.9, cry: { hz: 150, notes: [1, 0.85], step: 0.15, wave: 'triangle' } },
    ankylo: { pitch: 0.85, rate: 0.9, cry: { hz: 120, notes: [1, 1, 0.8], step: 0.12, wave: 'square' } },
    ptero: { pitch: 1.45, rate: 1.12, cry: { hz: 480, notes: [1, 1.4, 1.1, 1.6], step: 0.07, wave: 'sawtooth' } },
    raptor: { pitch: 1.3, rate: 1.2, cry: { hz: 380, notes: [1.3, 1, 1.4], step: 0.07, wave: 'square' } },
    para: { pitch: 1.15, rate: 0.95, cry: { hz: 240, notes: [1, 1.5, 1.25], step: 0.17, wave: 'triangle' } },
    korea: { pitch: 1.2, rate: 1.05, cry: { hz: 300, notes: [1, 1.3, 1.1], step: 0.1, wave: 'triangle' } },
    spino: { pitch: 0.82, rate: 0.95, cry: { hz: 120, notes: [0.9, 1.2, 0.7], step: 0.17, wave: 'sawtooth' } },
  },

  SPECIES: [
    {
      id: 'trex', name: '티라노사우루스', type: 'fire', stats: [120, 30, 20, 16], learn: [[1, 'bite'], [1, 'tail'], [4, 'roar'], [9, 'flame']], color: 'coral', diet: ['meat'], dietLabel: '육식공룡',
      lengthM: 12, era: '백악기 후기', age: '약 6,800만 년 전',
      fact: '바나나만 한 이빨이 60개쯤 있었어요. 앞발은 아주 작았지만 무는 힘은 최고였어요.',
    },
    {
      id: 'tricera', name: '트리케라톱스', type: 'earth', stats: [125, 22, 28, 13], learn: [[1, 'rock'], [1, 'tail'], [4, 'guard'], [9, 'quake']], color: 'sun', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 9, era: '백악기 후기', age: '약 6,800만 년 전',
      fact: '이름은 뿔이 세 개 달린 얼굴이라는 뜻이에요. 커다란 목 방패로 몸을 지켰어요.',
    },
    {
      id: 'brachio', name: '브라키오사우루스', unlock: 'jungle', type: 'grass', stats: [150, 20, 24, 10], learn: [[1, 'leaf'], [1, 'tail'], [4, 'heal'], [9, 'vine']], color: 'lagoon', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 24, era: '쥐라기 후기', age: '약 1억 5,000만 년 전',
      fact: '목이 아주 길어서 높은 나무의 잎도 먹을 수 있었어요. 하루 종일 먹었을 거예요.',
    },
    {
      id: 'stego', name: '스테고사우루스', unlock: 'beach', type: 'grass', stats: [115, 25, 27, 14], learn: [[1, 'leaf'], [1, 'tail'], [4, 'guard'], [9, 'vine']], color: 'fern', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 9, era: '쥐라기 후기', age: '약 1억 5,000만 년 전',
      fact: '등에 큰 골판이, 꼬리 끝에 뾰족한 가시가 있었어요. 몸집에 비해 뇌는 작았어요.',
    },
    {
      id: 'ankylo', name: '안킬로사우루스', unlock: 'volcano', type: 'earth', stats: [115, 22, 34, 11], learn: [[1, 'rock'], [1, 'tail'], [4, 'guard'], [9, 'quake']], color: 'berry', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 7, era: '백악기 후기', age: '약 6,800만 년 전',
      fact: '온몸이 단단한 갑옷으로 덮여 있었어요. 꼬리 끝의 곤봉을 휘둘러 몸을 지켰어요.',
    },
    {
      id: 'ptero', name: '프테라노돈', type: 'sky', stats: [95, 27, 17, 26], learn: [[1, 'wing'], [1, 'splash'], [4, 'gust'], [9, 'dive']], color: 'lagoon', diet: ['fish'], dietLabel: '물고기를 먹는 익룡',
      lengthM: 6, era: '백악기 후기', age: '약 8,500만 년 전', lengthWord: '날개 길이',
      fact: '사실 공룡이 아니라 하늘을 나는 파충류인 익룡이에요. 바다 위를 날며 물고기를 잡았어요.',
    },
    {
      id: 'raptor', name: '벨로키랍토르', unlock: 'beach', type: 'fire', stats: [90, 29, 16, 30], learn: [[1, 'bite'], [1, 'tail'], [4, 'roar'], [9, 'flame']], color: 'sun', diet: ['meat'], dietLabel: '육식공룡',
      lengthM: 2, era: '백악기 후기', age: '약 7,500만 년 전',
      fact: '몸에 깃털이 있었어요. 크기는 큰 개만 했고, 뒷발에 낫처럼 굽은 발톱이 있었어요.',
    },
    {
      id: 'para', name: '파라사우롤로푸스', unlock: 'jungle', type: 'water', stats: [120, 23, 23, 17], learn: [[1, 'splash'], [1, 'tail'], [4, 'heal'], [9, 'wave']], color: 'coral', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 10, era: '백악기 후기', age: '약 7,500만 년 전',
      fact: '머리에 길고 속이 빈 볏이 있었어요. 이 볏으로 나팔처럼 소리를 냈을 거예요.',
    },
    {
      id: 'korea', name: '코리아케라톱스', unlock: 'snow', type: 'water', stats: [105, 24, 24, 22], learn: [[1, 'splash'], [1, 'rock'], [4, 'guard'], [9, 'wave']], color: 'fern', diet: ['fern', 'berry'], dietLabel: '초식공룡',
      lengthM: 1.7, era: '백악기 전기', age: '약 1억 년 전',
      fact: '경기도 화성에서 발견된 우리나라 공룡이에요. 꼬리가 넓적해서 헤엄을 쳤을지도 몰라요.',
    },
    {
      id: 'spino', name: '스피노사우루스', unlock: 'volcano', type: 'water', stats: [130, 31, 21, 18], learn: [[1, 'splash'], [1, 'bite'], [4, 'roar'], [9, 'wave']], color: 'berry', diet: ['fish', 'meat'], dietLabel: '물고기를 좋아하는 육식공룡',
      lengthM: 14, era: '백악기 후기', age: '약 9,500만 년 전',
      fact: '등에 커다란 돛이 있었어요. 티라노사우루스보다 몸이 길었고, 물가에서 물고기를 잡아먹었어요.',
    },
  ],

  THEMES: [
    { id: 'beach', name: '햇살 해변', price: 0, sky: '#BDEFEA', ground: '#F7D98B' },
    { id: 'jungle', name: '초록 밀림', price: 40, sky: '#CFEFB0', ground: '#7FB069' },
    { id: 'snow', name: '하얀 눈섬', price: 50, sky: '#DCEBFA', ground: '#F4F8FC' },
    { id: 'volcano', name: '불꽃 화산', price: 60, sky: '#F3946A', ground: '#6E4A4A' },
    { id: 'sunset', name: '노을 바다', price: 70, sky: '#FFC9A3', ground: '#E8A06A' },
  ],

  MISSIONS: [
    { id: 'food', text: '밥 2번 주기', goal: 2 },
    { id: 'clean', text: '공룡 씻겨 주기', goal: 1 },
    { id: 'energy', text: '공룡 재워 주기', goal: 1 },
    { id: 'pet', text: '공룡 5번 쓰다듬기', goal: 5 },
    { id: 'play', text: '미니게임 2번 하기', goal: 2 },
    { id: 'dig', text: '화석 캐기', goal: 1 },
    { id: 'quiz', text: '공룡 퀴즈 풀기', goal: 1 },
    { id: 'adv', text: '모험에서 1번 이기기', goal: 1 },
  ],

  TYPES: {
    fire: { name: '불', color: '#F2552C' },
    water: { name: '물', color: '#2B8FE0' },
    grass: { name: '풀', color: '#3FAE49' },
    earth: { name: '땅', color: '#B9803D' },
    sky: { name: '하늘', color: '#7C6CF0' },
    none: { name: '보통', color: '#7E8AA0' },
  },
  // 공격 속성 -> 효과가 좋은 상대 속성
  STRONG: { fire: ['grass'], water: ['fire', 'earth'], grass: ['water', 'earth'], earth: ['fire', 'sky'], sky: ['grass'] },

  // power: 위력, cool: 다시 쓰기까지 기다리는 턴
  SKILLS: {
    bite: { name: '불꽃 이빨', type: 'fire', power: 48 },
    flame: { name: '화산 포효', type: 'fire', power: 85, cool: 2 },
    splash: { name: '물대포', type: 'water', power: 48 },
    wave: { name: '큰 파도', type: 'water', power: 85, cool: 2 },
    leaf: { name: '잎사귀 폭풍', type: 'grass', power: 48 },
    vine: { name: '덩굴 채찍', type: 'grass', power: 80, cool: 2 },
    rock: { name: '돌 던지기', type: 'earth', power: 48 },
    quake: { name: '쿵쿵 지진', type: 'earth', power: 90, cool: 3 },
    wing: { name: '날개 치기', type: 'sky', power: 48 },
    dive: { name: '급강하', type: 'sky', power: 90, cool: 3 },
    gust: { name: '회오리', type: 'sky', power: 40, stun: 0.4, cool: 2 },
    tail: { name: '꼬리 휘두르기', type: 'none', power: 42 },
    roar: { name: '기합 넣기', type: 'none', boost: 2, cool: 3 },
    guard: { name: '단단한 방패', type: 'none', guard: 2, cool: 3 },
    heal: { name: '풀잎 쉼터', type: 'grass', heal: 0.4, cool: 3 },
  },

  REGIONS: [
    {
      id: 'beach', name: '햇살 해변', theme: 'beach', level: 1, pool: ['raptor', 'stego', 'tricera'],
      intro: '알을 깬 해변에 낯선 발자국이 찍혀 있어요. 누구의 발자국일까요?',
      outro: '해변의 대장이 말했어요. "밀림에서 땅이 울리고 있어. 화산이 잠에서 깨려나 봐."',
      boss: { species: 'raptor', name: '해변 대장 번쩍이', team: ['stego', 'tricera'] },
    },
    {
      id: 'jungle', name: '초록 밀림', theme: 'jungle', level: 6, pool: ['brachio', 'para', 'stego'],
      intro: '밀림의 공룡들이 불안해해요. 먼 곳의 화산에서 연기가 올라와요.',
      outro: '밀림의 어른 공룡이 길을 열어 주었어요. "화산으로 가면 까닭을 알 수 있을 거야."',
      boss: { species: 'brachio', name: '밀림 어른 키다리', team: ['para', 'stego'] },
    },
    {
      id: 'volcano', name: '불꽃 화산', theme: 'volcano', level: 11, pool: ['trex', 'ankylo', 'raptor'],
      intro: '땅이 뜨거워요! 화산의 왕이 섬의 알들을 지키려고 화가 나 있대요.',
      outro: '화산의 왕이 말했어요. "북쪽 눈섬의 얼음이 녹고 있어. 그래서 알들이 위험해."',
      boss: { species: 'trex', name: '화산의 왕 크왕', team: ['ankylo', 'raptor'] },
    },
    {
      id: 'snow', name: '하얀 눈섬', theme: 'snow', level: 16, pool: ['korea', 'ankylo', 'ptero'],
      intro: '하얀 눈섬은 조용해요. 얼음 밑에서 커다란 그림자가 움직여요.',
      outro: '눈섬의 지킴이가 얼음을 다시 얼렸어요. 마지막 수수께끼는 노을 바다에 있대요.',
      boss: { species: 'korea', name: '눈섬 지킴이 코코', team: ['ptero', 'ankylo'] },
    },
    {
      id: 'sunset', name: '노을 바다', theme: 'sunset', level: 21, pool: ['spino', 'ptero', 'para'],
      intro: '바다가 붉게 빛나요. 파도 위로 커다란 돛이 보여요.',
      outro: '바다의 주인이 고개를 숙였어요. 이제 공룡섬의 모든 공룡이 친구가 됐어요!',
      boss: { species: 'spino', name: '바다의 주인 돛왕', team: ['ptero', 'para'] },
    },
  ],

  QUIZ: [
    { q: '티라노사우루스는 고기를 먹었어요.', a: true, sp: 'trex', why: '맞아요! 힘센 턱을 가진 육식공룡이에요.' },
    { q: '티라노사우루스의 앞발은 아주 컸어요.', a: false, sp: 'trex', why: '몸집에 비해 앞발은 아주 작았어요.' },
    { q: '트리케라톱스는 뿔이 세 개예요.', a: true, sp: 'tricera', why: '맞아요! 이마에 두 개, 코 위에 한 개 있어요.' },
    { q: '프테라노돈은 공룡이에요.', a: false, sp: 'ptero', why: '하늘을 나는 파충류인 익룡이에요.' },
    { q: '브라키오사우루스는 목이 짧아요.', a: false, sp: 'brachio', why: '목이 아주 길어서 높은 잎을 먹었어요.' },
    { q: '스테고사우루스는 등에 골판이 있어요.', a: true, sp: 'stego', why: '맞아요! 등을 따라 커다란 골판이 있어요.' },
    { q: '안킬로사우루스는 꼬리 끝에 곤봉이 있어요.', a: true, sp: 'ankylo', why: '맞아요! 곤봉을 휘둘러 몸을 지켰어요.' },
    { q: '코리아케라톱스는 우리나라에서 발견됐어요.', a: true, sp: 'korea', why: '맞아요! 경기도 화성에서 발견됐어요.' },
    { q: '벨로키랍토르는 버스보다 컸어요.', a: false, sp: 'raptor', why: '큰 개만 한 크기였어요.' },
    { q: '파라사우롤로푸스는 머리에 긴 볏이 있어요.', a: true, sp: 'para', why: '맞아요! 볏으로 소리를 냈을 거예요.' },
    { q: '스피노사우루스는 등에 커다란 돛이 있어요.', a: true, sp: 'spino', why: '맞아요! 등뼈가 길게 솟아 돛이 됐어요.' },
    { q: '공룡은 알을 낳았어요.', a: true, sp: 'tricera', why: '맞아요! 공룡은 알에서 태어났어요.' },
    { q: '공룡은 사람과 같은 시대에 살았어요.', a: false, sp: 'trex', why: '공룡은 사람이 나타나기 훨씬 전에 살았어요.' },
    { q: '오늘날의 새는 공룡의 후손이에요.', a: true, sp: 'raptor', why: '맞아요! 새는 깃털 달린 공룡에서 나왔어요.' },
  ],

  FOODS: [
    { id: 'meat', name: '고기' },
    { id: 'fish', name: '물고기' },
    { id: 'fern', name: '고사리' },
    { id: 'berry', name: '열매' },
  ],

  HATS: [
    { id: 'ribbon', name: '리본', price: 10 },
    { id: 'flower', name: '꽃', price: 15 },
    { id: 'party', name: '고깔모자', price: 20 },
    { id: 'straw', name: '밀짚모자', price: 25 },
    { id: 'explorer', name: '탐험가 모자', price: 30 },
    { id: 'crown', name: '왕관', price: 40 },
  ],

  FOSSILS: [
    { id: 'ammonite', name: '암모나이트', fact: '소용돌이 껍데기를 가진 옛날 바다 동물이에요. 공룡과 같은 시대에 살았어요.' },
    { id: 'trilobite', name: '삼엽충', fact: '공룡보다 훨씬 먼저 바다에 살았던 동물이에요. 몸이 세 부분으로 나뉘어 있어요.' },
    { id: 'tooth', name: '공룡 이빨', fact: '육식공룡의 이빨은 고기를 자르는 칼처럼 끝이 뾰족하고 톱니가 있었어요.' },
    { id: 'bone', name: '공룡 뼈', fact: '뼈가 땅속에서 아주 오랜 시간 지나면 돌처럼 단단한 화석이 돼요.' },
    { id: 'footprint', name: '공룡 발자국', fact: '경상남도 고성에서는 공룡 발자국이 아주 많이 발견되었어요.' },
    { id: 'leaf', name: '고사리 화석', fact: '초식공룡이 살던 때에도 고사리가 있었어요. 잎 모양이 돌에 그대로 남았어요.' },
  ],

  NAMES: ['쿵이', '뿔이', '콩콩이', '초롱이', '뭉치', '꼬미', '두리', '번개'],

  CARE_TEXT: {
    food: '배고파요! 밥 주세요.',
    clean: '몸이 근질근질해요. 씻겨 주세요.',
    fun: '심심해요! 같이 놀아요.',
    energy: '하암, 졸려요.',
  },
  FULL_TEXT: {
    food: '배불러요! 이따가 먹을래요.',
    clean: '벌써 깨끗해요!',
    energy: '아직 안 졸려요!',
  },
};
