import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listProducts } from "../../api/products.js"; 
import { getCategories } from "../../api/categories.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();

  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      try {
        const [prodsData, catsData] = await Promise.all([
          listProducts({ size: 1000 }),
          getCategories(),
        ]);
        if (!stop) {
          setProducts(Array.isArray(prodsData) ? prodsData : (prodsData?.content || prodsData?.items || []));
          setCategories(Array.isArray(catsData) ? catsData : []);
        }
      } catch (e) {
        console.error("Failed to load menu data:", e);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

  const filteredProducts = useMemo(() => {
    let items = products;

    if (selectedCategory) {
      items = items.filter(p => String(p.category?.id) === selectedCategory);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      items = items.filter(p => (p.name || "").toLowerCase().includes(term));
    }

    return items;
  }, [products, selectedCategory, searchTerm]);

  async function handleAddToCart(product) {
    if (!token) {
      nav("/admin/login?redirect=/menu");
      return;
    }
    try {
      await addToCart(product.id, 1);
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      const totalQty = items.reduce((s, it) => s + (it?.quantity ?? 0), 0);
      setCount(totalQty);
      console.log("Đã thêm vào giỏ:", product.name);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thêm vào giỏ thất bại");
    }
  }

  return (
    <div className="container section fade-in">
      <div className="menu-layout">
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
            <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Đang tải thực đơn...</div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid4 product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="card product-card card-hover">
                  <Link to={`/products/${product.id}`}>
                    <div className="product-thumb-wrapper">
                      <img
                        className="product-img"
                        src={product.imageUrl || "/placeholder.jpg"}
                        alt={product.name}
                        loading="lazy"
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
                    <button className="btn" onClick={() => handleAddToCart(product)}>
                      Thêm vào giỏ
                    </button>
                    <Link to={`/products/${product.id}`} className="btn btn-ghost">Chi tiết</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}