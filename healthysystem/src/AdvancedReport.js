import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdvancedReport = () => {
    const [activeTab, setActiveTab] = useState('charts');
    const [invoices, setInvoices] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [medicineData, setMedicineData] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const config = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
                
                // Lấy chi tiết hóa đơn
                const resInvoices = await axios.get('http://localhost:3001/api/reports/revenue', config);
                setInvoices(resInvoices.data);
                
                // SỬA LỖI Ở ĐÂY: Dùng parseFloat để ép kiểu chuỗi thành số thực trước khi cộng dồn
                const sum = resInvoices.data.reduce((acc, curr) => acc + parseFloat(curr.TotalAmount || 0), 0);
                setTotalRevenue(sum);

                // Lấy dữ liệu biểu đồ doanh thu theo ngày
                const resChart = await axios.get('http://localhost:3001/api/reports/chart-revenue', config);
                setRevenueData(resChart.data);

                // Lấy dữ liệu biểu đồ top thuốc
                const resMeds = await axios.get('http://localhost:3001/api/reports/chart-medicines', config);
                setMedicineData(resMeds.data);

            } catch (err) {
                console.error("Lỗi lấy dữ liệu báo cáo:", err);
            }
        };
        fetchReportData();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                DASHBOARD THỐNG KÊ & BÁO CÁO
            </h2>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('charts')} style={{ padding: '12px 20px', background: activeTab === 'charts' ? '#0984e3' : 'transparent', color: activeTab === 'charts' ? 'white' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                    Biểu Đồ Thống Kê
                </button>
                <button onClick={() => setActiveTab('details')} style={{ padding: '12px 20px', background: activeTab === 'details' ? '#0984e3' : 'transparent', color: activeTab === 'details' ? 'white' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                    Chi Tiết Dòng Tiền
                </button>
            </div>

            {/* TAB BIỂU ĐỒ */}
            {activeTab === 'charts' && (
                <div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: '25px', border: '1px solid #27ae60' }}>
                        <h3 style={{ color: '#7f8c8d', margin: 0 }}>TỔNG DOANH THU THỰC TẾ</h3>
                        <p style={{ fontSize: '40px', color: '#27ae60', fontWeight: 'bold', margin: '10px 0' }}>{totalRevenue.toLocaleString('vi-VN')} VNĐ</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#2c3e50', textAlign: 'center', marginBottom: '20px' }}>Biến Động Doanh Thu (7 ngày gần nhất)</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(val) => `${val/1000}k`} />
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#27ae60" strokeWidth={3} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ color: '#2c3e50', textAlign: 'center', marginBottom: '20px' }}>Top 5 Loại Thuốc Xuất Kho Nhiều Nhất</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={medicineData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="MedicineName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="total_sold" name="Số lượng xuất" fill="#3498db" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CHI TIẾT BÁO CÁO */}
            {activeTab === 'details' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '0 8px 8px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f1f2f6', textAlign: 'left' }}>
                                <th style={{ padding: '12px' }}>Mã HĐ</th>
                                <th>Thời gian thu</th>
                                <th>Phương thức</th>
                                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Số tiền (VNĐ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px', color: '#7f8c8d' }}>#{inv.InvoiceID}</td>
                                    <td>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                    <td>{inv.PaymentMethod}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '20px', color: '#c0392b', fontWeight: 'bold' }}>{inv.TotalAmount.toLocaleString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdvancedReport;