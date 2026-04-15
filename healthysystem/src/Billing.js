import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const Billing = () => {
    const [pendingBills, setPendingBills] = useState([]);
    const [paidInvoices, setPaidInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [showModal, setShowModal] = useState(false);
    const [checkoutData, setCheckoutData] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
    const [loading, setLoading] = useState(false);
    const role = localStorage.getItem('role');
    const isCashier = role === 'Cashier';

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchData = useCallback(async () => {
        try {
            const [pendingRes, paidRes] = await Promise.all([
                axios.get(`${API}/api/billing/pending`, getAuthHeader()),
                axios.get(`${API}/api/invoices/paid`, getAuthHeader())
            ]);
            setPendingBills(pendingRes.data);
            setPaidInvoices(paidRes.data);
        } catch (err) {
            console.error("Lỗi tải dữ liệu billing:", err.message);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePreview = async (recordId, patientName) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/billing/preview/${recordId}`, getAuthHeader());
            const data = res.data;
            const isK3Free = data.InsuranceType === 'K3' && Number(data.TransferTicket) === 1;

            // Tính tiền theo loại BHYT
            let bhytDiscount = 0;
            if (isK3Free) bhytDiscount = 1.0;
            else if (data.InsuranceType === 'K2') bhytDiscount = 0.8;
            else if (data.InsuranceType === 'K1') bhytDiscount = 0.7;

            const gross = data.examFee + data.medicineTotal;
            const finalAmount = isK3Free ? 0 : Math.round(gross * (1 - bhytDiscount));

            setCheckoutData({
                recordId, patientName, ...data,
                gross, finalAmount, isK3Free, bhytDiscount,
                bhytAmount: Math.round(gross * bhytDiscount)
            });
            setPaymentMethod('Tiền mặt');
            setShowModal(true);
        } catch (err) {
            alert("Lỗi tính toán viện phí: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!checkoutData) return;
        setLoading(true);
        try {
            await axios.post(`${API}/api/invoices`, {
                recordId: checkoutData.recordId,
                examFee: checkoutData.examFee,
                medicineTotal: checkoutData.medicineTotal,
                totalAmount: checkoutData.finalAmount,
                paymentMethod: checkoutData.isK3Free ? 'BHYT chi trả 100%' : paymentMethod,
                details: checkoutData.details
            }, getAuthHeader());
            setShowModal(false);
            fetchData();
            alert(`Thanh toán thành công!\n${checkoutData.isK3Free ? 'Đã in phiếu nhận thuốc MIỄN PHÍ cho bệnh nhân.' : `Bệnh nhân thanh toán: ${checkoutData.finalAmount.toLocaleString()} VNĐ`}`);
        } catch (err) {
            alert("Lỗi lưu hóa đơn: " + (err.response?.data?.message || "Lỗi kết nối"));
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
        h2: { color: '#e67e22', borderBottom: '3px solid #f39c12', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' },
        tab: (active, color) => ({
            padding: '11px 20px', backgroundColor: active ? color : 'transparent',
            color: active ? 'white' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0',
            fontWeight: 'bold', cursor: 'pointer'
        }),
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { padding: '12px', backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' },
        td: { padding: '12px', borderBottom: '1px solid #eee' },
        badge: (color) => ({ display: 'inline-block', padding: '2px 8px', backgroundColor: color, color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }),
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.h2}>QUẢN LÝ VIỆN PHÍ & THANH TOÁN BHYT</h2>

            {role === 'Admin' && (
                <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', padding: '10px 15px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px', color: '#856404' }}>
                    Chế độ Admin: Chỉ xem lịch sử. Thu ngân mới có quyền thực hiện thanh toán.
                </div>
            )}

            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', gap: '4px' }}>
                <button style={styles.tab(activeTab === 'pending', '#e67e22')} onClick={() => setActiveTab('pending')}>
                    Chờ Thanh Toán ({pendingBills.length})
                </button>
                <button style={styles.tab(activeTab === 'paid', '#27ae60')} onClick={() => setActiveTab('paid')}>
                    Đã Thanh Toán ({paidInvoices.length})
                </button>
            </div>

            {activeTab === 'pending' && (
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '0 8px 8px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {pendingBills.length === 0 ? (
                        <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>Không có bệnh án chờ thanh toán.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Mã BA</th>
                                    <th style={styles.th}>Bệnh nhân</th>
                                    <th style={styles.th}>Chẩn đoán</th>
                                    <th style={styles.th}>BHYT</th>
                                    <th style={styles.th}>Ngày tạo</th>
                                    {isCashier && <th style={{ ...styles.th, textAlign: 'center' }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {pendingBills.map(b => (
                                    <tr key={b.RecordID}>
                                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#e67e22' }}>#{b.RecordID}</td>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{b.PatientName}</td>
                                        <td style={styles.td}>{b.Diagnosis}</td>
                                        <td style={styles.td}>
                                            {b.InsuranceType && b.InsuranceType !== 'None' ? (
                                                <span style={styles.badge(b.InsuranceType === 'K3' && Number(b.TransferTicket) ? '#27ae60' : '#2980b9')}>
                                                    {b.InsuranceType}{b.TransferTicket ? ' Đúng tuyến' : ' Trái tuyến'}
                                                </span>
                                            ) : <span style={{ color: '#999' }}>Không BHYT</span>}
                                        </td>
                                        <td style={styles.td}>{new Date(b.CreatedAt).toLocaleDateString('vi-VN')}</td>
                                        {isCashier && (
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button onClick={() => handlePreview(b.RecordID, b.PatientName)}
                                                    disabled={loading}
                                                    style={{ backgroundColor: '#e67e22', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    Thanh Toán
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'paid' && (
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '0 8px 8px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {paidInvoices.length === 0 ? (
                        <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>Chưa có hóa đơn nào.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Mã HĐ</th>
                                    <th style={styles.th}>Ngày Thu</th>
                                    <th style={styles.th}>Bệnh nhân</th>
                                    <th style={styles.th}>BHYT</th>
                                    <th style={styles.th}>PT Thanh toán</th>
                                    <th style={{ ...styles.th, textAlign: 'right' }}>Tổng tiền (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paidInvoices.map(inv => (
                                    <tr key={inv.InvoiceID}>
                                        <td style={{ ...styles.td, fontWeight: 'bold', color: '#27ae60' }}>#{inv.InvoiceID}</td>
                                        <td style={styles.td}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{inv.PatientName}</td>
                                        <td style={styles.td}>
                                            {inv.InsuranceType && inv.InsuranceType !== 'None' ? (
                                                <span style={styles.badge(inv.InsuranceType === 'K3' && Number(inv.TransferTicket) ? '#27ae60' : '#2980b9')}>
                                                    {inv.InsuranceType}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={styles.td}>{inv.PaymentMethod}</td>
                                        <td style={{ ...styles.td, fontWeight: 'bold', color: inv.TotalAmount === 0 ? '#27ae60' : '#c0392b', textAlign: 'right' }}>
                                            {Number(inv.TotalAmount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* MODAL THANH TOÁN */}
            {showModal && checkoutData && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#e67e22', textAlign: 'center', borderBottom: '2px solid #f39c12', paddingBottom: '12px' }}>
                            XÁC NHẬN THANH TOÁN VIỆN PHÍ
                        </h3>

                        <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '5px', marginBottom: '15px' }}>
                            <div style={{ marginBottom: '6px' }}><strong>Bệnh nhân:</strong> {checkoutData.patientName}</div>
                            <div style={{ marginBottom: '6px' }}>
                                <strong>BHYT:</strong> {checkoutData.InsuranceType !== 'None' ? checkoutData.InsuranceType : 'Không có'}
                                {' — '}
                                {Number(checkoutData.TransferTicket) === 1 ? 'Đúng tuyến (có giấy chuyển tuyến)' : 'Trái tuyến / Không có giấy CT'}
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '14px' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px 0' }}>Phí khám bệnh</td>
                                    <td style={{ textAlign: 'right', padding: '8px 0' }}>{checkoutData.examFee.toLocaleString()} đ</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px 0' }}>Tiền thuốc ({checkoutData.details?.length || 0} loại)</td>
                                    <td style={{ textAlign: 'right', padding: '8px 0' }}>{checkoutData.medicineTotal.toLocaleString()} đ</td>
                                </tr>
                                {checkoutData.bhytAmount > 0 && (
                                    <tr style={{ borderBottom: '1px solid #eee', color: '#27ae60' }}>
                                        <td style={{ padding: '8px 0' }}>BHYT thanh toán ({Math.round(checkoutData.bhytDiscount * 100)}%)</td>
                                        <td style={{ textAlign: 'right', padding: '8px 0' }}>- {checkoutData.bhytAmount.toLocaleString()} đ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {checkoutData.isK3Free && (
                            <div style={{ padding: '12px', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '5px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                                BHYT K3 CHI TRẢ 100% (CÓ GIẤY CHUYỂN TUYẾN HỢP LỆ)
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e67e22', paddingTop: '15px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 'bold' }}>BỆNH NHÂN TRẢ:</span>
                            <strong style={{ fontSize: '26px', color: checkoutData.finalAmount === 0 ? '#27ae60' : '#c0392b' }}>
                                {checkoutData.finalAmount.toLocaleString()} VNĐ
                            </strong>
                        </div>

                        {!checkoutData.isK3Free && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Hình thức thanh toán:</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                    <option value="Chuyển khoản">Chuyển khoản (QR)</option>
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
                                Quay lại
                            </button>
                            <button onClick={handleCheckout} disabled={loading}
                                style={{ flex: 2, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: loading ? '#95a5a6' : '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                {loading ? 'Đang xử lý...' : checkoutData.isK3Free ? 'XÁC NHẬN BHYT 100% & IN PHIẾU LĨNH THUỐC' : 'CHỐT HÓA ĐƠN'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;