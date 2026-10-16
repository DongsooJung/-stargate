import { offsetMeters, pointOnRoute } from './match.js';

const RIDERS = [
  { id: 'minjae', name: '민재', north: 220, east: 80, along: 0.42, offNorth: 0, departInMin: 2 },
  { id: 'harin', name: '하린', north: -120, east: 280, along: 0.68, offNorth: 0, departInMin: 5 },
  { id: 'woojin', name: '우진', north: 60, east: -160, along: 0.88, offNorth: 0, departInMin: 1 },
  { id: 'seah', name: '세아', north: 180, east: -90, along: 0.5, offNorth: 1600, departInMin: 3 },
  { id: 'gunwoo', name: '건우', north: 620, east: 600, along: 0.55, offNorth: 0, departInMin: 4 },
  { id: 'yuna', name: '윤아', north: 90, east: 140, along: 0.5, offNorth: 0, departInMin: 24 },
];

/** 호스트 경로 선 위에 하차를 두고, 출발만 호스트 승차 근처로 흩어 놓는다. */
export function buildSandboxRequests(host) {
  return RIDERS.map((spec) => {
    const onLine = pointOnRoute(host.pickup, host.dropoff, spec.along);
    const dropPoint = spec.offNorth ? offsetMeters(onLine, spec.offNorth, 0) : onLine;
    const percent = Math.round(spec.along * 100);
    return {
      id: spec.id,
      riderId: spec.id,
      name: spec.name,
      departInMin: spec.departInMin,
      along: spec.along,
      onRoute: !spec.offNorth,
      pickup: {
        ...offsetMeters(host.pickup, spec.north, spec.east),
        name: `${spec.name} 승차`,
      },
      dropoff: {
        ...dropPoint,
        name: spec.offNorth ? `${spec.name} 하차 · 선 밖` : `${spec.name} 하차 · 경로 ${percent}%`,
      },
    };
  });
}
