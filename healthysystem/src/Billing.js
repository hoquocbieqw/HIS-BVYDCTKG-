import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const Billing = () => {
    const [pendingBills, setPendingBills] = useState([]);
    const [paidInvoices, setPaidInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [checkoutData, setCheckoutData] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Tien mat');
    const role = localStorage.getItem('role');

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchData = useCallback(() => {
        axios.get(`${API}/api/billing/pending`, getAuthHeader()).then(r => setPendingBills(r.data)).catch(() => {});
        axios.get(`${API}/api/invoices/paid`, getAuthHeader()).then(r => setPaidInvoices(r.data)).catch(() => {});
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePreview = async (recordId, patientName) => {
        try {
            const res = await axios.get(`${API}/api/billing/preview/${recordId}`, getAuthHeader());
            setCheckoutData({ recordId, patientName, ...res.data });
            setPaymentMethod('Tien mat');
        } catch { alert("Loi tinh vien phi."); }
    };

    const handleCheckout = async () => {
        try {
            await axios.post(`${API}/api/invoices`, {
                recordId: checkoutData.recordId,
                examFee: checkoutData.examFee,
                medicineTotal: checkoutData.medicineTotal,
                totalAmount: checkoutData.finalAmount,
                paymentMethod: checkoutData.isK3Free ? 'BHYT chi tra 100%' : paymentMethod,
                details: checkoutData.details
            }, getAuthHeader());
            alert("Thanh toan thanh cong! Da gui thong bao den quay Duoc.");
            setCheckoutData(null);
            fetchData();
        } catch (err) {
            alert("Loi: " + (err.response?.data?.message || "Loi ket noi"));
        }
    };

    // Xuất phiếu lĩnh thuốc miễn phí (in ra trình duyệt)
    const handlePrintFreeTicket = (inv) => {
        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(`
            <html><head><title>Phieu Linh Thuoc</title>
            <style>body{font-family:Arial;padding:20px;max-width:380px;margin:0 auto;}
            .title{text-align:center;font-weight:bold;font-size:18px;margin:10px 0;}
            .info{margin:8px 0;font-size:14px;} .divider{border-top:1px dashed #999;margin:12px 0;}
            .stamp{text-align:center;border:3px solid green;padding:10px;color:green;font-weight:bold;font-size:16px;margin:15px 0;}
            </style></head>
            <body>
                <div style="text-align:center;font-weight:bold">BENH VIEN Y DUOC CO TRUYEN KIEN GIANG</div>
                <div class="title">PHIEU LINH THUOC MIEN PHI</div>
                <div class="divider"></div>
                <div class="info"><strong>So HD:</strong> #${inv.InvoiceID}</div>
                <div class="info"><strong>Benh nhan:</strong> ${inv.PatientName}</div>
                <div class="info"><strong>Loai BHYT:</strong> ${inv.InsuranceType} - Dung tuyen</div>
                <div class="info"><strong>Ngay:</strong> ${new Date(inv.CreatedAt).toLocaleString('vi-VN')}</div>
                <div class="stamp">BHYT CHI TRA 100% - MIEN PHI HOAN TOAN</div>
                <div class="divider"></div>
                <div style="font-size:13px">Xuat trinh phieu nay tai quay Duoc de nhan thuoc</div>
                <div style="font-size:12px;color:#666;margin-top:20px;text-align:center">
                    Ky ten nhan thuoc: _______________
                </div>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    // Xuất XML giám định BHXH
    const handleExportXML = (inv) => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GiamDinhBHYT>
  <HoaDon>
    <MaHoaDon>INV-${inv.InvoiceID}</MaHoaDon>
    <BenhNhan>${inv.PatientName}</BenhNhan>
    <LoaiBHYT>${inv.InsuranceType}</LoaiBHYT>
    <ChuyenTuyen>${inv.TransferTicket ? 'Co' : 'Khong'}</ChuyenTuyen>
    <TienKham>${inv.ExamFee || 50000}</TienKham>
    <TienThuoc>${inv.MedicineTotal || 0}</TienThuoc>
    <TongTien>${inv.TotalAmount}</TongTien>
    <BHYTChiTra>${inv.TotalAmount === 0 ? ((inv.ExamFee || 50000) + (inv.MedicineTotal || 0)) : 0}</BHYTChiTra>
    <BenhNhanTra>${inv.TotalAmount}</BenhNhanTra>
    <PhuongThucTT>${inv.PaymentMethod}</PhuongThucTT>
    <NgayTT>${new Date(inv.CreatedAt).toISOString()}</NgayTT>
  </HoaDon>
</GiamDinhBHYT>`;
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GiamDinh_BHXH_INV${inv.InvoiceID}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const thStyle = { padding: '12px 10px', textAlign: 'left', background: '#f1f5f9', fontWeight: 'bold', color: '#475569' };
    const tdStyle = { padding: '12px 10px', borderBottom: '1px solid #eee' };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#e67e22', borderBottom: '3px solid #f39c12', paddingBottom: '10px', marginBottom: '20px', fontWeight: '800' }}>
                QUAN LY VIEN PHI & THANH TOAN
            </h2>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('pending')}
                    style={{ padding: '12px 20px', background: activeTab === 'pending' ? '#e67e22' : 'transparent', color: activeTab === 'pending' ? '#fff' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>
                    CHO THANH TOAN ({pendingBills.length})
                </button>
                <button onClick={() => setActiveTab('paid')}
                    style={{ padding: '12px 20px', background: activeTab === 'paid' ? '#27ae60' : 'transparent', color: activeTab === 'paid' ? '#fff' : '#64748b', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>
                    DA THU / CAP THUOC ({paidInvoices.length})
                </button>
            </div>

            {activeTab === 'pending' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {pendingBills.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Khong co hoa don nao cho thanh toan.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr>
                                <th style={thStyle}>Ma BA</th>
                                <th style={thStyle}>Benh nhan</th>
                                <th style={thStyle}>Chan doan</th>
                                <th style={thStyle}>Doi tuong BHYT</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Thao tac</th>
                            </tr></thead>
                            <tbody>
                                {pendingBills.map(b => (
                                    <tr key={b.RecordID}>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>#{b.RecordID}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{b.PatientName}</td>
                                        <td style={tdStyle}>{b.Diagnosis}</td>
                                        <td style={tdStyle}>
                                            {b.InsuranceType && b.InsuranceType !== 'None' ? (
                                                <span style={{ background: b.InsuranceType === 'K3' && b.TransferTicket ? '#dcfce7' : '#fef3c7', color: b.InsuranceType === 'K3' && b.TransferTicket ? '#16a34a' : '#d97706', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                                                    {b.InsuranceType} {b.TransferTicket ? '- Dung tuyen' : '- Trai tuyen'}
                                                </span>
                                            ) : <span style={{ color: '#94a3b8' }}>Khong BHYT</span>}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {role !== 'Admin' && (
                                                <button onClick={() => handlePreview(b.RecordID, b.PatientName)}
                                                    style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    Tinh Phi & Thanh Toan
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'paid' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                            <th style={thStyle}>Ma HD</th>
                            <th style={thStyle}>Ngay Thu</th>
                            <th style={thStyle}>Benh nhan</th>
                            <th style={thStyle}>PT TT</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Tong tien (VND)</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Xuat</th>
                        </tr></thead>
                        <tbody>
                            {paidInvoices.map(inv => (
                                <tr key={inv.InvoiceID}>
                                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>#{inv.InvoiceID}</td>
                                    <td style={tdStyle}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#27ae60' }}>{inv.PatientName}</td>
                                    <td style={tdStyle}>{inv.PaymentMethod}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: inv.TotalAmount === 0 ? '#27ae60' : '#c0392b' }}>
                                        {inv.TotalAmount === 0 ? 'MIEN PHI' : Number(inv.TotalAmount).toLocaleString()}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            {inv.TotalAmount === 0 && (
                                                <button onClick={() => handlePrintFreeTicket(inv)}
                                                    style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    In Phieu
                                                </button>
                                            )}
                                            <button onClick={() => handleExportXML(inv)}
                                                style={{ background: '#2980b9', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                                XML BHXH
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Thanh Toán */}
            {checkoutData && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px', color: '#e67e22', textAlign: 'center', borderBottom: '2px solid #f39c12', paddingBottom: '12px' }}>
                            XAC NHAN THANH TOAN VIEN PHI
                        </h3>

                        {/* Thông tin bệnh nhân */}
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                            <div><strong>Benh nhan:</strong> {checkoutData.patientName}</div>
                            <div style={{ marginTop: '5px' }}>
                                <strong>Doi tuong BHYT:</strong>{' '}
                                <span style={{ color: checkoutData.isK3Free ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>
                                    {checkoutData.InsuranceType !== 'None' ? checkoutData.InsuranceType : 'Khong co BHYT'}
                                    {checkoutData.TransferTicket ? ' - Dung tuyen' : checkoutData.InsuranceType !== 'None' ? ' - Trai tuyen' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Chi tiết thuốc */}
                        {checkoutData.details && checkoutData.details.length > 0 && (
                            <div style={{ marginBottom: '15px' }}>
                                <strong style={{ color: '#475569' }}>Chi tiet don thuoc:</strong>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '13px' }}>
                                    <thead><tr style={{ background: '#f1f5f9' }}>
                                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Thuoc</th>
                                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>SL</th>
                                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Thanh tien</th>
                                    </tr></thead>
                                    <tbody>
                                        {checkoutData.details.map((item, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '6px 8px' }}>{item.MedicineName} {item.IsBHYT ? <span style={{ color: '#27ae60', fontSize: '11px' }}>BHYT</span> : ''}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.Quantity}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(item.SubTotal).toLocaleString()}d</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tính tiền */}
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span>Phi kham benh:</span>
                                <span>{Number(checkoutData.examFee).toLocaleString()} d</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span>Tien thuoc:</span>
                                <span>{Number(checkoutData.medicineTotal).toLocaleString()} d</span>
                            </div>
                            {checkoutData.bhytRate > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#27ae60' }}>
                                    <span>BHYT chi tra ({checkoutData.bhytRate}%):</span>
                                    <span>- {Number(checkoutData.bhytCovers).toLocaleString()} d</span>
                                </div>
                            )}
                        </div>

                        {checkoutData.isK3Free && (
                            <div style={{ padding: '12px', background: '#dcfce7', border: '2px solid #16a34a', borderRadius: '6px', margin: '12px 0', textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>
                                BHYT K3 CHI TRA 100% (CO CHUYEN TUYEN)<br />
                                <span style={{ fontSize: '13px', fontWeight: 'normal' }}>Sau khi xac nhan, phieu linh thuoc mien phi se duoc phat</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #27ae60', paddingTop: '15px', marginTop: '10px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>TONG BENH NHAN TRA:</span>
                            <strong style={{ fontSize: '24px', color: checkoutData.finalAmount === 0 ? '#27ae60' : '#c0392b' }}>
                                {checkoutData.finalAmount === 0 ? '0 VND (MIEN PHI)' : `${Number(checkoutData.finalAmount).toLocaleString()} VND`}
                            </strong>
                        </div>

                        {!checkoutData.isK3Free && (
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Hinh thuc thanh toan:</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                    <option value="Tien mat">Tien mat</option>
                                    <option value="Chuyen khoan">Chuyen khoan (QR)</option>
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button onClick={() => setCheckoutData(null)}
                                style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', fontWeight: 'bold' }}>
                                Quay lai
                            </button>
                            <button onClick={handleCheckout}
                                style={{ flex: 2, padding: '12px', border: 'none', borderRadius: '8px', background: '#27ae60', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                {checkoutData.isK3Free ? 'XAC NHAN BHYT 100% & IN PHIEU LINH THUOC' : 'CHOT HOA DON'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;