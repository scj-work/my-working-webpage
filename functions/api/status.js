export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const branchName = url.searchParams.get('branch') || '';
    const origin = url.origin;
    const resp = await fetch(origin + '/branches.json', { cf: { cacheTtl: 300 } });
    if (!resp.ok) return new Response(JSON.stringify({ ok:false, error:'failed to load branches' }), { status:500, headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
    const branches = await resp.json();

    const branch = branches.find(b => b.name === branchName) || branches[0];
    if (!branch) return new Response(JSON.stringify({ ok:false, error:'branch not found' }), { status:404, headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'} });

    // Asia/Shanghai current time parts
    const now = new Date();
    const tzOptions = { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' };
    const parts = new Intl.DateTimeFormat('en-US', tzOptions).formatToParts(now);
    let hour = 0, minute = 0, weekday = 'Monday';
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
      if (p.type === 'weekday') weekday = p.value;
    }
    const currentHM = hour * 60 + minute;
    const toMinutes = (t) => {
      if (!t) return null;
      const [hh, mm] = t.split(':').map(s => parseInt(s,10));
      return hh * 60 + (mm || 0);
    };

    const d = weekday.toLowerCase();
    let openPeriod = null;
    if (d === 'saturday') openPeriod = branch.hours && branch.hours.saturday;
    else if (d === 'sunday') openPeriod = branch.hours && branch.hours.sunday;
    else openPeriod = branch.hours && branch.hours.weekdays;

    let isOpen = false;
    if (openPeriod && openPeriod.open && openPeriod.close) {
      const o = toMinutes(openPeriod.open), c = toMinutes(openPeriod.close);
      if (o != null && c != null) isOpen = currentHM >= o && currentHM <= c;
    } else {
      const o = toMinutes('09:00'), c = toMinutes('17:00');
      if (d !== 'sunday') isOpen = currentHM >= o && currentHM <= c;
    }

    return new Response(JSON.stringify({
      ok: true,
      branch: { name: branch.name, address: branch.address, phone: branch.phone },
      now: { timezone: 'Asia/Shanghai', weekday, hour, minute },
      openPeriod,
      isOpen
    }), { headers: { 'content-type': 'application/json;charset=UTF-8', 'Access-Control-Allow-Origin': '*' }});
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message }), { status:500, headers:{ 'content-type':'application/json','Access-Control-Allow-Origin':'*' }});
  }
}
