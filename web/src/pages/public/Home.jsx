import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getFeaturedProducts, getCategoriesPublic } from "../../api/public.js";
import { addToCart, getCart } from "../../api/cart.js";
import { toggleFavorite, getFavoriteStat } from "../../api/favorites.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import { useChatStore } from "../../stores/chatStore.js";
// Import icon
import { 
  FaChevronLeft, FaChevronRight, 
  FaLeaf, FaTruck, FaBoxOpen, FaHeartbeat, FaUtensils, 
  FaBolt, FaFish, FaSun, FaAppleAlt, FaCarrot 
} from "react-icons/fa";

const samplePlans = [
  { name: "Gói FIT 3 Trưa - Tối", desc: "Best seller", price: 650000, badge: "Best seller" },
  { name: "Gói FULL 3 bữa/ngày", desc: "Giữ cân healthy", price: 825000 },
  { name: "Gói SLIM Không tinh bột", desc: "Gấp đôi rau", price: 600000 },
  { name: "Gói MEAT Tăng cơ", desc: "Thêm 1.5x thịt", price: 950000 },
];
const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

// --- DANH SÁCH ĐỐI TÁC GIẢ LẬP ---
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
    return () => {
      stop = true;
    };
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
      current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
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
  
  const onMouseLeave = () => {
    isDown.current = false;
    if(partnerScrollRef.current) partnerScrollRef.current.style.cursor = 'grab';
  };
  
  const onMouseUp = () => {
    isDown.current = false;
    if(partnerScrollRef.current) partnerScrollRef.current.style.cursor = 'grab';
  };
  
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
              <button onClick={open} className="btn btn-ghost">
                Tư vấn
              </button>
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

      <section className="section section-alt fade-in">
        <div className="container">
          <h2 className="section-title">Sản phẩm tiêu biểu</h2>
          <div className="grid4">
            {samplePlans.map((p, i) => (
              <div key={i} className="card plan-card card-hover">
                {p.badge && <div className="badge badge-primary">{p.badge}</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-desc">{p.desc}</div>
                <div className="plan-price">{formatVND(p.price)}</div>
                <button className="btn btn-primary w-full">Chọn gói</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!!cats.length && (
        <section className="section fade-in">
          <div className="container">
            <h2 className="section-title">Danh mục nổi bật</h2>
            <div className="grid6">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.id}`}
                  className="card cat-card card-hover"
                >
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
                  <button
                    type="button"
                    className="icon-heart"
                    onClick={() => onToggleFavorite(it.id)}
                    title={isFav ? "Bỏ yêu thích" : "Thêm yêu thích"}
                    style={{
                      position: "absolute", top: 12, right: 12,
                      width: 36, height: 36, borderRadius: 18,
                      border: "1px solid #eee", background: "rgba(255,255,255,0.8)",
                      display: "grid", placeItems: "center", cursor: "pointer", zIndex: 2,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ color: isFav ? "crimson" : "#999", fontSize: 18 }}>
                      {isFav ? "♥" : "♡"}
                    </span>
                  </button>

                  <Link to={`/products/${it.id}`} aria-label={it.name}>
                    <div className="product-thumb-wrapper">
                      <img
                        className="product-img"
                        src={it.imageUrl || "/placeholder.jpg"}
                        alt={it.name}
                        style={{
                           width: "100%", height: 180, objectFit: "cover", borderRadius: 8,
                           display: 'block', transition: 'transform 0.3s ease'
                        }}
                        loading="lazy"
                      />
                    </div>
                  </Link>

                  <div className="product-info">
                    <Link to={`/products/${it.id}`} className="product-name">
                      {it.name}
                    </Link>
                    <div className="product-price">{formatVND(it.price)}</div>
                  </div>

                  <div className="card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => onAdd(it)} disabled={it.stock <= 0}  style={{ opacity: it.stock <= 0 ? 0.5 : 1 }}>
                      {it.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                    </button>
                    <Link to={`/products/${it.id}`} className="btn btn-outline btn-sm">
                      Xem chi tiết
                    </Link>
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

      {/* --- PHẦN ĐỐI TÁC: ĐÃ GIẢM KHOẢNG TRẮNG --- */}
      <section 
        className="section fade-in" 
        style={{ 
            paddingBottom: '20px',  /* Giảm padding đáy của section */
            marginBottom: '-40px'   /* Kéo footer lên một chút */
        }}
      >
        <div className="container text-center">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Đối tác & Khách hàng tiêu biểu</h2>
          
          <div className="partner-slider-wrapper">
            
            <button 
                onClick={() => scrollPartners('left')}
                className="slider-nav-btn prev"
                aria-label="Previous"
            >
                <FaChevronLeft />
            </button>

            <div 
                ref={partnerScrollRef}
                className="hide-scrollbar partner-track"
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
            >
              {dummyPartners.map((partner, i) => (
                <div key={i} className="partner-card" title={partner.name}>
                   <div className="partner-content" style={{ '--brand-color': partner.color }}>
                      <div className="partner-icon">{partner.icon}</div>
                      <div className="partner-name">{partner.name}</div>
                   </div>
                </div>
              ))}
            </div>

            <button 
                onClick={() => scrollPartners('right')}
                className="slider-nav-btn next"
                aria-label="Next"
            >
                <FaChevronRight />
            </button>

          </div>
        </div>
      </section>

      {/* CSS Update: Giảm padding của track và wrapper */}
      <style>{`
        .partner-slider-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 50px;
            max-width: 1000px;
            margin: 0 auto;
        }

        .partner-track {
            display: flex;
            gap: 24px;
            overflow-x: auto;
            padding: 10px 5px; /* GIẢM PADDING: trên dưới chỉ còn 10px */
            cursor: grab;
            user-select: none;
            width: 100%;
            scroll-behavior: smooth;
        }
        .partner-track:active { cursor: grabbing; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .slider-nav-btn {
            position: absolute;
            top: 50%; 
            transform: translateY(-50%);
            width: 44px; height: 44px; 
            border-radius: 50%;
            background: #fff; 
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; color: var(--text); 
            transition: all 0.2s ease;
            z-index: 10;
        }
        .slider-nav-btn:hover { 
            background: var(--primary); 
            color: #fff; 
            border-color: var(--primary); 
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
            transform: translateY(-50%) scale(1.1);
        }
        .slider-nav-btn.prev { left: 0; }
        .slider-nav-btn.next { right: 0; }

        .partner-card {
            flex: 0 0 auto;
            width: 180px;
            height: 90px;
            background: #fff;
            border-radius: 16px;
            border: 1px solid #f3f4f6;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .partner-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1);
            border-color: #e2e8f0;
        }

        .partner-content {
            display: flex; align-items: center; gap: 10px;
            pointer-events: none;
        }
        
        .partner-icon {
            font-size: 1.8rem;
            color: #94a3b8;
            transition: all 0.3s ease;
            display: flex;
        }
        
        .partner-name {
            font-weight: 700;
            font-size: 1.05rem;
            color: #94a3b8;
            letter-spacing: -0.5px;
            transition: all 0.3s ease;
        }

        .partner-card:hover .partner-icon {
            color: var(--brand-color);
            transform: scale(1.1) rotate(-5deg);
        }
        .partner-card:hover .partner-name {
            color: #1e293b;
        }
        .partner-card::after {
            content: '';
            position: absolute; bottom: 0; left: 0; width: 100%; height: 3px;
            background: var(--brand-color);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.3s ease;
        }
        .partner-card:hover::after {
            transform: scaleX(1);
        }

        @media (max-width: 768px) {
            .partner-slider-wrapper { padding: 0 10px; }
            .slider-nav-btn { display: none; }
            .partner-card { width: 150px; height: 80px; }
            .partner-icon { font-size: 1.5rem; }
            .partner-name { font-size: 0.95rem; }
        }
      `}</style>
    </>
  );
}