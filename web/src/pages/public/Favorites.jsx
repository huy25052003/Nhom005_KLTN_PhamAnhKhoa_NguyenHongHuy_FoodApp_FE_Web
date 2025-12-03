import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyFavorites, toggleFavorite } from "../../api/favorites.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import LazyImage from "../../component/LazyImage.jsx";
import ConfirmModal from "../../component/ConfirmModal.jsx";
import { FaHeart, FaShoppingCart, FaStore } from "react-icons/fa";

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function FavoritesPage() {
  const { token } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { setCount } = useCart();
  
  const [page, setPage] = useState(0);
  const [size] = useState(12);

  // State cho Modal xác nhận
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });

  // 1. Fetch danh sách yêu thích
  const { data, isLoading } = useQuery({
    queryKey: ["favorites", page],
    queryFn: () => getMyFavorites(page, size),
    enabled: !!token, 
  });

  // 2. Xử lý Thêm vào giỏ
  const { mutate: doAddToCart, isPending: adding } = useMutation({
    mutationFn: async (product) => {
        if ((product.stock || 0) <= 0) throw new Error("Sản phẩm hết hàng");
        await addToCart(product.id, 1);
        return product;
    },
    onSuccess: async (product) => {
        toast.success(`Đã thêm "${product.name}" vào giỏ`);
        const c = await getCart();
        const total = (c?.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        setCount(total);
    },
    onError: (e) => toast.error(e.message || "Lỗi thêm giỏ hàng")
  });

  // 3. Xử lý Bỏ yêu thích
  const { mutate: doRemove, isPending: removing } = useMutation({
    mutationFn: async (id) => {
        await toggleFavorite(id);
        return id;
    },
    onSuccess: () => {
        toast.success("Đã xóa khỏi yêu thích");
        qc.invalidateQueries({ queryKey: ["favorites"] });
        setConfirmState({ isOpen: false, id: null }); // Đóng modal
    },
    onError: () => {
        toast.error("Lỗi cập nhật");
        setConfirmState({ isOpen: false, id: null });
    }
  });

  // Redirect nếu chưa login
  useEffect(() => {
    if (!token) nav("/admin/login?redirect=/favorites");
  }, [token, nav]);

  // Handler mở modal
  const openConfirm = (id) => {
    setConfirmState({ isOpen: true, id });
  };

  if (isLoading) return <div className="container section text-center"><div className="loading"></div> Đang tải...</div>;

  const items = data?.content || [];
  const totalPages = Math.max(1, data?.totalPages || 1);

  return (
    <div className="container section fade-in">
      <h1 className="h1 mb-4">Sản phẩm yêu thích</h1>

      {items.length === 0 ? (
        <div className="card text-center py-10">
          <div style={{fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem'}}>
             <FaHeart />
          </div>
          <p className="muted mb-4">Bạn chưa lưu sản phẩm nào.</p>
          <Link className="btn btn-primary" to="/menu">
             <FaStore /> Khám phá thực đơn
          </Link>
        </div>
      ) : (
        <>
          <div className="grid4 product-grid">
            {items.map((p) => (
              <div key={p.id} className="card product-card card-hover">
                <Link to={`/products/${p.id}`}>
                   <div className="product-thumb-wrapper">
                      <LazyImage
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: '100%', height: '100%' }}
                      />
                   </div>
                </Link>
                
                <div className="product-info">
                  <Link to={`/products/${p.id}`} className="product-name">{p.name}</Link>
                  <div className="product-price">{formatVND(p.price)}</div>
                </div>

                <div className="card-actions">
                   <button 
                     className="btn btn-primary" 
                     disabled={adding || (p.stock||0) <= 0}
                     onClick={() => doAddToCart(p)}
                     style={{ opacity: (p.stock||0) <= 0 ? 0.6 : 1 }}
                   >
                     {(p.stock||0) <= 0 ? "Hết hàng" : <><FaShoppingCart/> Thêm</>}
                   </button>
                   
                   <button 
                     className="btn btn-ghost text-red" 
                     disabled={removing}
                     onClick={() => openConfirm(p.id)}
                     title="Bỏ thích"
                   >
                     {/* Đã đổi lại thành FaHeart */}
                     <FaHeart />
                   </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination mt-4 justify-center">
              <button className="btn" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>← Trước</button>
              <span className="mx-2">Trang {page + 1}/{totalPages}</span>
              <button className="btn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
            </div>
          )}
        </>
      )}

      {/* MODAL CONFIRM */}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Bỏ yêu thích?"
        message="Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?"
        confirmText={removing ? "Đang xóa..." : "Xóa ngay"}
        isDanger={true}
        onConfirm={() => doRemove(confirmState.id)}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
      />
    </div>
  );
}