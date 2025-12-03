import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// SỬA LỖI: Import getProductsPublic từ api/public.js
import { getProduct } from "../../api/products"; 
import { getProductsPublic } from "../../api/public"; 
import { addToCart, getCart } from "../../api/cart";
import { listReviews, createReview, deleteReview, getAvgRating } from "../../api/reviews";
import { useAuth } from "../../stores/auth";
import { useCart } from "../../stores/cart";
import LazyImage from "../../component/LazyImage";

const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + " đ";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { username: json.sub, roles: json.roles || json.authorities || [] };
  } catch {
    return null;
  }
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const pid = Number(id);
  const qc = useQueryClient();
  const { token } = useAuth();
  const { setCount } = useCart();
  const me = React.useMemo(() => (token ? decodeJwt(token) : null), [token]);
  const nav = useNavigate();

  // Scroll lên đầu trang khi đổi sản phẩm (quan trọng khi bấm vào sản phẩm liên quan)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pid]);

  // 1. Lấy thông tin sản phẩm
  const { data: product, isLoading: loadingProduct, error: errProduct } = useQuery({
    queryKey: ["product", pid],
    queryFn: () => getProduct(pid),
  });

  // 2. Lấy danh sách đánh giá
  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["reviews", pid],
    queryFn: () => listReviews(pid),
  });

  // 3. Lấy điểm đánh giá trung bình
  const { data: avgRating = 0 } = useQuery({
    queryKey: ["reviews-avg", pid],
    queryFn: () => getAvgRating(pid),
  });

  // 4. Lấy sản phẩm liên quan (Cùng danh mục)
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category?.id],
    queryFn: async () => {
      if (!product?.category?.id) return [];
      // Gọi API lấy sản phẩm cùng danh mục
      const res = await getProductsPublic({ categoryId: product.category.id, limit: 5 });
      // Lọc bỏ sản phẩm hiện tại
      return (Array.isArray(res) ? res : res.items || []).filter(p => p.id !== pid);
    },
    enabled: !!product?.category?.id, // Chỉ chạy khi đã có thông tin product
  });

  const [qty, setQty] = React.useState(1);
  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(pid, qty),
    onSuccess: async () => {
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
      toast.success("Đã thêm vào giỏ hàng!");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Thêm giỏ hàng thất bại"),
  });

  const handleAddToCart = () => {
    if (!token) {
      toast("Vui lòng đăng nhập để mua hàng", { icon: '🔑' });
      nav("/admin/login?redirect=/products/" + pid);
      return;
    }
    if (product.stock <= 0){
      toast.error("Sản phẩm đã hết hàng");
      return;
    }
    if (qty > product.stock){
      toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho.`);
      return;
    }
    addToCartMutation.mutate();
  };

  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const createMut = useMutation({
    mutationFn: () => createReview(pid, { rating, comment }),
    onSuccess: () => {
      setComment("");
      setRating(5);
      toast.success("Cảm ơn bạn đã đánh giá!");
      qc.invalidateQueries({ queryKey: ["reviews", pid] });
      qc.invalidateQueries({ queryKey: ["reviews-avg", pid] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Gửi đánh giá thất bại"),
  });

  const delMut = useMutation({
    mutationFn: (rid) => deleteReview(pid, rid),
    onSuccess: () => {
        toast.success("Đã xóa đánh giá");
        qc.invalidateQueries({ queryKey: ["reviews", pid] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Xoá đánh giá thất bại"),
  });

  function canDeleteReview(r) {
    if (!me) return false;
    const roles = (me.roles || []).map((x) => ("" + x).toUpperCase());
    return r.userName === me.username || roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");
  }

  if (loadingProduct) return <div className="container section"><div className="loading"></div> Đang tải sản phẩm…</div>;
  if (errProduct) return <div className="container section">Lỗi tải sản phẩm hoặc sản phẩm không tồn tại.</div>;
  if (!product) return <div className="container section">Không tìm thấy sản phẩm</div>;

  return (
    <div className="container section product-detail fade-in">
      {/* --- BREADCRUMBS --- */}
      <div className="breadcrumbs mb-4 muted" style={{fontSize: '0.9rem'}}>
        <Link to="/" className="text-blue-600 hover:underline">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link to="/menu" className="text-blue-600 hover:underline">Thực đơn</Link>
        {product.category && (
            <>
                <span className="mx-2">/</span>
                <Link to={`/categories/${product.category.id}`} className="text-blue-600 hover:underline">
                    {product.category.name}
                </Link>
            </>
        )}
        <span className="mx-2">/</span>
        <span className="text-text font-semibold">{product.name}</span>
      </div>

      <div className="pd-head">
        <div className="pd-media">
          {/* Ảnh sản phẩm dùng LazyImage */}
          <LazyImage
            src={product.imageUrl}
            alt={product.name}
            className="product-detail-img"
            style={{ borderRadius: 16, width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
          />
        </div>
        <div className="pd-info">
          <h1 className="pd-name">{product.name}</h1>
          <div className="flex-row gap-3 align-center mb-3">
             <div className="pd-price">{formatVND(product.price)}</div>
             {product.stock > 0 ? (
                 <span className="badge delivering">Còn {product.stock} phần</span>
             ) : (
                 <span className="badge cancelled">Hết hàng</span>
             )}
          </div>
          
          <div className="pd-avg flex-row align-center gap-2 mb-4" style={{fontSize: '1.1rem'}}>
            <Stars value={avgRating} /> 
            <span className="pd-avg-num fw-bold">({avgRating.toFixed(1)})</span>
            <span className="muted">• {reviews.length} đánh giá</span>
          </div>

          <div className="card" style={{background: '#f8fafc', border: 'none'}}>
             <div className="fw-bold mb-2">Mô tả món ăn:</div>
             <p className="pd-desc" style={{lineHeight: 1.6, color: '#475569'}}>{product.description || "Đang cập nhật..."}</p>
          </div>
          
          <div className="pd-cart mt-4 p-4 border rounded-2xl bg-white shadow-sm">
            <div className="flex-row space-between align-center w-full">
                <div className="qty-box">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <input className="qty-input" type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
                </div>
                <div className="text-right">
                    <div className="muted small">Tạm tính</div>
                    <div className="fw-bold text-primary">{formatVND(product.price * qty)}</div>
                </div>
            </div>
            
            <button
              className="btn btn-primary w-full mt-3"
              disabled={addToCartMutation.isPending || product.stock <= 0}
              onClick={handleAddToCart}
              style={{ padding: '14px', fontSize: '1rem', opacity: product.stock <= 0 ? 0.5 : 1 }}
            >
              {product.stock <= 0 ? "Hết hàng" : addToCartMutation.isPending ? "Đang xử lý..." : "Thêm vào giỏ hàng"}
            </button>
          </div>
        </div>
      </div>

      {/* --- SẢN PHẨM LIÊN QUAN --- */}
      {relatedProducts.length > 0 && (
        <div className="related-products mt-5 pt-5 border-top">
            <h2 className="h2 mb-4">Có thể bạn sẽ thích</h2>
            <div className="grid4">
                {relatedProducts.map(p => (
                    <div key={p.id} className="card product-card card-hover">
                        <Link to={`/products/${p.id}`}>
                            <div className="product-thumb-wrapper">
                                <LazyImage src={p.imageUrl} alt={p.name} />
                            </div>
                        </Link>
                        <div className="product-info">
                            <Link to={`/products/${p.id}`} className="product-name">{p.name}</Link>
                            <div className="product-price">{formatVND(p.price)}</div>
                        </div>
                        <div className="card-actions">
                            <button className="btn btn-primary" onClick={() => {
                                // Add to cart logic nhanh tại đây (nếu muốn) hoặc điều hướng vào trang chi tiết
                                addToCart(p.id, 1).then(() => {
                                    toast.success("Đã thêm!");
                                    getCart().then(c => {
                                        const total = (c?.items || []).reduce((s,i)=>s+(i.quantity||0),0);
                                        setCount(total);
                                    });
                                }).catch(()=>toast.error("Lỗi thêm"));
                            }}>Thêm</button>
                            <Link to={`/products/${p.id}`} className="btn btn-ghost">Xem</Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- ĐÁNH GIÁ --- */}
      <div className="pd-reviews mt-5">
        <h2 className="h2">Đánh giá từ khách hàng</h2>
        <div className="grid2" style={{alignItems: 'start'}}>
            {/* Form đánh giá */}
            <div className="review-form card" style={{background: '#f9fafb'}}>
            {!token ? (
                <div className="muted text-center py-4">Vui lòng <Link to="/admin/login" className="text-primary fw-bold">đăng nhập</Link> để viết đánh giá.</div>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
                <h4 style={{marginTop:0}}>Viết đánh giá của bạn</h4>
                <div className="flex-row gap-2 mb-3">
                    <label>Xếp hạng:</label>
                    <select className="input" style={{width: 'auto'}} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                        <option value="5">5 ★ Tuyệt vời</option>
                        <option value="4">4 ★ Tốt</option>
                        <option value="3">3 ★ Bình thường</option>
                        <option value="2">2 ★ Tệ</option>
                        <option value="1">1 ★ Rất tệ</option>
                    </select>
                </div>
                <textarea
                    className="input" rows="3"
                    placeholder="Chia sẻ cảm nhận của bạn về món ăn này..."
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    style={{marginBottom: 10}}
                />
                <button className="btn btn-primary w-full" disabled={createMut.isPending}>
                    {createMut.isPending ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
                </form>
            )}
            </div>

            {/* List đánh giá */}
            <div className="review-list-container">
                {loadingReviews ? (
                <div>Đang tải đánh giá…</div>
                ) : reviews.length === 0 ? (
                <div className="muted card p-4 text-center">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
                ) : (
                <ul className="review-list">
                    {reviews.map((r) => (
                    <li key={r.id} className="review-item">
                        <div className="review-head">
                        <div style={{fontWeight: 600}}>{r.userName || "Khách hàng"}</div>
                        <span className="review-time muted" style={{fontSize: '0.8rem'}}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""}
                        </span>
                        </div>
                        <div className="review-rating" style={{color: '#f59e0b', fontSize: '0.9rem'}}>
                        <Stars value={r.rating} />
                        </div>
                        {r.comment && <div className="review-comment" style={{marginTop: 4, color: '#334155'}}>{r.comment}</div>}
                        {canDeleteReview(r) && (
                        <button
                            className="btn btn-ghost btn-sm text-red"
                            onClick={() => delMut.mutate(r.id)}
                            disabled={delMut.isPending}
                            style={{marginTop: 8, fontSize: '0.75rem', padding: '4px 8px'}}
                        >
                            Xoá
                        </button>
                        )}
                    </li>
                    ))}
                </ul>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

function Stars({ value = 0 }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="rating-stars" title={`${value}/5`}>
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}