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

    // Asia/Shanghai current time parts (Chinese short weekday like 周一)
    const now = new Date();
    const tzOptions = { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short' };
    const parts = new Intl.DateTimeFormat('zh-CN', tzOptions).formatToParts(now);
    let hour = 0, minute = 0, weekday = '周一';
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

    const d = (function(w){
      // normalize weekday to english-like key for logic: '周一' -> 'monday'
      if (!w) return 'monday';
      const map = { '周一':'monday','周二':'tuesday','周三':'wednesday','周四':'thursday','周五':'friday','周六':'saturday','周日':'sunday','星期一':'monday','星期二':'tuesday','星期三':'wednesday','星期四':'thursday','星期五':'friday','星期六':'saturday','星期日':'sunday' };
      return map[w] || w.toLowerCase();
    })(weekday);

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
