import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listProducts } from "../../api/products.js"; 
import { getCategories } from "../../api/categories.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import LazyImage from "../../component/LazyImage.jsx"; // Import LazyImage
import toast from "react-hot-toast";

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Xử lý Search Param từ URL (ví dụ ?q=com)
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [selectedCategory, setSelectedCategory] = useState("");

  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();

  // Đồng bộ URL search param vào state khi URL thay đổi
  useEffect(() => {
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      try {
        // Lấy danh sách sản phẩm và danh mục
        const [prodsData, catsData] = await Promise.all([
          listProducts({ size: 1000 }), // Lấy tất cả để filter client-side cho mượt
          getCategories(),
        ]);
        if (!stop) {
          setProducts(Array.isArray(prodsData) ? prodsData : (prodsData?.content || prodsData?.items || []));
          setCategories(Array.isArray(catsData) ? catsData : []);
        }
      } catch (e) {
        console.error("Failed to load menu data:", e);
        toast.error("Lỗi tải thực đơn");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

  const filteredProducts = useMemo(() => {
    let items = products;

    // Lọc theo danh mục
    if (selectedCategory) {
      items = items.filter(p => String(p.category?.id) === selectedCategory);
    }

    // Lọc theo từ khóa tìm kiếm
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      items = items.filter(p => (p.name || "").toLowerCase().includes(term));
    }

    // Chỉ hiện sản phẩm đang Active (nếu API trả về cả ẩn)
    return items.filter(p => p.active !== false);
  }, [products, selectedCategory, searchTerm]);

  async function handleAddToCart(product) {
    if (!token) {
      toast("Vui lòng đăng nhập để mua hàng", { icon: '🔑' });
      nav("/admin/login?redirect=/menu");
      return;
    }
    
    if (product.stock <= 0) {
        toast.error("Sản phẩm đã hết hàng");
        return;
    }

    try {
      await addToCart(product.id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ`);
      
      // Cập nhật số lượng trên Header
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
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="muted text-center py-10">
                <div className="loading"></div> Đang tải thực đơn...
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid4 product-grid">
              {filteredProducts.map((product) => (
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
                        disabled={product.stock <= 0}
                        style={{ opacity: product.stock <= 0 ? 0.6 : 1 }}
                    >
                      {product.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                    </button>
                    <Link to={`/products/${product.id}`} className="btn btn-ghost">
                        Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-5 text-center muted">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}