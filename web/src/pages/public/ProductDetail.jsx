import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // Đã có sẵn, chỉ cần tận dụng tốt hơn
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "../../api/products";
import { addToCart, getCart } from "../../api/cart";
import { listReviews, createReview, deleteReview, getAvgRating } from "../../api/reviews";
import { useAuth } from "../../stores/auth";
import { useCart } from "../../stores/cart";

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

  const { data: product, isLoading: loadingProduct, error: errProduct } = useQuery({
    queryKey: ["product", pid],
    queryFn: () => getProduct(pid),
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["reviews", pid],
    queryFn: () => listReviews(pid),
  });

  const { data: avgRating = 0 } = useQuery({
    queryKey: ["reviews-avg", pid],
    queryFn: () => getAvgRating(pid),
  });

  const [qty, setQty] = React.useState(1);
  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(pid, qty),
    onSuccess: async () => {
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
      toast.success("Đã thêm vào giỏ hàng!"); // Dùng Toast
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Thêm giỏ hàng thất bại"), // Dùng Toast
  });

  const handleAddToCart = () => {
    if (!token) {
      // Thông báo nhẹ trước khi chuyển trang
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

  if (loadingProduct) return <div className="container section">Đang tải sản phẩm…</div>;
  if (errProduct) return <div className="container section">Lỗi tải sản phẩm</div>;
  if (!product) return <div className="container section">Không tìm thấy sản phẩm</div>;

  return (
    <div className="container section product-detail fade-in">
      <div className="pd-head">
        <div className="pd-media">
          <img
            src={product.imageUrl || product.image || "https://via.placeholder.com/640x480?text=Product"}
            alt={product.name}
          />
        </div>
        <div className="pd-info">
          <h1 className="pd-name">{product.name}</h1>
          <div className="pd-price">{formatVND(product.price)}</div>
          
          <div className="pd-avg" style={{marginBottom: 10}}>
            <Stars value={avgRating} /> <span className="pd-avg-num">({avgRating.toFixed(1)} / 5)</span>
          </div>

          <div className="pd-stock" style={{ color: product.stock > 0 ? 'var(--primary)' : 'red', fontWeight: 600 }}>
              {product.stock > 0 ? `✓ Còn hàng: ${product.stock}` : "✕ Tạm hết hàng"}
          </div>

          {product.description && <p className="pd-desc">{product.description}</p>}
          
          <div className="pd-cart">
            <div className="qty-box">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <input className="qty-input" type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
              <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button
              className="btn btn-primary"
              disabled={addToCartMutation.isPending || product.stock <= 0}
              onClick={handleAddToCart}
              style={{ opacity: product.stock <= 0 ? 0.5 : 1 }}
            >
              {product.stock <= 0 ? "Hết hàng" : addToCartMutation.isPending ? "Đang thêm..." : "Thêm vào giỏ"}
            </button>
          </div>
        </div>
      </div>

      <div className="pd-reviews">
        <h2 className="h2">Đánh giá từ khách hàng</h2>
        {/* Form đánh giá */}
        <div className="review-form card" style={{background: '#f9fafb', padding: 20, marginBottom: 20}}>
          {!token ? (
            <div className="muted">Vui lòng <Link to="/admin/login">đăng nhập</Link> để viết đánh giá.</div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}>
              <h4 style={{marginTop:0}}>Viết đánh giá của bạn</h4>
              <div className="flex-row gap-2" style={{marginBottom: 10}}>
                 <label>Đánh giá:</label>
                 <select className="input" style={{width: 'auto'}} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    <option value="5">5 Sao (Tuyệt vời)</option>
                    <option value="4">4 Sao (Tốt)</option>
                    <option value="3">3 Sao (Bình thường)</option>
                    <option value="2">2 Sao (Tệ)</option>
                    <option value="1">1 Sao (Rất tệ)</option>
                 </select>
              </div>
              <textarea
                className="input" rows="3"
                placeholder="Chia sẻ cảm nhận của bạn về món ăn này..."
                value={comment} onChange={(e) => setComment(e.target.value)}
                style={{marginBottom: 10}}
              />
              <button className="btn" disabled={createMut.isPending}>
                {createMut.isPending ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          )}
        </div>

        {/* List đánh giá */}
        {loadingReviews ? (
          <div>Đang tải đánh giá…</div>
        ) : reviews.length === 0 ? (
          <div className="muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
        ) : (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id} className="review-item">
                <div className="review-head">
                  <div style={{fontWeight: 600}}>{r.userName || "Khách hàng"}</div>
                  <span className="review-time muted" style={{fontSize: '0.8rem'}}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <div className="review-rating" style={{color: '#f59e0b'}}>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <div className="review-comment" style={{marginTop: 4}}>{r.comment}</div>}
                {canDeleteReview(r) && (
                  <button
                    className="btn btn-ghost btn-sm text-red"
                    onClick={() => delMut.mutate(r.id)}
                    disabled={delMut.isPending}
                    style={{marginTop: 8, fontSize: '0.8rem'}}
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