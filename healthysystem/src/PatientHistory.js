import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PatientHistory = () => {
    const [data, setData] = useState({ debts: [], records: [], invoices: [] });

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/patient/full-history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setData(res.data);
            } catch (error) {
                console.error("Lỗi tải dữ liệu", error);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '10px', marginBottom: '30px' }}>HỒ SƠ SỨC KHỎE ĐIỆN TỬ CỦA TÔI</h2>

            {/* 1. KHU VỰC CÔNG NỢ */}
            <div style={{ marginBottom: '40px', background: '#fff', border: '1px solid #e74c3c', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ background: '#e74c3c', color: 'white', margin: 0, padding: '15px' }}>THÔNG BÁO CÔNG NỢ VIỆN PHÍ (CẦN THANH TOÁN)</h3>
                <div style={{ padding: '20px' }}>
                    {data.debts.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ textAlign: 'left', background: '#f9f9f9' }}><th style={{ padding: '12px' }}>Mã BA</th><th>Ngày khám</th><th>Bác sĩ</th><th>Chẩn đoán</th></tr></thead>
                            <tbody>
                                {data.debts.map(d => (
                                    <tr key={d.RecordID} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>#{d.RecordID}</td>
                                        <td>{new Date(d.AppointmentDate).toLocaleDateString('vi-VN')}</td>
                                        <td>{d.DoctorName}</td>
                                        <td style={{ color: '#c0392b', fontWeight: 'bold' }}>{d.Diagnosis}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p style={{ color: '#27ae60', fontWeight: 'bold', margin: 0 }}>Cảm ơn bạn! Hiện tại bạn không có công nợ viện phí nào.</p>}
                </div>
            </div>

            {/* 2. LỊCH SỬ KHÁM & ĐƠN THUỐC */}
            <div style={{ marginBottom: '40px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ background: '#3498db', color: 'white', margin: 0, padding: '15px' }}>LỊCH SỬ KHÁM BỆNH & ĐƠN THUỐC</h3>
                <div style={{ padding: '20px' }}>
                    {data.records.length > 0 ? data.records.map(rec => (
                        <div key={rec.RecordID} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '6px', background: rec.Status === 'Cancelled' ? '#fdf1f1' : '#f8f9fa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '10px' }}>
                                <strong>Ngày khám: {new Date(rec.AppointmentDate).toLocaleDateString('vi-VN')}</strong>
                                <span>Bác sĩ: <strong>{rec.DoctorName}</strong> (Mã BA: #{rec.RecordID})</span>
                                {rec.Status === 'Cancelled' && <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>[HỒ SƠ ĐÃ HỦY]</span>}
                            </div>
                            <p style={{ margin: '5px 0' }}><strong>Chẩn đoán:</strong> {rec.Diagnosis}</p>
                            <p style={{ margin: '5px 0' }}><strong>Hướng điều trị:</strong> {rec.TreatmentPlan}</p>
                            <p style={{ margin: '5px 0' }}><strong>Lời dặn:</strong> {rec.Notes || 'Không có'}</p>
                            
                            {rec.prescriptions && rec.prescriptions.length > 0 && (
                                <div style={{ marginTop: '15px', padding: '10px', background: '#fff', border: '1px dashed #3498db', borderRadius: '4px' }}>
                                    <strong style={{ color: '#2980b9' }}>Đơn thuốc đã kê:</strong>
                                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                                        {rec.prescriptions.map((m, i) => (
                                            <li key={i} style={{ fontSize: '14px' }}>{m.MedicineName} - Số lượng: {m.Quantity} - Cách dùng: {m.Dosage}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )) : <p style={{ color: '#999' }}>Chưa có lịch sử khám chữa bệnh.</p>}
                </div>
            </div>

            {/* 3. LỊCH SỬ THANH TOÁN (HÓA ĐƠN) */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ background: '#27ae60', color: 'white', margin: 0, padding: '15px' }}>LỊCH SỬ THANH TOÁN VIỆN PHÍ</h3>
                <div style={{ padding: '20px' }}>
                    {data.invoices.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ textAlign: 'left', background: '#f9f9f9' }}><th style={{ padding: '12px' }}>Mã HĐ</th><th>Ngày lập</th><th>Khám bệnh</th><th>Hình thức TT</th><th>Tổng tiền</th></tr></thead>
                            <tbody>
                                {data.invoices.map(inv => (
                                    <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>#{inv.InvoiceID}</td>
                                        <td>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                        <td>{inv.Diagnosis}</td>
                                        <td>{inv.PaymentMethod}</td>
                                        <td style={{ color: '#c0392b', fontWeight: 'bold' }}>{inv.TotalAmount.toLocaleString()} VNĐ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p style={{ color: '#999' }}>Chưa có lịch sử giao dịch thanh toán.</p>}
                </div>
            </div>
        </div>
    );
};

export default PatientHistory;