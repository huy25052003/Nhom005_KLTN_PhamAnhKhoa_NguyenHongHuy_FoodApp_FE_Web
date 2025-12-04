import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getFeaturedProducts, getCategoriesPublic } from "../../api/public.js";
import { addToCart, getCart } from "../../api/cart.js";
import { toggleFavorite, getFavoriteStat } from "../../api/favorites.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import { useChatStore } from "../../stores/chatStore.js";
import { getRecommendations } from "../../api/recommendations.js";
import { getMe } from "../../api/users.js";
import { getProfile } from "../../api/users.js"; // Import thêm getProfile nếu chưa có
import LazyImage from "../../component/LazyImage.jsx"; // Đảm bảo import LazyImage

// Import icon (Thêm FaQuoteLeft)
import { 
  FaChevronLeft, FaChevronRight, 
  FaLeaf, FaTruck, FaBoxOpen, FaHeartbeat, FaUtensils, 
  FaBolt, FaFish, FaSun, FaAppleAlt, FaCarrot, FaQuoteLeft 
} from "react-icons/fa";

const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

// --- DỮ LIỆU ĐÁNH GIÁ ---
const testimonials = [
  { id: 1, name: "Minh Tú", role: "PT Gym", content: "Đồ ăn tính calo rất chuẩn, giúp học viên của mình siết cân hiệu quả mà vẫn đủ sức tập luyện.", avatar: "https://i.pravatar.cc/150?img=33" },
  { id: 2, name: "Lan Anh", role: "Nhân viên văn phòng", content: "Cứu tinh cho dân văn phòng bận rộn. Trưa nào cũng được ăn ngon, sạch, giao đúng giờ.", avatar: "https://i.pravatar.cc/150?img=5" },
  { id: 3, name: "Chị Hoàng", role: "Nội trợ", content: "Rau củ rất tươi, thịt mềm. Mình hay đặt gói tuần cho cả nhà ăn đổi vị, rất tiện lợi.", avatar: "https://i.pravatar.cc/150?img=9" },
];

// --- DANH SÁCH ĐỐI TÁC ---
const dummyPartners = [
    { name: "FreshFarm", color: "#16a34a", icon: <FaCarrot /> },   
    { name: "QuickShip", color: "#2563eb", icon: <FaTruck /> },    
    { name: "EcoPack",   color: "#d97706", icon: <FaBoxOpen /> },  
    { name: "NutriLife", color: "#dc2626", icon: <FaHeartbeat /> },
    { name: "ChefCorner",color: "#ea580c", icon: <FaUtensils /> }, 
    { name: "BioOrganic",color: "#65a30d", icon: <FaLeaf /> },     
    { name: "SeaFresh",  color: "#0891b2", icon: <FaFish /> },     
    { name: "SunnyFood", color: "#ca8a04", icon: <FaSun /> },      
    { name: "FruitBar",  color: "#db2777", icon: <FaAppleAlt /> }, 
    { name: "PowerMeal", color: "#7c3aed", icon: <FaBolt /> },     
];

