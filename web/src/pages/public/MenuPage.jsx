import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { searchProducts } from "../../api/products.js"; 
import { getCategories } from "../../api/categories.js";
import { addToCart, getCart } from "../../api/cart.js";
import { useAuth } from "../../stores/auth.js";
import { useCart } from "../../stores/cart.js";
import LazyImage from "../../component/LazyImage.jsx";
import toast from "react-hot-toast";
import { FaSearch, FaSortAmountDown, FaFilter } from "react-icons/fa"; // Bỏ FaShoppingCart, FaInfoCircle thừa

const formatVND = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " đ";
const PAGE_SIZE = 12;

export default function MenuPage() {
  // ... (Giữ nguyên toàn bộ logic State, Effect ở trên không đổi) ...
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [debouncedMin, setDebouncedMin] = useState("");
  const [debouncedMax, setDebouncedMax] = useState("");
  const { token } = useAuth();
  const { setCount } = useCart();
  const nav = useNavigate();

  // ... (Giữ nguyên các useEffect) ...
  useEffect(() => {
    getCategories().then(data => setCategories(Array.isArray(data) ? data : [])).catch(()=>{});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm); setDebouncedMin(minPrice); setDebouncedMax(maxPrice);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, minPrice, maxPrice]);

  useEffect(() => setPage(1), [debouncedTerm, selectedCategory, sortOrder, debouncedMin, debouncedMax]);

  useEffect(() => {
    let stop = false;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await searchProducts({
            page, limit: PAGE_SIZE, q: debouncedTerm, categoryId: selectedCategory || null,
            minPrice: debouncedMin || null, maxPrice: debouncedMax || null
        });
        if (!stop) {
            let items = res.items || [];
            if (debouncedMin) items = items.filter(i => i.price >= Number(debouncedMin));
            if (debouncedMax) items = items.filter(i => i.price <= Number(debouncedMax));
            if (sortOrder === 'asc') items.sort((a,b) => a.price - b.price);
            if (sortOrder === 'desc') items.sort((a,b) => b.price - a.price);
            setProducts(items);
            setTotalElements(res.total || 0);
            setTotalPages(Math.max(1, Math.ceil((res.total || 0) / PAGE_SIZE)));
        }
      } catch (e) { if(!stop) toast.error("Lỗi tải thực đơn"); } finally { if (!stop) setLoading(false); }
    };
    fetchProducts();
    return () => { stop = true; };
  }, [page, debouncedTerm, selectedCategory, sortOrder, debouncedMin, debouncedMax]);

  async function handleAddToCart(product) {
    if (!token) {
      toast("Vui lòng đăng nhập", { icon: '🔑' });
      nav("/admin/login?redirect=/menu");
      return;
    }
    if ((product.stock || 0) <= 0) return toast.error("Hết hàng");
    try {
      await addToCart(product.id, 1);
      toast.success(`Đã thêm "${product.name}"`);
      const cart = await getCart();
      const items = cart?.items || cart?.cartItems || [];
      setCount(items.reduce((s, it) => s + (it?.quantity ?? 0), 0));
    } catch (e) { toast.error("Lỗi thêm giỏ hàng"); }
  }

  return (
    <div className="container section fade-in">
      <div className="menu-layout">
        
        {/* --- SIDEBAR --- */}
        <aside className="menu-sidebar">
          <div className="card sticky-sidebar">
            <h3 className="h5 mb-3 border-b pb-2">Danh Mục</h3>
            <ul className="cat-list">
              <li className={selectedCategory === "" ? "active" : ""} onClick={() => setSelectedCategory("")}>
                <span>🍽️</span> Tất cả món ăn
              </li>
              {categories.map((cat) => (
                <li key={cat.id} className={selectedCategory === String(cat.id) ? "active" : ""} onClick={() => setSelectedCategory(String(cat.id))}>
                  <span>🥗</span> {cat.name}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="menu-products">
          <div className="menu-banner mb-4">
            <div className="banner-content">
              <h2>Thực Đơn Tươi Ngon</h2>
              <p>Đặt món ngay - Giao hàng trong 30 phút!</p>
            </div>
            <div className="banner-decoration">🥦</div>
          </div>

          <div className="menu-toolbar card p-3 mb-4 flex-row gap-3 flex-wrap align-center">
            <div className="input-group flex-1" style={{position:'relative', minWidth: '200px'}}>
                <FaSearch style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} />
                <input type="text" className="input" style={{paddingLeft: '36px', borderRadius: 99}} placeholder="Tìm món ăn..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="price-range flex-row align-center gap-2 bg-gray-50 p-1 px-3 rounded-full border border-gray-200">
               <span className="text-sm muted"><FaFilter/> Giá:</span>
               <input type="number" placeholder="0" className="input-sm" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
               <span className="muted">-</span>
               <input type="number" placeholder="Đến..." className="input-sm" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
            <div className="flex-row align-center gap-2">
                <FaSortAmountDown className="muted"/>
                <select className="select" style={{borderRadius: 99, padding: '8px 16px', minWidth: 140}} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                    <option value="">Mới nhất</option>
                    <option value="asc">Giá thấp đến cao</option>
                    <option value="desc">Giá cao đến thấp</option>
                </select>
            </div>
          </div>

          {loading ? (
            <div className="grid4 product-grid">
               {Array.from({length:8}).map((_,i) => (
                   <div key={i} className="card product-card" style={{height: 340}}>
                       <div className="skeleton-loader" style={{width:'100%', height: 180, marginBottom: 12}}></div>
                       <div className="skeleton-loader" style={{width:'80%', height: 20, marginBottom: 8}}></div>
                       <div className="skeleton-loader" style={{width:'40%', height: 20}}></div>
                   </div>
               ))}
            </div>
          ) : products.length > 0 ? (
            <>
                <div className="grid4 product-grid">
                {products.map((product) => (
                    <div key={product.id} className="card product-card card-hover">
                    <Link to={`/products/${product.id}`}>
                        <div className="product-thumb-wrapper">
                        <LazyImage src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%" }} />
                        </div>
                    </Link>
                    <div className="product-info">
                        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
                        <div className="product-price">{formatVND(product.price)}</div>
                    </div>
                    
                    {/* --- CẬP NHẬT PHẦN NÚT BẤM (Theo yêu cầu) --- */}
                    <div className="card-actions mt-auto grid2" style={{ gap: '12px' }}>
                        {/* Nút 1 (Trái): Thêm vào giỏ */}
                        <button 
                            className="btn btn-primary" 
                            onClick={() => handleAddToCart(product)}
                            disabled={(product.stock||0) <= 0}
                            style={{
                                width: '100%', // Chiếm hết chiều rộng cột
                                padding: '10px 0', // Tăng padding dọc cho nút cao hơn chút
                                fontSize: '0.85rem',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center'
                            }}
                        >
                            {(product.stock||0) <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                        </button>

                        {/* Nút 2 (Phải): Xem chi tiết */}
                        <Link 
                            to={`/products/${product.id}`} 
                            className="btn btn-ghost"
                            style={{
                                width: '100%', // Chiếm hết chiều rộng cột
                                padding: '10px 0', // Padding bằng nút bên cạnh
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center'
                            }}
                        >
                            Xem chi tiết
                        </Link>
                    </div>
                    {/* ------------------------------------------- */}

                    </div>
                ))}
                </div>

                {totalPages > 1 && (
                    <div className="pagination mt-5 justify-center">
                        <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                        <span className="mx-3 font-bold text-primary">Trang {page}</span>
                        <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
                    </div>
                )}
            </>
          ) : (
            <div className="card p-5 text-center py-10" style={{background: '#f9fafb', border:'2px dashed #e5e7eb'}}>
              <div style={{fontSize:'3rem', opacity: 0.3}}>🍲</div>
              <p className="muted mt-2">Không tìm thấy món ăn nào phù hợp.</p>
              <button className="btn btn-link" onClick={()=>{setSearchTerm(""); setSelectedCategory(""); setMinPrice(""); setMaxPrice("");}}>Xóa tất cả bộ lọc</button>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .sticky-sidebar { position: sticky; top: 90px; z-index: 10; }
        .cat-list { list-style: none; padding: 0; margin: 0; }
        .cat-list li { padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; color: var(--text-light); font-weight: 500; display: flex; gap: 8px; align-items: center; }
        .cat-list li:hover { background: #f3f4f6; color: var(--primary); }
        .cat-list li.active { background: var(--primary-50); color: var(--primary); font-weight: 700; }
        .menu-banner { background: linear-gradient(135deg, #059669 0%, var(--primary) 100%); border-radius: 16px; padding: 24px 30px; color: white; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2); }
        .menu-banner h2 { font-size: 1.6rem; margin: 0 0 6px 0; font-weight: 800; }
        .banner-decoration { position: absolute; right: 20px; bottom: -10px; font-size: 4rem; opacity: 0.2; transform: rotate(15deg); }
        .input-sm { width: 80px; padding: 6px 10px; border-radius: 99px; border: 1px solid #e5e7eb; font-size: 0.85rem; outline: none; }
        .input-sm:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(16,185,129,0.1); }
        @media (max-width: 768px) {
            .menu-layout { display: block; }
            .menu-sidebar { display: none; }
            .price-range { width: 100%; justify-content: center; margin-top: 8px; }
            .input-group { width: 100%; }
        }
      `}</style>
    </div>
  );
}