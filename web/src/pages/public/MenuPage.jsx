import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { searchProducts } from "../../api/products.js"; 
import { getCategories } from "../../api/categories.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import LazyImage from "../../component/LazyImage.jsx";
import toast from "react-hot-toast";
import { FaShoppingCart, FaStore, FaSearch } from "react-icons/fa";

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";
const PAGE_SIZE = 12; // Số món mỗi trang

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Search & Filter
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm); // State để debounce
  const [selectedCategory, setSelectedCategory] = useState("");

  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();

  // 1. Tải danh mục (Chỉ chạy 1 lần khi mount)
  useEffect(() => {
    getCategories().then(data => {
        setCategories(Array.isArray(data) ? data : []);
    }).catch(() => toast.error("Lỗi tải danh mục"));
  }, []);

  // 2. Xử lý Debounce cho ô tìm kiếm (tránh gọi API liên tục khi gõ)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500); // Chờ 500ms sau khi ngừng gõ
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Reset về trang 1 khi thay đổi bộ lọc (Danh mục hoặc Từ khóa)
  useEffect(() => {
    setPage(1);
  }, [debouncedTerm, selectedCategory]);

  // 4. Fetch dữ liệu sản phẩm (Gọi khi Page, Category hoặc SearchTerm thay đổi)
  useEffect(() => {
    let stop = false;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await searchProducts({
            page, 
            limit: PAGE_SIZE,
            q: debouncedTerm,
            categoryId: selectedCategory || null, // Nếu rỗng thì gửi null để API bỏ qua lọc
        });

        if (!stop) {
            setProducts(res.items || []);
            // API trả về `total` (tổng số bản ghi), tính totalPages
            const total = res.total || 0;
            setTotalElements(total);
            setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
        }
      } catch (e) {
        console.error(e);
        if(!stop) toast.error("Lỗi tải thực đơn");
      } finally {
        if (!stop) setLoading(false);
      }
    };

    fetchProducts();
    return () => { stop = true; };
  }, [page, debouncedTerm, selectedCategory]);

  async function handleAddToCart(product) {
    if (!token) {
      toast("Vui lòng đăng nhập để mua hàng", { icon: '🔑' });
      nav("/admin/login?redirect=/menu");
      return;
    }
    
    if ((product.stock || 0) <= 0) {
        toast.error("Sản phẩm đã hết hàng");
        return;
    }

    try {
      await addToCart(product.id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ`);
      
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Thêm vào giỏ thất bại");
    }
  }

  return (
    <div className="container section fade-in">
      <div className="menu-layout">
        {/* Sidebar Danh mục */}
        <aside className="menu-sidebar card-hover">
          <h3 className="sidebar-title">Danh Mục</h3>
          <ul>
            <li
              className={`category-item ${selectedCategory === "" ? "active" : ""}`}
              onClick={() => setSelectedCategory("")}
            >
              Tất cả sản phẩm
            </li>
            {categories.map((cat) => (
              <li
                key={cat.id}
                className={`category-item ${selectedCategory === String(cat.id) ? "active" : ""}`}
                onClick={() => setSelectedCategory(String(cat.id))}
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </aside>

        {/* Danh sách sản phẩm */}
        <main className="menu-products">
          <div className="search-bar flex-row gap-2">
            <div className="input-group flex-1" style={{position:'relative'}}>
                <input
                type="text"
                className="input"
                style={{paddingLeft: '40px'}}
                placeholder="Tìm món ăn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} />
            </div>
            {totalElements > 0 && <div className="badge" style={{height:'42px', padding:'0 16px', background:'#eef2ff', color:'#4f46e5', border:'1px solid #c7d2fe'}}>Tìm thấy: {totalElements}</div>}
          </div>

          {loading ? (
            <div className="muted text-center py-10">
                <div className="loading"></div> Đang tải thực đơn...
            </div>
          ) : products.length > 0 ? (
            <>
                <div className="grid4 product-grid">
                {products.map((product) => (
                    <div key={product.id} className="card product-card card-hover">
                    <Link to={`/products/${product.id}`}>
                        <div className="product-thumb-wrapper">
                        <LazyImage
                            src={product.imageUrl}
                            alt={product.name}
                            style={{ width: "100%", height: "100%" }}
                        />
                        </div>
                    </Link>
                    <div className="product-info">
                        <Link to={`/products/${product.id}`} className="product-name">
                        {product.name}
                        </Link>
                        <div className="product-price">{formatVND(product.price)}</div>
                    </div>
                    <div className="card-actions">
                        <button 
                            className="btn btn-primary" 
                            onClick={() => handleAddToCart(product)}
                            disabled={(product.stock||0) <= 0}
                            style={{ opacity: (product.stock||0) <= 0 ? 0.6 : 1 }}
                        >
                        {(product.stock||0) <= 0 ? "Hết hàng" : <><FaShoppingCart/> Thêm</>}
                        </button>
                        <Link to={`/products/${product.id}`} className="btn btn-ghost">
                            Chi tiết
                        </Link>
                    </div>
                    </div>
                ))}
                </div>

                {/* THANH PHÂN TRANG */}
                {totalPages > 1 && (
                    <div className="pagination mt-4 justify-center">
                        <button 
                            className="btn btn-outline" 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Trước
                        </button>
                        <span className="mx-2 font-bold" style={{alignSelf:'center'}}>
                            Trang {page} / {totalPages}
                        </span>
                        <button 
                            className="btn btn-outline" 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)}
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </>
          ) : (
            <div className="card p-5 text-center muted py-10">
              <FaStore style={{fontSize:'3rem', marginBottom: 16, opacity: 0.3}}/>
              <p>Không tìm thấy sản phẩm nào phù hợp.</p>
              <button className="btn btn-ghost mt-2" onClick={()=>{setSearchTerm(""); setSelectedCategory("")}}>Xóa bộ lọc</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}