export default function HomePage() {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [favMap, setFavMap] = useState({});
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();
  const { open } = useChatStore();

  const partnerScrollRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);
  
  const [recommended, setRecommended] = useState([]);
  const [appState, setAppState] = useState("LOADING"); // LOADING | NO_PROFILE | HAS_PROFILE | EMPTY

  // Logic gợi ý TDEE
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        // Check profile trước
        const userProfile = await getProfile().catch(() => null);
        if (!userProfile || !userProfile.heightCm || !userProfile.weightKg) {
            setAppState("NO_PROFILE");
            return;
        }

        const recs = await getRecommendations();
        if (recs && recs.length > 0) {
          setRecommended(recs);
          setAppState("HAS_PROFILE");
        } else {
          setAppState("EMPTY"); 
        }
      } catch (e) {}
    })();
  }, [token]);

  // Logic load chung
  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([getCategoriesPublic(6), getFeaturedProducts(8)]);
        setCats(Array.isArray(c) ? c : []);
        setFeatured(Array.isArray(p) ? p : []);
      } catch {
        setCats([]);
        setFeatured([]);
      }
    })();
  }, []);

  // Logic yêu thích
  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token || !featured?.length) return;
      try {
        const entries = await Promise.all(
          featured.map(async (p) => {
            try {
              const stat = await getFavoriteStat(p.id);
              return [p.id, !!stat?.favorite];
            } catch {
              return [p.id, false];
            }
          })
        );
        if (!stop) setFavMap(Object.fromEntries(entries));
      } catch {}
    })();
    return () => { stop = true; };
  }, [token, featured]);

  async function onAdd(product) {
    if (!token) {
      nav("/admin/login?redirect=/cart");
      return;
    }
    if((product.stock || 0) <=0){
      toast.error("Sản phẩm đã hết hàng");
      return;
    }
    try {
      await addToCart(product.id, 1);
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
      toast.success(`Đã thêm ${product.name} vào giỏ`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Thêm vào giỏ thất bại");
    }
  }

  async function onToggleFavorite(productId) {
    if (!token) {
      nav("/admin/login?redirect=/");
      return;
    }
    try {
      const { favorite } = await toggleFavorite(productId);
      setFavMap((m) => ({ ...m, [productId]: !!favorite }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Không cập nhật được yêu thích");
    }
  }

  // --- Scroll Logic ---
  const scrollPartners = (direction) => {
    if (partnerScrollRef.current) {
      const { current } = partnerScrollRef;
      const scrollAmount = 300; 
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const onMouseDown = (e) => {
    isDown.current = true;
    if(partnerScrollRef.current) {
        partnerScrollRef.current.style.cursor = 'grabbing';
        startX.current = e.pageX - partnerScrollRef.current.offsetLeft;
        scrollLeftPos.current = partnerScrollRef.current.scrollLeft;
    }
  };
  const onMouseLeave = () => { isDown.current = false; if(partnerScrollRef.current) partnerScrollRef.current.style.cursor = 'grab'; };
  const onMouseUp = () => { isDown.current = false; if(partnerScrollRef.current) partnerScrollRef.current.style.cursor = 'grab'; };
  const onMouseMove = (e) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - partnerScrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; 
    if(partnerScrollRef.current) {
        partnerScrollRef.current.scrollLeft = scrollLeftPos.current - walk;
    }
  };

  return (
    <>
      <section className="hero fade-in">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Kế hoạch bữa ăn hàng tuần cho lối sống lành mạnh</h1>
            <p>Trải nghiệm bữa ăn sạch tươi ngon, giàu dinh dưỡng — lên plan theo mục tiêu của bạn.</p>
            <div className="hero-actions">
              <Link to="/order" className="btn btn-primary">Đặt ngay</Link>
              <button onClick={open} className="btn btn-ghost">Tư vấn</button>
            </div>
            <ul className="hero-usps">
              <li>Giao tận nơi mỗi ngày</li>
              <li>Thực đơn đa dạng 100+ món</li>
              <li>Tuỳ chỉnh theo mục tiêu (giảm cân / tăng cơ / eat clean)</li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="hero-image" />
          </div>
        </div>
      </section>

      {/* GỢI Ý TDEE */}
      {token && (
        <section className="section" style={{ background: '#f0fdf4' }}>
          <div className="container">
            <div className="flex-row space-between align-center mb-4">
              <div>
                <h2 className="section-title" style={{textAlign: 'left', marginBottom: 8, color: '#166534'}}>
                  🥗 Dành riêng cho bạn
                </h2>
                <p className="muted">
                  {appState === "HAS_PROFILE" 
                    ? "Thực đơn được tính toán dựa trên chỉ số cơ thể (TDEE) của bạn." 
                    : "Khám phá thực đơn healthy chuẩn khoa học."}
                </p>
              </div>
              {appState === "NO_PROFILE" && (
                <Link to="/account" className="btn btn-outline btn-sm">Cập nhật Hồ sơ →</Link>
              )}
            </div>

            {appState === "HAS_PROFILE" && recommended.length > 0 ? (
              <div className="grid4">
                {recommended.map((it) => {
                  const isFav = !!favMap[it.id];
                  return (
                    <div key={it.id} className="card product-card card-hover" style={{ position: "relative" }}>
                      {/* Nút tim */}
                      <button type="button" className="icon-heart" onClick={() => onToggleFavorite(it.id)}
                          style={{
                            position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
                            border: "1px solid #eee", background: "rgba(255,255,255,0.8)",
                            display: "grid", placeItems: "center", cursor: "pointer", zIndex: 2
                          }}>
                          <span style={{ color: isFav ? "crimson" : "#999", fontSize: 18 }}>{isFav ? "♥" : "♡"}</span>
                      </button>
                      <Link to={`/products/${it.id}`}>
                          <div className="product-thumb-wrapper">
                            <LazyImage src={it.imageUrl || "/placeholder.jpg"} alt={it.name} style={{width:"100%", height:180, objectFit:"cover"}}/>
                          </div>
                      </Link>
                      <div className="product-info">
                          <div className="flex-row space-between">
                             <Link to={`/products/${it.id}`} className="product-name">{it.name}</Link>
                             {it.calories && <span className="badge" style={{background:'#dcfce7', color:'#166534', fontSize:'0.75rem'}}>{it.calories} kcal</span>}
                          </div>
                          <div className="product-price">{formatVND(it.price)}</div>
                      </div>
                      <div className="card-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => onAdd(it)} disabled={it.stock <= 0}>
                            {it.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                          </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : appState === "NO_PROFILE" ? (
              <div className="card text-center py-5" style={{border:'2px dashed #bbf7d0'}}>
                 <div style={{fontSize: '3rem', marginBottom: 16}}>📊</div>
                 <h3 className="h3">Bạn chưa cập nhật thông tin sức khỏe?</h3>
                 <p className="muted mb-3">Hãy cho chúng tôi biết Chiều cao, Cân nặng để tính toán Calo phù hợp nhất.</p>
                 <Link to="/account" className="btn btn-primary">Đi đến Hồ sơ cá nhân</Link>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="section fade-in">
        <div className="container">
          <h2 className="section-title">Cách đặt hàng</h2>
          <div className="grid4 howto">
            <div className="howto-item card-hover"><div className="howto-step">1</div><div>Chọn gói ăn phù hợp</div></div>
            <div className="howto-item card-hover"><div className="howto-step">2</div><div>FoodApp nấu nguyên liệu tươi</div></div>
            <div className="howto-item card-hover"><div className="howto-step">3</div><div>Giao tận nơi mỗi ngày</div></div>
            <div className="howto-item card-hover"><div className="howto-step">4</div><div>Hâm nóng & thưởng thức</div></div>
          </div>
        </div>
      </section>

      {!!cats.length && (
        <section className="section fade-in">
          <div className="container">
            <h2 className="section-title">Danh mục nổi bật</h2>
            <div className="grid6">
              {cats.map((c) => (
                <Link key={c.id} to={`/categories/${c.id}`} className="card cat-card card-hover">
                  <div className="cat-name">{c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section fade-in">
        <div className="container">
          <h2 className="section-title">Món được yêu thích</h2>
          <div className="grid4">
            {(featured ?? []).map((it) => {
              const isFav = !!favMap[it.id];
              return (
                <div key={it.id} className="card product-card card-hover" style={{ position: "relative" }}>
                  <button type="button" className="icon-heart" onClick={() => onToggleFavorite(it.id)}
                    title={isFav ? "Bỏ yêu thích" : "Thêm yêu thích"}
                    style={{
                      position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
                      border: "1px solid #eee", background: "rgba(255,255,255,0.8)",
                      display: "grid", placeItems: "center", cursor: "pointer", zIndex: 2,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ color: isFav ? "crimson" : "#999", fontSize: 18 }}>{isFav ? "♥" : "♡"}</span>
                  </button>

                  <Link to={`/products/${it.id}`}>
                    <div className="product-thumb-wrapper">
                      <LazyImage src={it.imageUrl} alt={it.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                    </div>
                  </Link>

                  <div className="product-info">
                    <Link to={`/products/${it.id}`} className="product-name">{it.name}</Link>
                    <div className="product-price">{formatVND(it.price)}</div>
                  </div>

                  <div className="card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => onAdd(it)} disabled={it.stock <= 0} style={{ opacity: it.stock <= 0 ? 0.5 : 1 }}>
                      {it.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                    </button>
                    <Link to={`/products/${it.id}`} className="btn btn-outline btn-sm">Xem chi tiết</Link>
                  </div>
                </div>
              );
            })}
            {!featured?.length && <div className="muted">Chưa có dữ liệu sản phẩm.</div>}
          </div>
        </div>
      </section>

      <section className="section section-alt fade-in">
        <div className="container grid3">
          <div className="eco-card card-hover">Túi nylon sinh học tự hủy</div>
          <div className="eco-card card-hover">Tái sử dụng hộp, hoàn tiền</div>
          <div className="eco-card card-hover">Hạn chế muỗng nĩa dùng 1 lần</div>
        </div>
      </section>

      {/* --- SECTION KHÁCH HÀNG NÓI GÌ (ĐƯỢC THÊM VÀO ĐÂY) --- */}
      <section className="section fade-in" style={{background: '#fff'}}>
         <div className="container">
            <h2 className="section-title text-center">Khách hàng nói gì về FoodApp?</h2>
            <div className="grid3 mt-4">
               {testimonials.map(t => (
                   <div key={t.id} className="card text-center p-6 card-hover" style={{border: '1px solid #f3f4f6'}}>
                       <div style={{width: 64, height: 64, borderRadius: '50%', overflow:'hidden', margin:'0 auto 1rem'}}>
                           <img src={t.avatar} alt={t.name} style={{width: '100%', height: '100%', objectFit:'cover'}} />
                       </div>
                       <FaQuoteLeft className="text-green-200 text-2xl mb-3 mx-auto" />
                       <p className="italic mb-4" style={{color: '#4b5563'}}>"{t.content}"</p>
                       <div className="font-bold">{t.name}</div>
                       <div className="text-xs muted">{t.role}</div>
                   </div>
               ))}
            </div>
         </div>
      </section>
      {/* ----------------------------------------------------- */}

      <section className="section fade-in" style={{ paddingBottom: '20px', marginBottom: '-40px' }}>
        <div className="container text-center">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Đối tác & Khách hàng tiêu biểu</h2>
          
          <div className="partner-slider-wrapper">
            <button onClick={() => scrollPartners('left')} className="slider-nav-btn prev"><FaChevronLeft /></button>

            <div ref={partnerScrollRef} className="hide-scrollbar partner-track" onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
              {dummyPartners.map((partner, i) => (
                <div key={i} className="partner-card" title={partner.name}>
                   <div className="partner-content" style={{ '--brand-color': partner.color }}>
                      <div className="partner-icon">{partner.icon}</div>
                      <div className="partner-name">{partner.name}</div>
                   </div>
                </div>
              ))}
            </div>

            <button onClick={() => scrollPartners('right')} className="slider-nav-btn next"><FaChevronRight /></button>
          </div>
        </div>
      </section>

      <style>{`
        .partner-slider-wrapper { position: relative; display: flex; align-items: center; justify-content: center; padding: 0 50px; max-width: 1000px; margin: 0 auto; }
        .partner-track { display: flex; gap: 24px; overflow-x: auto; padding: 10px 5px; cursor: grab; user-select: none; width: 100%; scroll-behavior: smooth; }
        .partner-track:active { cursor: grabbing; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .slider-nav-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); transition: all 0.2s ease; z-index: 10; }
        .slider-nav-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); transform: translateY(-50%) scale(1.1); }
        .slider-nav-btn.prev { left: 0; } .slider-nav-btn.next { right: 0; }
        .partner-card { flex: 0 0 auto; width: 180px; height: 90px; background: #fff; border-radius: 16px; border: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
        .partner-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1); border-color: #e2e8f0; }
        .partner-content { display: flex; align-items: center; gap: 10px; pointer-events: none; }
        .partner-icon { font-size: 1.8rem; color: #94a3b8; transition: all 0.3s ease; display: flex; }
        .partner-name { font-weight: 700; font-size: 1.05rem; color: #94a3b8; letter-spacing: -0.5px; transition: all 0.3s ease; }
        .partner-card:hover .partner-icon { color: var(--brand-color); transform: scale(1.1) rotate(-5deg); }
        .partner-card:hover .partner-name { color: #1e293b; }
        .partner-card::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: var(--brand-color); transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease; }
        .partner-card:hover::after { transform: scaleX(1); }
        @media (max-width: 768px) { .partner-slider-wrapper { padding: 0 10px; } .slider-nav-btn { display: none; } .partner-card { width: 150px; height: 80px; } }
      `}</style>
    </>
  );
}