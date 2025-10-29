import React from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      alert("Đã thêm vào giỏ");
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (e) => alert(e?.response?.data?.error || "Thêm giỏ hàng thất bại"),
  });

  const handleAddToCart = () => {
    if (!token) {
      nav("/admin/login?redirect=/cart");
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
      qc.invalidateQueries({ queryKey: ["reviews", pid] });
      qc.invalidateQueries({ queryKey: ["reviews-avg", pid] });
    },
    onError: (e) => alert(e?.response?.data?.error || "Gửi đánh giá thất bại"),
  });

  const delMut = useMutation({
    mutationFn: (rid) => deleteReview(pid, rid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews", pid] }),
    onError: (e) => alert(e?.response?.data?.error || "Xoá đánh giá thất bại"),
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
          {product.stock != null && <div className="pd-stock">Còn hàng: {product.stock}</div>}
          <div className="pd-avg">
            <Stars value={avgRating} /> <span className="pd-avg-num">({avgRating.toFixed(1)})</span>
          </div>
          {product.description && <p className="pd-desc">{product.description}</p>}
          <div className="pd-cart">
            <label className="qty-label">Số lượng</label>
            <div className="qty-box">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Giảm"
              >
                −
              </button>
              <input
                className="qty-input"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Tăng"
              >
                +
              </button>
            </div>
            <button
              className="btn"
              disabled={addToCartMutation.isPending}
              onClick={handleAddToCart}
            >
              {addToCartMutation.isPending ? "Đang thêm…" : "Thêm vào giỏ"}
            </button>
          </div>
        </div>
      </div>

      <div className="pd-reviews">
        <h2>Đánh giá</h2>
        {loadingReviews ? (
          <div>Đang tải đánh giá…</div>
        ) : reviews.length === 0 ? (
          <div>Chưa có đánh giá nào.</div>
        ) : (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id} className="review-item">
                <div className="review-head">
                  <strong>{r.userName || "Người dùng"}</strong>
                  <span className="review-time">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <div className="review-rating">
                  <Stars value={r.rating} />
                </div>
                {r.comment && <div className="review-comment">{r.comment}</div>}
                {canDeleteReview(r) && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => delMut.mutate(r.id)}
                    disabled={delMut.isPending}
                  >
                    Xoá
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="review-form">
          <h3>Viết đánh giá</h3>
          {!token ? (
            <div>Vui lòng đăng nhập để đánh giá.</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate();
              }}
            >
              <label className="label">Điểm (1–5)</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <label className="label">Nhận xét</label>
              <textarea
                className="input"
                rows="3"
                placeholder="Cảm nhận của bạn…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn btn-primary" disabled={createMut.isPending}>
                {createMut.isPending ? "Đang gửi…" : "Gửi đánh giá"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Stars({ value = 0 }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="rating-stars" title={`${value}/5`}>
      {"★★★★★".slice(0, full)}
      {"☆☆☆☆☆".slice(0, 5 - full)}
    </span>
  );
}