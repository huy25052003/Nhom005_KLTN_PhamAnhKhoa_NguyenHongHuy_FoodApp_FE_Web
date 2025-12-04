import React, { useEffect, useState, useMemo, useRef } from "react"; // Thêm useRef
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// --- API IMPORTS ---
import { getProduct } from "../../api/products"; 
import { getProductsPublic } from "../../api/public"; 
import { addToCart, getCart } from "../../api/cart";
import { listReviews, createReview, deleteReview, getAvgRating } from "../../api/reviews";
import { toggleFavorite } from "../../api/favorites"; 
import http from "../../lib/http"; 

// --- COMPONENTS ---
import { useAuth } from "../../stores/auth";
import { useCart } from "../../stores/cart";
import LazyImage from "../../component/LazyImage";
import { 
  FaShoppingCart, FaHeart, FaFire, FaDna, FaBreadSlice, FaOilCan, FaStar, FaRegStar, FaTrash,
  FaChevronLeft, FaChevronRight // Import thêm icon mũi tên
} from "react-icons/fa";

const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { username: json.sub, roles: json.roles || json.authorities || [] };
  } catch { return null; }
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const pid = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  
  const { token } = useAuth();
  const { setCount } = useCart();
  const me = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isFav, setIsFav] = useState(false);

  // --- REF CHO SLIDER ---
  const sliderRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => { window.scrollTo(0, 0); }, [pid]);

  // Queries (Giữ nguyên)
  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", pid],
    queryFn: () => getProduct(pid),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", pid],
    queryFn: () => listReviews(pid),
  });

  const { data: avgRating = 0 } = useQuery({
    queryKey: ["reviews-avg", pid],
    queryFn: () => getAvgRating(pid),
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category?.id],
    queryFn: async () => {
      if (!product?.category?.id) return [];
      const res = await getProductsPublic({ categoryId: product.category.id, limit: 10 }); // Lấy nhiều hơn để scroll
      return (Array.isArray(res) ? res : res.items || []).filter(p => p.id !== pid);
    },
    enabled: !!product?.category?.id,
  });

  useEffect(() => {
      if (token && pid) {
          http.get(`/favorites/${pid}`).then(res => {
              if(res.data) setIsFav(res.data.favorite);
          }).catch(()=>{});
      }
  }, [pid, token]);

  // Mutations (Giữ nguyên)
  const addToCartMut = useMutation({
    mutationFn: () => addToCart(pid, qty),
    onSuccess: async () => {
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const total = items.reduce((s, i) => s + (i.quantity || 0), 0);
      setCount(total);
      toast.success("Đã thêm vào giỏ hàng!");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Lỗi thêm giỏ hàng"),
  });

  const createReviewMut = useMutation({
    mutationFn: () => createReview(pid, { rating, comment }),
    onSuccess: () => {
      setComment("");
      setRating(5);
      toast.success("Cảm ơn đánh giá của bạn!");
      qc.invalidateQueries({ queryKey: ["reviews", pid] });
      qc.invalidateQueries({ queryKey: ["reviews-avg", pid] });
    },
    onError: (e) => toast.error("Lỗi gửi đánh giá"),
  });

  const deleteReviewMut = useMutation({
    mutationFn: (rid) => deleteReview(pid, rid),
    onSuccess: () => {
        toast.success("Đã xóa đánh giá");
        qc.invalidateQueries({ queryKey: ["reviews", pid] });
    }
  });

  const toggleFavMut = useMutation({
      mutationFn: () => toggleFavorite(pid),
      onSuccess: () => {
          setIsFav(!isFav);
          toast.success(!isFav ? "Đã thích ❤️" : "Đã bỏ thích 💔");
      }
  });

  const handleAddToCart = () => {
    if (!token) {
      toast("Vui lòng đăng nhập", { icon: '🔑' });
      nav("/admin/login?redirect=/products/" + pid);
      return;
    }
    if (product.stock <= 0) return toast.error("Hết hàng");
    if (qty > product.stock) return toast.error(`Chỉ còn ${product.stock} phần`);
    addToCartMut.mutate();
  };

  const canDeleteReview = (r) => {
    if (!me) return false;
    const roles = (me.roles || []).map(x => String(x).toUpperCase());
    return r.userName === me.username || roles.includes("ROLE_ADMIN");
  };

  // --- LOGIC SLIDER ---
  const scroll = (direction) => {
    if(sliderRef.current){
        const { current } = sliderRef;
        const amount = 300; // Khoảng cách mỗi lần bấm
        current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  // Kéo thả chuột
  const onMouseDown = (e) => {
    isDown.current = true;
    sliderRef.current.style.cursor = 'grabbing';
    startX.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeft.current = sliderRef.current.scrollLeft;
  };
  const onMouseLeave = () => {
    isDown.current = false;
    if(sliderRef.current) sliderRef.current.style.cursor = 'grab';
  };
  const onMouseUp = () => {
    isDown.current = false;
    if(sliderRef.current) sliderRef.current.style.cursor = 'grab';
  };
  const onMouseMove = (e) => {
    if(!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Tốc độ kéo
    sliderRef.current.scrollLeft = scrollLeft.current - walk;
  };

  if (loadingProduct) return <div className="container section text-center"><div className="loading"></div></div>;
  if (!product) return <div className="container section text-center">Không tìm thấy sản phẩm</div>;

  return (
    <div className="container section fade-in">
      <div className="breadcrumbs mb-4 muted text-sm">
        <Link to="/" className="text-primary hover:underline">Trang chủ</Link> / 
        <Link to="/menu" className="text-primary hover:underline ml-1">Thực đơn</Link> / 
        <span className="font-semibold ml-1">{product.name}</span>
      </div>

      <div className="grid2" style={{ gap: "3rem", alignItems: "start", marginBottom: '4rem' }}>
        {/* CỘT TRÁI */}
        <div className="product-detail-img-wrapper" style={{ 
            borderRadius: 24, overflow: 'hidden', border: '1px solid #eee', 
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' 
        }}>
          <LazyImage src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "auto", display: "block" }} />
        </div>

        {/* CỘT PHẢI */}
        <div>
          <div className="flex-row space-between align-start">
             <div>
                 <div className="text-primary text-sm font-bold uppercase tracking-wider mb-1">
                    {product.category?.name || "Healthy Food"}
                 </div>
                 <h1 className="h2" style={{ marginBottom: "0.5rem", fontSize: '2rem' }}>{product.name}</h1>
                 <div className="flex-row align-center gap-2 mb-2">
                    <div style={{color: '#f59e0b', fontSize:'1.1rem'}}><Stars value={avgRating}/></div>
                    <span className="muted text-sm">({reviews.length} đánh giá)</span>
                 </div>
             </div>
             
             <button onClick={() => { if(!token) toast.error("Cần đăng nhập"); else toggleFavMut.mutate(); }} 
                className="btn-icon"
                style={{
                    border: '1px solid #eee', background: 'white', borderRadius: '50%', width: 48, height: 48, 
                    display:'grid', placeItems:'center', cursor:'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                 <FaHeart size={24} color={isFav ? "#ef4444" : "#d1d5db"} />
             </button>
          </div>
          
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#dc2626', margin: '1rem 0', letterSpacing: '-1px' }}>
             {formatVND(product.price)}
          </div>

          {/* DINH DƯỠNG */}
          {product.calories > 0 && (
              <div className="nutrition-card mb-4" style={{background: '#f0fdf4', padding: 20, borderRadius: 16, border: '1px dashed #86efac'}}>
                  <h4 style={{fontSize:'1rem', marginBottom: 12, display:'flex', alignItems:'center', gap: 8, color: '#166534'}}>
                      🥗 Dinh dưỡng <span className="muted" style={{fontSize:'0.8rem', fontWeight:400}}>(/phần)</span>
                  </h4>
                  <div className="grid4" style={{textAlign:'center'}}>
                      <div className="nutri-item">
                          <FaFire color="#ea580c" size={24} style={{marginBottom:4}}/>
                          <div style={{fontWeight:800, color:'#ea580c', fontSize:'1.1rem'}}>{product.calories}</div>
                          <div className="text-xs muted">Kcal</div>
                      </div>
                      <div className="nutri-item">
                          <FaDna color="#3b82f6" size={24} style={{marginBottom:4}}/>
                          <div style={{fontWeight:800, color:'#374151', fontSize:'1.1rem'}}>{product.protein || 0}g</div>
                          <div className="text-xs muted">Protein</div>
                      </div>
                      <div className="nutri-item">
                          <FaBreadSlice color="#eab308" size={24} style={{marginBottom:4}}/>
                          <div style={{fontWeight:800, color:'#374151', fontSize:'1.1rem'}}>{product.carbs || 0}g</div>
                          <div className="text-xs muted">Carbs</div>
                      </div>
                      <div className="nutri-item">
                          <FaOilCan color="#8b5cf6" size={24} style={{marginBottom:4}}/>
                          <div style={{fontWeight:800, color:'#374151', fontSize:'1.1rem'}}>{product.fat || 0}g</div>
                          <div className="text-xs muted">Fat</div>
                      </div>
                  </div>
              </div>
          )}

          <p className="mb-4" style={{ lineHeight: 1.8, color: "#4b5563", fontSize: '1.05rem' }}>
            {product.description || "Chưa có mô tả cho món ăn này."}
          </p>

          <div className="flex-row gap-3 align-center mb-4" style={{marginTop: '2rem'}}>
            <div className="qty-control" style={{display:'flex', alignItems:'center', border:'2px solid #e5e7eb', borderRadius: 12, overflow:'hidden'}}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{padding:'12px 16px', background:'white', border:'none', cursor:'pointer', fontSize:'1.2rem', fontWeight:'bold'}}>−</button>
                <span style={{padding:'0 12px', fontWeight:700, minWidth: 40, textAlign:'center'}}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{padding:'12px 16px', background:'white', border:'none', cursor:'pointer', fontSize:'1.2rem', fontWeight:'bold'}}>+</button>
            </div>
            <button className="btn btn-primary shadow-lg" onClick={handleAddToCart} disabled={product.stock <= 0 || addToCartMut.isPending}
                style={{
                    flex:1, padding:'16px', borderRadius: 12, fontSize: '1.1rem', fontWeight: 600,
                    display:'flex', justifyContent:'center', alignItems:'center', gap: 10,
                    background: product.stock > 0 ? 'var(--primary)' : '#9ca3af', borderColor: 'transparent'
                }}>
                <FaShoppingCart /> {addToCartMut.isPending ? "Đang xử lý..." : product.stock > 0 ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
            </button>
          </div>
        </div>
      </div>

      {/* --- SẢN PHẨM LIÊN QUAN (SLIDER) --- */}
      {relatedProducts.length > 0 && (
        <div className="related-section mb-5">
            <h2 className="h3 mb-4 border-l-4 border-primary pl-3">Có thể bạn sẽ thích</h2>
            
            <div className="slider-wrapper" style={{ position: 'relative', padding: '0 48px' }}>
                {/* Nút Prev */}
                <button onClick={() => scroll('left')} className="slider-nav prev" style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #ddd',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <FaChevronLeft />
                </button>

                {/* Container cuộn */}
                <div 
                    ref={sliderRef}
                    className="scrolling-track hide-scrollbar"
                    onMouseDown={onMouseDown}
                    onMouseLeave={onMouseLeave}
                    onMouseUp={onMouseUp}
                    onMouseMove={onMouseMove}
                    style={{
                        display: 'flex', 
                        gap: '1.5rem', 
                        overflowX: 'auto',
                        paddingBottom: '1rem',
                        cursor: 'grab',
                        scrollBehavior: 'smooth',
                        userSelect: 'none' // Chống bôi đen khi kéo
                    }}
                >
                    {relatedProducts.map(p => (
                        <div key={p.id} className="card product-card card-hover" style={{
                            minWidth: '260px', width: '260px', flexShrink: 0
                        }}>
                            <Link to={`/products/${p.id}`} draggable="false"> {/* draggable=false để không bị kẹt khi kéo ảnh */}
                                <div className="product-thumb-wrapper" style={{height: 180}}>
                                    <LazyImage src={p.imageUrl} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover', pointerEvents: 'none'}}/>
                                </div>
                            </Link>
                            <div className="product-info p-3">
                                <Link to={`/products/${p.id}`} className="product-name font-bold block mb-1 text-truncate">{p.name}</Link>
                                <div className="product-price text-red-600 font-bold">{formatVND(p.price)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Nút Next */}
                <button onClick={() => scroll('right')} className="slider-nav next" style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #ddd',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <FaChevronRight />
                </button>
            </div>
        </div>
      )}

      {/* --- REVIEW --- */}
      <div className="reviews-section mt-5 pt-5" style={{borderTop: '1px solid #eee'}}>
          <h3 className="h3 mb-4">Đánh giá khách hàng ({reviews.length})</h3>
          <div className="grid2" style={{gap: '3rem', alignItems:'start'}}>
              <div className="review-list" style={{maxHeight: 500, overflowY: 'auto', paddingRight: 10}}>
                  {reviews.length === 0 ? (
                      <div className="muted font-italic">Chưa có đánh giá nào.</div>
                  ) : (
                      reviews.map((rv) => (
                          <div key={rv.id} className="review-item mb-4 pb-3" style={{borderBottom:'1px solid #f3f4f6'}}>
                              <div className="flex-row space-between">
                                  <div className="font-bold text-gray-800">{rv.userName || "Khách hàng"}</div>
                                  <div className="text-xs muted">{rv.createdAt ? new Date(rv.createdAt).toLocaleDateString('vi-VN') : ""}</div>
                              </div>
                              <div className="flex-row mb-1 text-yellow-400" style={{fontSize: '0.9rem'}}><Stars value={rv.rating} /></div>
                              <p style={{margin:0, color:'#374151'}}>{rv.comment}</p>
                              {canDeleteReview(rv) && (
                                <button onClick={() => { if(confirm('Xóa?')) deleteReviewMut.mutate(rv.id) }}
                                    className="text-red-500 text-xs hover:underline mt-1 flex-row align-center gap-1"
                                    style={{background:'transparent', border:'none', cursor:'pointer'}}>
                                    <FaTrash/> Xóa
                                </button>
                              )}
                          </div>
                      ))
                  )}
              </div>

              <div className="review-form card p-4" style={{background: '#f9fafb', border:'none'}}>
                  {token ? (
                      <form onSubmit={(e) => { e.preventDefault(); createReviewMut.mutate(); }}>
                          <h4 className="h5 mb-3">Viết đánh giá của bạn</h4>
                          <div className="mb-3">
                              <label className="label">Bạn chấm mấy sao?</label>
                              <div className="flex-row gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                      <button key={star} type="button" onClick={() => setRating(star)}
                                          style={{background:'transparent', border:'none', cursor:'pointer', padding:0}}>
                                          {star <= rating ? <FaStar size={28} color="#eab308"/> : <FaRegStar size={28} color="#9ca3af"/>}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          <div className="mb-3">
                              <label className="label">Nội dung</label>
                              <textarea className="input" rows="3" placeholder="Món này thế nào?..." value={comment} onChange={e => setComment(e.target.value)} required />
                          </div>
                          <button className="btn btn-primary w-full" disabled={createReviewMut.isPending}>
                              {createReviewMut.isPending ? "Đang gửi..." : "Gửi đánh giá"}
                          </button>
                      </form>
                  ) : (
                      <div className="text-center py-4">
                          <p className="mb-3">Vui lòng đăng nhập để viết đánh giá</p>
                          <button onClick={() => nav("/admin/login")} className="btn btn-outline btn-sm">Đăng nhập ngay</button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .slider-nav:hover { background: var(--primary); color: white; border-color: var(--primary); }
      `}</style>
    </div>
  );
}

function Stars({ value = 0 }) {
  const full = Math.round(Number(value) || 0);
  return <>{ "★".repeat(full) }{ "☆".repeat(5 - full) }</>;
}