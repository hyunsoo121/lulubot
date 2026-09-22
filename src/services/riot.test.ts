import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// riotGet 내부의 전역 throttle(동시에 여러 스캔이 돌아도 실제 호출 빈도가
// 배로 뛰지 않도록 하는 것)만 검증한다. axios 자체를 모킹해서 실제 네트워크 요청 없이
// "호출 시각 간격"만 확인한다.

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mockGet }),
  },
}));

import { getMatch } from './riot';

describe('riotGet — 전역 throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('여러 스캔이 동시에 호출해도 실제 API 호출은 최소 1200ms 간격으로 직렬화된다', async () => {
    const callTimes: number[] = [];
    mockGet.mockImplementation(async () => {
      callTimes.push(Date.now());
      return { data: {} };
    });

    // 서로 다른 3개의 "동시 스캔"이 거의 동시에 API를 호출한다고 가정
    const p1 = getMatch('m1');
    const p2 = getMatch('m2');
    const p3 = getMatch('m3');

    await vi.advanceTimersByTimeAsync(1200 * 3);
    await Promise.all([p1, p2, p3]);

    expect(callTimes.length).toBe(3);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1200);
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(1200);
  });
});
