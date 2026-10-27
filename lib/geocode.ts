export type LatLng = { lat: number; lng: number };

const GSI_ENDPOINT = "https://msearch.gsi.go.jp/address-search/AddressSearch";
const CACHE_KEY = "geocode-cache-v1";

type Cache = Record<string, LatLng | null>;

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Cache;
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 保存できなくても動作には影響しない
  }
}

async function fetchLatLng(address: string): Promise<LatLng | null> {
  const res = await fetch(`${GSI_ENDPOINT}?q=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`);
  const features = (await res.json()) as {
    geometry: { coordinates: [number, number] };
  }[];
  const first = features[0];
  if (!first) return null;
  const [lng, lat] = first.geometry.coordinates;
  return { lat, lng };
}

/**
 * 国土地理院の住所検索APIで住所を緯度経度に変換する。
 * 結果（見つからなかった場合も）は localStorage にキャッシュし、通信エラー時はキャッシュしない。
 */
export async function geocodeAddresses(
  addresses: string[],
  concurrency = 4,
): Promise<Map<string, LatLng>> {
  const cache = readCache();
  const result = new Map<string, LatLng>();
  const pending: string[] = [];

  for (const address of new Set(addresses)) {
    if (address in cache) {
      const hit = cache[address];
      if (hit) result.set(address, hit);
    } else {
      pending.push(address);
    }
  }

  let index = 0;
  async function worker() {
    while (index < pending.length) {
      const address = pending[index++];
      try {
        const point = await fetchLatLng(address);
        cache[address] = point;
        if (point) result.set(address, point);
      } catch {
        // 一時的な失敗は次回再試行できるようキャッシュしない
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));

  if (pending.length > 0) writeCache(cache);
  return result;
}
