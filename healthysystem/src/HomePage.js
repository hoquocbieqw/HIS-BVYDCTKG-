import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from './logo.png'; 
import './HomePage.css'; 

const HomePage = () => {
    return (
        <div>
            {/* HEADER GIỐNG WEB GỐC */}
            <div className="yhct-header">
                <img src={logoImg} alt="Logo BV" className="yhct-logo" />
                <div className="yhct-titles">
                    <div className="yhct-title-top">SỞ Y TẾ TỈNH AN GIANG</div>
                    <h1 className="yhct-title-main">BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h1>
                    <div className="yhct-title-sub">Thân thiện - Tận tâm - Hiệu quả</div>
                </div>
                <Link to="/login" className="login-btn-header">Đăng Nhập Hệ Thống</Link>
            </div>

            {/* THANH MENU XANH DƯƠNG */}
            <div className="yhct-nav">
                <Link to="/">🏠 TRANG CHỦ</Link>
                <Link to="/">DU LỊCH Y TẾ</Link>
                <Link to="/">ĐIỀU TRỊ CHUYÊN SÂU</Link>
                <Link to="/">SẢN PHẨM DƯỢC</Link>
                <Link to="/">THÔNG TIN THUỐC</Link>
                <Link to="/">Y TẾ THÔNG MINH</Link>
            </div>

            {/* BANNER TÒA NHÀ BỆNH VIỆN */}
            <div className="yhct-banner">
                <div className="banner-text">
                    Chào mừng đến cổng thông tin điện tử Bệnh viện Y dược cổ truyền Kiên Giang
                </div>
            </div>

            {/* PHẦN TIN TỨC (CÓ HÌNH ẢNH) */}
            <div className="news-section">
                <div className="news-header-title">TIN TỨC - SỰ KIỆN</div>
                <div className="news-grid">
                    <div className="news-card">
                        <div className="news-img" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop")' }}></div>
                        <div className="news-info">
                            <h4>Bệnh viện YHCT TPHCM đón tiếp đoàn công tác tuyến tỉnh học hỏi kinh nghiệm</h4>
                        </div>
                    </div>
                    <div className="news-card">
                        <div className="news-img" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1551076805-e18690c5e561?q=80&w=1000&auto=format&fit=crop")' }}></div>
                        <div className="news-info">
                            <h4>Lễ trao Quyết định công nhận Ban chấp hành Đảng bộ Bệnh viện nhiệm kỳ mới</h4>
                        </div>
                    </div>
                    <div className="news-card">
                        <div className="news-img" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?q=80&w=1000&auto=format&fit=crop")' }}></div>
                        <div className="news-info">
                            <h4>Kỷ niệm ngày Thầy thuốc Việt Nam - Vinh danh các cá nhân xuất sắc</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;    