import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RevenueReport = () => {
    const [total, setTotal] = useState(0);
    const [invoices, setInvoices] = useState([]);

    useEffect(() => {
        const fetchRevenue = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/reports/revenue', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const sum = res.data.reduce((acc, curr) => acc + curr.TotalAmount, 0);
                setTotal(sum);
                setInvoices(res.data);
            } catch (err) {
                console.error("Lỗi lấy báo cáo:", err);
            }
        };
        fetchRevenue();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '10px' }}>BÁO CÁO DOANH THU HỆ THỐNG</h2>
            
            <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: '30px', border: '1px solid #27ae60' }}>
                <h3 style={{ color: '#7f8c8d', margin: 0 }}>TỔNG DOANH THU THỰC TẾ</h3>
                <p style={{ fontSize: '40px', color: '#27ae60', fontWeight: 'bold', margin: '10px 0' }}>
                    {total.toLocaleString()} VNĐ
                </p>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
                <h3 style={{ color: '#2980b9', marginTop: 0 }}>CHI TIẾT DÒNG TIỀN THU</h3>
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
                                <td style={{ textAlign: 'right', paddingRight: '20px', color: '#c0392b', fontWeight: 'bold' }}>{inv.TotalAmount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RevenueReport;