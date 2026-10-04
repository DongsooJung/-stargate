export const PLACES = {
  gangnam: { name: '강남역', lat: 37.497952, lon: 127.027619 },
  yeoksam: { name: '역삼역', lat: 37.500622, lon: 127.036456 },
  seolleung: { name: '선릉역', lat: 37.504503, lon: 127.049008 },
  samsung: { name: '삼성역', lat: 37.508844, lon: 127.06316 },
  gyodae: { name: '교대역', lat: 37.493415, lon: 127.01408 },
  sinnonhyeon: { name: '신논현역', lat: 37.504598, lon: 127.025053 },
  snu: { name: '서울대입구역', lat: 37.481284, lon: 126.952711 },
  nakseongdae: { name: '낙성대역', lat: 37.476947, lon: 126.963365 },
  bongcheon: { name: '봉천역', lat: 37.482362, lon: 126.941892 },
  sadang: { name: '사당역', lat: 37.47653, lon: 126.981685 },
  jamsil: { name: '잠실역', lat: 37.513295, lon: 127.100152 },
  seokchon: { name: '석촌역', lat: 37.505394, lon: 127.10698 },
  garak: { name: '가락시장역', lat: 37.492932, lon: 127.118178 },
  munjeong: { name: '문정역', lat: 37.485932, lon: 127.12245 },
  hongdae: { name: '홍대입구역', lat: 37.557192, lon: 126.925381 },
  hapjeong: { name: '합정역', lat: 37.549575, lon: 126.913739 },
  sangsu: { name: '상수역', lat: 37.547716, lon: 126.92253 },
  donggyo: { name: '동교동', lat: 37.5576, lon: 126.9284 },
  mangwon: { name: '망원역', lat: 37.556094, lon: 126.910174 },
  sinchon: { name: '신촌역', lat: 37.555134, lon: 126.936893 },
  ewha: { name: '이대역', lat: 37.556733, lon: 126.946013 },
  gongdeok: { name: '공덕역', lat: 37.543617, lon: 126.951592 },
  yeouido: { name: '여의도역', lat: 37.521624, lon: 126.924191 },
  assembly: { name: '국회의사당역', lat: 37.528133, lon: 126.91787 },
  mapo: { name: '마포역', lat: 37.539574, lon: 126.945932 },
  cityhall: { name: '시청역', lat: 37.565704, lon: 126.976861 },
  euljiro: { name: '을지로입구역', lat: 37.566014, lon: 126.982617 },
};

export const OPEN_REQUESTS = [
  { id: 'junho', riderId: 'junho', name: '준호', pickup: PLACES.yeoksam, dropoff: PLACES.nakseongdae, departInMin: 3 },
  { id: 'bora', riderId: 'bora', name: '보라', pickup: PLACES.gyodae, dropoff: PLACES.bongcheon, departInMin: 6 },
  { id: 'kai', riderId: 'kai', name: '카이', pickup: PLACES.sinnonhyeon, dropoff: PLACES.snu, departInMin: 26 },
  { id: 'sua', riderId: 'sua', name: '수아', pickup: PLACES.sinnonhyeon, dropoff: PLACES.sadang, departInMin: 2 },
  { id: 'taehyun', riderId: 'taehyun', name: '태현', pickup: PLACES.yeoksam, dropoff: PLACES.jamsil, departInMin: 4 },
  { id: 'haeun', riderId: 'haeun', name: '하은', pickup: PLACES.donggyo, dropoff: PLACES.sinchon, departInMin: 2 },
  { id: 'doyun', riderId: 'doyun', name: '도윤', pickup: PLACES.hapjeong, dropoff: PLACES.ewha, departInMin: 5 },
  { id: 'seoyeon', riderId: 'seoyeon', name: '서연', pickup: PLACES.mangwon, dropoff: PLACES.gongdeok, departInMin: 4 },
  { id: 'jihun', riderId: 'jihun', name: '지훈', pickup: PLACES.jamsil, dropoff: PLACES.garak, departInMin: 3 },
  { id: 'yerin', riderId: 'yerin', name: '예린', pickup: PLACES.seokchon, dropoff: PLACES.munjeong, departInMin: 8 },
  { id: 'siwoo', riderId: 'siwoo', name: '시우', pickup: PLACES.yeouido, dropoff: PLACES.gongdeok, departInMin: 2 },
  { id: 'nagyung', riderId: 'nagyung', name: '나경', pickup: PLACES.assembly, dropoff: PLACES.mapo, departInMin: 6 },
];

export const PLACE_GROUPS = [
  {
    label: '강남·서초',
    ids: ['gangnam', 'yeoksam', 'seolleung', 'samsung', 'gyodae', 'sinnonhyeon', 'snu', 'nakseongdae', 'bongcheon', 'sadang'],
  },
  {
    label: '마포·신촌',
    ids: ['hongdae', 'hapjeong', 'sangsu', 'donggyo', 'mangwon', 'sinchon', 'ewha', 'gongdeok', 'mapo'],
  },
  { label: '잠실', ids: ['jamsil', 'seokchon', 'garak', 'munjeong'] },
  { label: '여의도·중구', ids: ['yeouido', 'assembly', 'cityhall', 'euljiro'] },
];

export const PRESETS = [
  { id: 'gangnam', label: '강남 → 서울대입구', pickup: 'gangnam', dropoff: 'snu' },
  { id: 'hongdae', label: '홍대 → 신촌', pickup: 'hongdae', dropoff: 'sinchon' },
  { id: 'jamsil', label: '잠실 → 가락시장', pickup: 'jamsil', dropoff: 'garak' },
  { id: 'yeouido', label: '여의도 → 공덕', pickup: 'yeouido', dropoff: 'gongdeok' },
];

export const TAXIS = [
  { id: 't12', label: '중형 12바 3456', lat: 37.5012, lon: 127.0271 },
  { id: 't27', label: '중형 27우 8811', lat: 37.5564, lon: 126.9238 },
  { id: 't08', label: '중형 08서 2204', lat: 37.5142, lon: 127.1008 },
  { id: 't41', label: '중형 41허 6630', lat: 37.5234, lon: 126.9248 },
  { id: 't03', label: '중형 03나 1190', lat: 37.5662, lon: 126.9784 },
];

export function requestFromPlaces(pickup, dropoff, departInMin = 0) {
  return {
    id: 'me',
    riderId: 'me',
    name: '나',
    pickup,
    dropoff,
    departInMin,
  };
}
