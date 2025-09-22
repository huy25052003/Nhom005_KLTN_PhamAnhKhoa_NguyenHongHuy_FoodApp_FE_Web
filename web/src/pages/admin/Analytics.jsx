import React, { useEffect, useMemo, useState } from "react";
import { getOverview, getRevenueSeries, getTopProducts, getOrdersByStatus, getLowStock } from "../../api/stats.js";
import Sparkline from "../../component/Sparkline.jsx";

const fmtVND = (n) => (Number(n||0)).toLocaleString("vi-VN") + " đ";
const todayStr = () => new Date().toISOString().slice(0,10);

function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0,10);
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState(addDays(todayStr(), -6));
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState({ revenue:0, orders:0, items:0, avgOrderValue:0 });
  const [series, setSeries] = useState([]);
  const [tops, setTops] = useState([]);
  const [status, setStatus] = useState([]);
  const [low, setLow] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const [ov, se, tp, st, lw] = await Promise.all([
        getOverview({ from, to }),
        getRevenueSeries({ from, to }),
        getTopProducts({ from, to, limit: 10 }),
        getOrdersByStatus({ from, to }),
        getLowStock({ threshold: 10, limit: 10 }),
      ]);
      setOverview(ov);
      setSeries(se);
      setTops(tp);
      setStatus(st);
      setLow(lw);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Tải thống kê thất bại");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, [from, to]);

  const sparkPoints = useMemo(()=> series.map((r, i) => ({ x: i, y: Number(r.revenue||0) })), [series]);
  const statusTotal = status.reduce((s, x)=> s + Number(x.count||0), 0);

  return (
    <div className="page-analytics">
      <h1 className="h1">Thống kê</h1>

      <div className="card" style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
        <label>Từ</label>
        <input className="input" type="date" value={from} onChange={(e)=> setFrom(e.target.value)} />
        <label>Đến</label>
        <input className="input" type="date" value={to} onChange={(e)=> setTo(e.target.value)} />

        <div style={{ display:"flex", gap:8 }}>
          <button className="btn" onClick={()=> { setFrom(addDays(todayStr(), -6)); setTo(todayStr()); }}>7 ngày</button>
          <button className="btn" onClick={()=> { setFrom(addDays(todayStr(), -29)); setTo(todayStr()); }}>30 ngày</button>
          <button className="btn" onClick={()=> { setFrom(addDays(todayStr(), -89)); setTo(todayStr()); }}>90 ngày</button>
        </div>

        <button className="btn btn-primary" onClick={load} style={{ marginLeft:"auto" }}>↻ Làm mới</button>
      </div>

      <div className="grid4">
        <div className="card stat">
          <div className="muted">Doanh thu</div>
          <div className="stat-number">{fmtVND(overview.revenue)}</div>
          <Sparkline points={sparkPoints} />
        </div>
        <div className="card stat">
          <div className="muted">Số đơn</div>
          <div className="stat-number">{overview.orders}</div>
        </div>
        <div className="card stat">
          <div className="muted">Sản phẩm bán ra</div>
          <div className="stat-number">{overview.items}</div>
        </div>
        <div className="card stat">
          <div className="muted">Giá trị TB/đơn</div>
          <div className="stat-number">{fmtVND(overview.avgOrderValue)}</div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop:12 }}>
        <div className="card" style={{ overflow:"hidden" }}>
          <div className="card-title">Top sản phẩm</div>
          <table className="table">
            <thead><tr><th>#</th><th>Tên</th><th>SL</th><th>Doanh thu</th></tr></thead>
            <tbody>
              {(tops||[]).map((t,i)=>(
                <tr key={t.productId}>
                  <td>{i+1}</td>
                  <td>{t.name}</td>
                  <td>{t.quantity}</td>
                  <td>{fmtVND(t.revenue)}</td>
                </tr>
              ))}
              {(!tops || !tops.length) && <tr><td colSpan={4} className="muted" style={{ textAlign:"center", padding:12 }}>Không có dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">Đơn theo trạng thái</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(status||[]).map(s => {
              const pct = statusTotal ? Math.round(100 * Number(s.count||0) / statusTotal) : 0;
              return (
                <div key={s.status}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div><span className="badge">{(s.status||"").toUpperCase()}</span></div>
                    <div>{s.count} ({pct}%)</div>
                  </div>
                  <div style={{ height:8, background:"#eee", borderRadius:6 }}>
                    <div style={{ width:`${pct}%`, height:"100%", borderRadius:6 }} className="bg-primary"></div>
                  </div>
                </div>
              );
            })}
            {(!status || !status.length) && <div className="muted">Không có dữ liệu</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow:"hidden", marginTop:12 }}>
        <div className="card-title">Cảnh báo tồn thấp</div>
        <table className="table">
          <thead><tr><th>ID</th><th>Tên</th><th>Tồn</th></tr></thead>
          <tbody>
            {(low||[]).map(r => (
              <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.stock}</td></tr>
            ))}
            {(!low || !low.length) && <tr><td colSpan={3} className="muted" style={{ textAlign:"center", padding:12 }}>OK, chưa có cảnh báo</td></tr>}
          </tbody>
        </table>
      </div>

      {loading && <div style={{ marginTop:12 }} className="muted">Đang tải…</div>}
    </div>
  );
}
