import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Billing = () => {
    const [pendingBills, setPendingBills] = useState([]);
    const [paidInvoices, setPaidInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutData, setCheckoutData] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
    const role = localStorage.getItem('role');

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchData = useCallback(() => {
        axios.get('http://localhost:3001/api/billing/pending', getAuthHeader()).then(res => setPendingBills(res.data)).catch(() => {});
        axios.get('http://localhost:3001/api/invoices/paid', getAuthHeader()).then(res => setPaidInvoices(res.data)).catch(() => {});
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePreview = async (recordId, patientName) => {
        try {
            const res = await axios.get(`http://localhost:3001/api/billing/preview/${recordId}`, getAuthHeader());
            const data = res.data;
            const isK3Free = data.InsuranceType === 'K3' && data.TransferTicket === 1;
            const calculatedTotal = isK3Free ? 0 : data.examFee + data.medicineTotal;
            setCheckoutData({ recordId, patientName, ...data, finalAmount: calculatedTotal, isK3Free });
            setShowCheckoutModal(true);
        } catch (error) { alert("Lỗi khi tính toán viện phí."); }
    };

    const handleCheckout = async () => {
        try {
            await axios.post('http://localhost:3001/api/invoices', {
                recordId: checkoutData.recordId, 
                examFee: checkoutData.examFee, 
                medicineTotal: checkoutData.medicineTotal,
                totalAmount: checkoutData.finalAmount, 
                paymentMethod: checkoutData.isK3Free ? 'BHYT chi trả 100%' : paymentMethod, 
                details: checkoutData.details
            }, getAuthHeader());
            alert("Thanh toán thành công!");
            setShowCheckoutModal(false); 
            fetchData();
        } catch (error) { 
            // IN LỖI CHI TIẾT RA MÀN HÌNH NẾU BACKEND TỪ CHỐI
            alert("Lỗi lưu hóa đơn: " + (error.response?.data?.message || "Lỗi kết nối máy chủ")); 
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#e67e22', borderBottom: '3px solid #f39c12', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>QUẢN LÝ VIỆN PHÍ & THANH TOÁN</h2>
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('pending')} style={{ padding: '12px 20px', background: activeTab === 'pending' ? '#e67e22' : 'transparent', color: activeTab === 'pending' ? 'white' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>Chờ Thanh Toán</button>
                <button onClick={() => setActiveTab('paid')} style={{ padding: '12px 20px', background: activeTab === 'paid' ? '#27ae60' : 'transparent', color: activeTab === 'paid' ? 'white' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>Đã Thu Tiền / Cấp Thuốc</button>
            </div>

            {activeTab === 'pending' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '0 8px 8px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f1f5f9', textAlign: 'left' }}><tr><th style={{padding:'12px'}}>Mã BA</th><th>Bệnh nhân</th><th>Chẩn đoán</th><th style={{textAlign:'center'}}>Thao tác</th></tr></thead>
                        <tbody>
                            {pendingBills.map(b => (
                                <tr key={b.RecordID} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{padding:'12px', fontWeight:'bold'}}>#{b.RecordID}</td>
                                    <td style={{fontWeight:'bold'}}>{b.PatientName}</td><td>{b.Diagnosis}</td>
                                    <td style={{textAlign:'center'}}>{role !== 'Admin' && <button onClick={() => handlePreview(b.RecordID, b.PatientName)} style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Thanh Toán / Cấp Thuốc</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {activeTab === 'paid' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '0 8px 8px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f1f5f9', textAlign: 'left' }}><tr><th style={{padding:'12px'}}>Mã HĐ</th><th>Ngày Thu</th><th>Bệnh nhân</th><th>PT Thanh toán</th><th>Tổng tiền (VNĐ)</th></tr></thead>
                        <tbody>
                            {paidInvoices.map(inv => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{padding:'12px', fontWeight:'bold'}}>#{inv.InvoiceID}</td><td>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                    <td style={{fontWeight:'bold', color:'#27ae60'}}>{inv.PatientName}</td><td>{inv.PaymentMethod}</td>
                                    <td style={{fontWeight:'bold', color:'#c0392b'}}>{inv.TotalAmount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCheckoutModal && checkoutData && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '500px' }}>
                        <h3 style={{ marginTop: 0, color: '#e67e22', textAlign: 'center' }}>XÁC NHẬN THANH TOÁN BHYT</h3>
                        <p><strong>Bệnh nhân:</strong> {checkoutData.patientName}</p>
                        <p><strong>Đối tượng BHYT:</strong> {checkoutData.InsuranceType} - {checkoutData.TransferTicket ? 'Đúng tuyến' : 'Trái tuyến'}</p>
                        <hr style={{ margin: '15px 0' }} />
                        <p>Tiền khám: {checkoutData.examFee.toLocaleString()} đ</p>
                        <p>Tiền thuốc: {checkoutData.medicineTotal.toLocaleString()} đ</p>
                        {checkoutData.isK3Free && <div style={{ padding: '10px', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '5px', marginTop: '15px', textAlign: 'center', fontWeight: 'bold' }}>BHYT K3 CHI TRẢ 100% (CÓ CHUYỂN TUYẾN)</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #27ae60', paddingTop: '15px', marginTop: '15px' }}>
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>TỔNG BỆNH NHÂN TRẢ:</span>
                            <strong style={{ fontSize: '22px', color: '#c0392b' }}>{checkoutData.finalAmount.toLocaleString()} VNĐ</strong>
                        </div>
                        {!checkoutData.isK3Free && (
                            <div style={{ marginTop: '15px' }}>
                                <label>Hình thức thanh toán:</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', marginTop:'5px' }}><option value="Tiền mặt">Tiền mặt</option><option value="Chuyển khoản">Chuyển khoản</option></select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                            <button onClick={() => setShowCheckoutModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Quay lại</button>
                            <button onClick={handleCheckout} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{checkoutData.isK3Free ? 'XÁC NHẬN BHYT 100% & IN PHIẾU' : 'CHỐT HÓA ĐƠN'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Billing;