export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const userLat = parseFloat(url.searchParams.get('lat'));
    const userLng = parseFloat(url.searchParams.get('lng'));
    const branchName = url.searchParams.get('branch') || '';
    const origin = url.origin;

    const resp = await fetch(origin + '/branches.json', { cf: { cacheTtl: 300 } });
    if (!resp.ok) return new Response(JSON.stringify({ ok:false, error:'failed to load branches' }), { status:500, headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
    const branches = await resp.json();
    const branch = branches.find(b => b.name === branchName) || branches[0];
    if (!branch) return new Response(JSON.stringify({ ok:false, error:'branch not found' }), { status:404, headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'} });
    if (!isFinite(userLat) || !isFinite(userLng)) {
      return new Response(JSON.stringify({ ok:false, error:'invalid user coordinates' }), { status:400, headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'} });
    }

    function haversine(lat1, lon1, lat2, lon2) {
      const toRad = x => x * Math.PI / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    const distMeters = Math.round(haversine(userLat, userLng, branch.lat, branch.lng));
    const distance_text = distMeters < 1000 ? `${distMeters} m` : `${(distMeters/1000).toFixed(2)} km`;

    return new Response(JSON.stringify({ ok:true, branch:branch.name, distance_m: distMeters, distance_text }), { headers:{ 'content-type':'application/json;charset=UTF-8','Access-Control-Allow-Origin':'*' }});
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message }), { status:500, headers:{ 'content-type':'application/json','Access-Control-Allow-Origin':'*' }});
  }
}
