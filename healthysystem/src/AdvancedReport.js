import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const COLORS = ['#0984e3', '#27ae60', '#e67e22', '#e74c3c', '#8e44ad', '#16a085'];

const KPICard = ({ label, value, sub, color }) => (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}>
        <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{sub}</div>}
    </div>
);

const AdvancedReport = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [invoices, setInvoices] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [medicineData, setMedicineData] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [paidCount, setPaidCount] = useState(0);
    const [freeCount, setFreeCount] = useState(0);
    const [medicines, setMedicines] = useState([]);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        try {
            const [inv, chart, meds, allMed] = await Promise.all([
                axios.get(`${API}/api/reports/revenue`, auth()),
                axios.get(`${API}/api/reports/chart-revenue`, auth()),
                axios.get(`${API}/api/reports/chart-medicines`, auth()),
                axios.get(`${API}/api/medicines/all`, auth()),
            ]);

            setInvoices(inv.data);
            const total = inv.data.reduce((a, c) => a + parseFloat(c.TotalAmount || 0), 0);
            setTotalRevenue(total);
            setPaidCount(inv.data.filter(i => parseFloat(i.TotalAmount) > 0).length);
            setFreeCount(inv.data.filter(i => parseFloat(i.TotalAmount) === 0).length);
            setRevenueData(chart.data);
            setMedicineData(meds.data);
            setMedicines(allMed.data);
        } catch (e) { console.error(e); }
    };

    const bhytData = [
        { name: 'BHYT K3 (Miễn phí)', value: freeCount },
        { name: 'Thanh toán thường', value: paidCount },
    ];

    const lowStock = medicines.filter(m => m.StockQuantity <= 50);
    const nearExpiry = medicines.filter(m => {
        if (!m.ExpiryDate) return false;
        const diff = (new Date(m.ExpiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        return diff <= 30 && diff >= 0;
    });

    const tabBtn = (t, label) => (
        <button onClick={() => setActiveTab(t)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            borderBottom: activeTab === t ? '3px solid #0984e3' : '3px solid transparent',
            background: 'transparent', color: activeTab === t ? '#0984e3' : '#7f8c8d'
        }}>{label}</button>
    );

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '20px' }}>
                DASHBOARD THỐNG KÊ & BÁO CÁO
            </h2>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <KPICard label="Tổng Doanh Thu" value={`${(totalRevenue / 1000).toFixed(0)}K`} sub={`${totalRevenue.toLocaleString('vi-VN')} VNĐ`} color="#27ae60" />
                <KPICard label="Tổng Hóa Đơn" value={invoices.length} sub="Đã thanh toán" color="#0984e3" />
                <KPICard label="BHYT K3 Miễn Phí" value={freeCount} sub="Bệnh nhân hưởng 0đ" color="#8e44ad" />
                <KPICard label="Thuốc Sắp Hết" value={lowStock.length} sub="Dưới 50 đơn vị" color="#e74c3c" />
                <KPICard label="Sắp Hết Hạn" value={nearExpiry.length} sub="Trong 30 ngày tới" color="#e67e22" />
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                {tabBtn('overview', 'Tổng Quan')}
                {tabBtn('revenue', 'Doanh Thu')}
                {tabBtn('medicine', 'Dược Phẩm')}
                {tabBtn('bhyt', 'BHYT')}
                {tabBtn('invoices', 'Chi Tiết Hóa Đơn')}
            </div>

            {/* TAB TỔNG QUAN */}
            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Doanh Thu 7 Ngày Gần Nhất</h4>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={11} />
                                <YAxis tickFormatter={v => `${v / 1000}k`} fontSize={11} />
                                <Tooltip formatter={v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)} />
                                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#27ae60" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Tỷ Lệ BHYT vs Thường</h4>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={bhytData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                                    {bhytData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TAB DOANH THU */}
            {activeTab === 'revenue' && (
                <div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Biểu Đồ Doanh Thu Theo Ngày (7 Ngày Gần Nhất)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={v => `${v / 1000}k`} />
                                <Tooltip formatter={v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)} />
                                <Legend />
                                <Bar dataKey="revenue" name="Doanh Thu (VNĐ)" fill="#0984e3" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold' }}>DOANH THU TRUNG BÌNH / NGÀY</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0984e3', marginTop: '6px' }}>
                                {revenueData.length > 0 ? Math.round(revenueData.reduce((a, c) => a + parseFloat(c.revenue || 0), 0) / revenueData.length).toLocaleString('vi-VN') : 0} đ
                            </div>
                        </div>
                        <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold' }}>DOANH THU CAO NHẤT</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60', marginTop: '6px' }}>
                                {revenueData.length > 0 ? Math.max(...revenueData.map(d => parseFloat(d.revenue || 0))).toLocaleString('vi-VN') : 0} đ
                            </div>
                        </div>
                        <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold' }}>TỔNG DOANH THU</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c', marginTop: '6px' }}>
                                {totalRevenue.toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB DƯỢC PHẨM */}
            {activeTab === 'medicine' && (
                <div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Top 5 Thuốc Xuất Kho Nhiều Nhất</h4>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={medicineData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="MedicineName" type="category" width={150} fontSize={11} />
                                <Tooltip />
                                <Bar dataKey="total_sold" name="Số lượng xuất" fill="#8e44ad" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {lowStock.length > 0 && (
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e74c3c', marginBottom: '16px' }}>
                            <h4 style={{ color: '#e74c3c', marginTop: 0 }}>Thuốc Sắp Hết Tồn Kho (dưới 50 đơn vị)</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead><tr style={{ background: '#fee' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Tên Thuốc</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>Tồn Kho</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>Đơn Vị</th>
                                </tr></thead>
                                <tbody>
                                    {lowStock.map(m => (
                                        <tr key={m.MedicineID} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px' }}>{m.MedicineName}</td>
                                            <td style={{ padding: '8px', textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>{m.StockQuantity}</td>
                                            <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>{m.Unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #ddd' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Tổng Tồn Kho Hiện Tại ({medicines.length} loại)</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead><tr style={{ background: '#f8f9fa' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Tên Thuốc</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Tồn Kho</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Đơn Vị</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Đơn Giá</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Trạng Thái</th>
                            </tr></thead>
                            <tbody>
                                {medicines.map((m, i) => (
                                    <tr key={m.MedicineID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{m.MedicineName}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{m.StockQuantity}</td>
                                        <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>{m.Unit}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{parseFloat(m.Price || 0).toLocaleString('vi-VN')} đ</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                background: m.StockQuantity <= 10 ? '#fee' : m.StockQuantity <= 50 ? '#fff3cd' : '#e8f8f5',
                                                color: m.StockQuantity <= 10 ? '#e74c3c' : m.StockQuantity <= 50 ? '#e67e22' : '#27ae60'
                                            }}>
                                                {m.StockQuantity <= 10 ? 'Nguy hiểm' : m.StockQuantity <= 50 ? 'Sắp hết' : 'Đủ kho'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB BHYT */}
            {activeTab === 'bhyt' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #8e44ad', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>BHYT K3 MIỄN PHÍ 100%</div>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#8e44ad', margin: '10px 0' }}>{freeCount}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>bệnh nhân</div>
                        </div>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #0984e3', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>THANH TOÁN THƯỜNG</div>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0984e3', margin: '10px 0' }}>{paidCount}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>bệnh nhân</div>
                        </div>
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #27ae60', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>TỶ LỆ BHYT K3</div>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#27ae60', margin: '10px 0' }}>
                                {invoices.length > 0 ? Math.round((freeCount / invoices.length) * 100) : 0}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>trên tổng số hóa đơn</div>
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                        <h4 style={{ color: '#2c3e50', marginTop: 0 }}>Phân Tích BHYT</h4>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={bhytData} cx="50%" cy="50%" outerRadius={110} dataKey="value"
                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                    fontSize={12}>
                                    {bhytData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TAB CHI TIẾT HÓA ĐƠN */}
            {activeTab === 'invoices' && (
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#0984e3', color: '#fff' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã HĐ</th>
                                <th style={{ padding: '12px' }}>Thời Gian Thu</th>
                                <th style={{ padding: '12px' }}>Phương Thức</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Số Tiền</th>
                                <th style={{ padding: '12px' }}>Loại</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv, i) => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '12px 16px', color: '#888' }}>#{inv.InvoiceID}</td>
                                    <td style={{ padding: '12px', textAlign: 'center', color: '#555' }}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ background: '#e8f4fd', color: '#0984e3', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{inv.PaymentMethod || 'Tiền mặt'}</span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e74c3c' }}>
                                        {parseFloat(inv.TotalAmount) === 0 ? '0đ (BHYT K3)' : parseFloat(inv.TotalAmount).toLocaleString('vi-VN') + ' đ'}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            background: parseFloat(inv.TotalAmount) === 0 ? '#f0fff4' : '#fff0f0',
                                            color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e74c3c'
                                        }}>
                                            {parseFloat(inv.TotalAmount) === 0 ? 'MIỄN PHÍ' : 'TỰ TRẢ'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                                <td colSpan={3} style={{ padding: '12px 16px' }}>TỔNG CỘNG ({invoices.length} hóa đơn)</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#27ae60', fontSize: '15px' }}>{totalRevenue.toLocaleString('vi-VN')} đ</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdvancedReport;