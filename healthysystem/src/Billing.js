import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Billing = () => {
    const role = JSON.parse(localStorage.getItem('user'))?.role;
    const isReadOnly = role === 'Admin';

    const [pendingList, setPendingList] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [preview, setPreview] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
    const [loading, setLoading] = useState(false);
    const [lastInvoice, setLastInvoice] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        fetchPending();
        fetchPaid();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`${API}/api/billing/pending`, auth());
            setPendingList(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchPaid = async () => {
        try {
            const res = await axios.get(`${API}/api/invoices/paid`, auth());
            setPaidList(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSelectRecord = async (record) => {
        setSelectedRecord(record);
        setPreview(null);
        setLastInvoice(null);
        try {
            const res = await axios.get(`${API}/api/billing/preview/${record.RecordID}`, auth());
            setPreview(res.data);
        } catch (e) { alert('Lỗi tải thông tin hóa đơn: ' + e.message); }
    };

    const isK3Free = (p) => p?.InsuranceType === 'K3' && parseInt(p?.TransferTicket) === 1;

    const calcTotal = (p) => {
        if (!p) return 0;
        if (isK3Free(p)) return 0;
        const examFee = parseFloat(p.examFee || 50000);
        const medTotal = parseFloat(p.medicineTotal || 0);
        const bhytPercent = p.InsuranceType === 'K1' ? 0.3 : p.InsuranceType === 'K2' ? 0.2 : p.InsuranceType === 'K3' ? 0 : 1;
        return (examFee + medTotal) * bhytPercent;
    };

    const handleConfirmPayment = async () => {
        if (!selectedRecord || !preview) return;
        if (isReadOnly) return alert('Bạn chỉ có quyền xem!');
        setLoading(true);
        const total = calcTotal(preview);
        try {
            const res = await axios.post(`${API}/api/invoices`, {
                recordId: selectedRecord.RecordID,
                examFee: preview.examFee,
                medicineTotal: preview.medicineTotal,
                totalAmount: total,
                paymentMethod,
                details: preview.details?.map(d => ({
                    MedicineName: d.MedicineName,
                    Quantity: d.Quantity,
                    Price: d.Price,
                    SubTotal: d.SubTotal
                }))
            }, auth());

            setLastInvoice({
                invoiceId: res.data.invoiceId,
                patient: selectedRecord,
                preview,
                total,
                paymentMethod,
                isK3: isK3Free(preview)
            });

            await fetchPending();
            await fetchPaid();
            setSelectedRecord(null);
            setPreview(null);
            alert(`Thanh toán thành công! Mã hóa đơn: #${res.data.invoiceId}`);
        } catch (err) {
            alert('Lỗi thanh toán: ' + (err.response?.data?.message || err.message));
        }
        setLoading(false);
    };

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Phiếu Thu Viện Phí</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; color: #000; }
            h2, h3 { text-align: center; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td, th { border: 1px solid #555; padding: 7px 10px; }
            th { background: #f0f0f0; }
            .total-row td { font-weight: bold; font-size: 15px; }
            .stamp { border: 3px solid green; display: inline-block; padding: 8px 16px; color: green; font-weight: bold; font-size: 16px; transform: rotate(-15deg); margin: 10px 0; }
            hr { border: 1px solid #999; }
        </style>
        </head><body>${content}</body></html>`);
        win.document.close();
        win.print();
    };

    const tabBtn = (t, label) => (
        <button onClick={() => setActiveTab(t)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
            borderBottom: activeTab === t ? '3px solid #e67e22' : '3px solid transparent',
            background: 'transparent', color: activeTab === t ? '#e67e22' : '#7f8c8d'
        }}>{label}</button>
    );

    const bhytLabel = (type, ticket) => {
        if (type === 'K3' && parseInt(ticket) === 1) return { text: 'BHYT K3 – MIỄN PHÍ 100%', color: '#27ae60' };
        if (type === 'K3') return { text: 'BHYT K3 (không chuyển tuyến)', color: '#e67e22' };
        if (type === 'K2') return { text: 'BHYT K2 – 80%', color: '#3498db' };
        if (type === 'K1') return { text: 'BHYT K1 – 70%', color: '#9b59b6' };
        return { text: 'Không BHYT – Tự thanh toán', color: '#e74c3c' };
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: '#e67e22', margin: 0 }}>
                    Thanh Toán Viện Phí BHYT {isReadOnly && <span style={{ fontSize: '14px', color: '#aaa' }}>(Chỉ Xem)</span>}
                </h2>
                {lastInvoice && (
                    <button onClick={handlePrint} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        In Phiếu Thu Gần Nhất
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '16px' }}>
                {tabBtn('pending', `Chờ Thanh Toán (${pendingList.length})`)}
                {tabBtn('paid', `Đã Thanh Toán (${paidList.length})`)}
            </div>

            {activeTab === 'pending' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    {/* DANH SÁCH CHỜ */}
                    <div style={{ width: '340px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#e67e22', color: '#fff', padding: '12px 15px', fontWeight: 'bold' }}>
                            Hồ Sơ Chờ Thanh Toán
                        </div>
                        {pendingList.length === 0 && <p style={{ padding: '15px', color: '#aaa', textAlign: 'center' }}>Không có hồ sơ cần thanh toán.</p>}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto' }}>
                            {pendingList.map(r => (
                                <li key={r.RecordID}
                                    onClick={() => handleSelectRecord(r)}
                                    style={{
                                        padding: '12px 15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                        background: selectedRecord?.RecordID === r.RecordID ? '#fff7f0' : '#fff',
                                        borderLeft: selectedRecord?.RecordID === r.RecordID ? '4px solid #e67e22' : '4px solid transparent'
                                    }}>
                                    <div style={{ fontWeight: 'bold' }}>{r.PatientName}</div>
                                    <div style={{ fontSize: '12px', color: '#e67e22', marginTop: '3px' }}>{r.Diagnosis}</div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>Mã HB: #{r.RecordID} | {new Date(r.CreatedAt).toLocaleDateString('vi-VN')}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CHI TIẾT THANH TOÁN */}
                    <div style={{ flex: 1 }}>
                        {!selectedRecord || !preview ? (
                            <div style={{ background: '#fff', padding: '60px', textAlign: 'center', color: '#aaa', border: '1px solid #ddd', borderRadius: '8px' }}>
                                Chọn hồ sơ bệnh án để xem chi tiết và xử lý thanh toán.
                            </div>
                        ) : (
                            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                                {/* THÔNG TIN BỆNH NHÂN */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{selectedRecord.PatientName}</div>
                                        <div style={{ color: '#7f8c8d', fontSize: '13px', marginTop: '4px' }}>Chẩn đoán: {selectedRecord.Diagnosis}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {(() => {
                                            const lbl = bhytLabel(preview.InsuranceType, preview.TransferTicket);
                                            return <span style={{ background: lbl.color + '20', color: lbl.color, padding: '6px 14px', borderRadius: '16px', fontWeight: 'bold', fontSize: '13px' }}>{lbl.text}</span>;
                                        })()}
                                    </div>
                                </div>

                                {/* BẢNG DỊCH VỤ */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Dịch Vụ / Thuốc</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>Số Lượng</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Đơn Giá</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Thành Tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '10px' }}>Phí Khám Bệnh</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(preview.examFee).toLocaleString('vi-VN')} đ</td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(preview.examFee).toLocaleString('vi-VN')} đ</td>
                                        </tr>
                                        {preview.details?.map((d, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '10px' }}>{d.MedicineName}</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>{d.Quantity}</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(d.Price).toLocaleString('vi-VN')} đ</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{parseFloat(d.SubTotal).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* TỔNG TIỀN */}
                                <div style={{ background: isK3Free(preview) ? '#e8f8f5' : '#fff7f0', border: `2px solid ${isK3Free(preview) ? '#27ae60' : '#e67e22'}`, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span>Phí khám:</span>
                                        <span>{parseFloat(preview.examFee).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span>Tiền thuốc:</span>
                                        <span>{parseFloat(preview.medicineTotal || 0).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    {isK3Free(preview) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#27ae60' }}>
                                            <span>BHYT K3 + Chuyển tuyến hợp lệ:</span>
                                            <span>- {(parseFloat(preview.examFee) + parseFloat(preview.medicineTotal || 0)).toLocaleString('vi-VN')} đ</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid', paddingTop: '10px', marginTop: '10px', borderColor: isK3Free(preview) ? '#27ae60' : '#e67e22' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>TỔNG BỆNH NHÂN TRẢ:</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '22px', color: isK3Free(preview) ? '#27ae60' : '#e74c3c' }}>
                                            {calcTotal(preview).toLocaleString('vi-VN')} VNĐ
                                        </span>
                                    </div>
                                </div>

                                {/* PHƯƠNG THỨC THANH TOÁN */}
                                {!isReadOnly && (
                                    <>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Hình Thức Thanh Toán</label>
                                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                                style={{ width: '200px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px' }}>
                                                <option>Tiền mặt</option>
                                                <option>Chuyển khoản</option>
                                                <option>Quét QR</option>
                                                <option>BHYT (Miễn phí)</option>
                                            </select>
                                        </div>

                                        {isK3Free(preview) ? (
                                            <button onClick={handleConfirmPayment} disabled={loading}
                                                style={{ width: '100%', padding: '14px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                                                XÁC NHẬN BHYT 100% & IN PHIẾU LĨNH THUỐC
                                            </button>
                                        ) : (
                                            <button onClick={handleConfirmPayment} disabled={loading}
                                                style={{ width: '100%', padding: '14px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                                                CHỐT HÓA ĐƠN — {calcTotal(preview).toLocaleString('vi-VN')} VNĐ
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB ĐÃ THANH TOÁN */}
            {activeTab === 'paid' && (
                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#27ae60', color: '#fff' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã HĐ</th>
                                <th style={{ padding: '12px' }}>Bệnh Nhân</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Số Tiền</th>
                                <th style={{ padding: '12px' }}>Phương Thức</th>
                                <th style={{ padding: '12px' }}>Thời Gian</th>
                                <th style={{ padding: '12px' }}>Loại</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paidList.map((inv, i) => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '11px 16px', color: '#888' }}>#{inv.InvoiceID}</td>
                                    <td style={{ padding: '11px', textAlign: 'center', fontWeight: 'bold' }}>{inv.PatientName}</td>
                                    <td style={{ padding: '11px', textAlign: 'right', fontWeight: 'bold', color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e74c3c' }}>
                                        {parseFloat(inv.TotalAmount) === 0 ? 'MIỄN PHÍ' : parseFloat(inv.TotalAmount).toLocaleString('vi-VN') + ' đ'}
                                    </td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>{inv.PaymentMethod}</td>
                                    <td style={{ padding: '11px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: parseFloat(inv.TotalAmount) === 0 ? '#e8f8f5' : '#fff7f0', color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e67e22' }}>
                                            {parseFloat(inv.TotalAmount) === 0 ? 'K3 MIỄN PHÍ' : 'TỰ TRẢ'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {paidList.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>Chưa có hóa đơn nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PHIẾU IN ẨN */}
            <div ref={printRef} style={{ display: 'none' }}>
                {lastInvoice && (
                    <div>
                        <h2>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h2>
                        <h3>PHIẾU THU VIỆN PHÍ</h3>
                        <p style={{ textAlign: 'center', color: '#888' }}>Số 64 Đống Đa, Rạch Giá, An Giang | ĐT: 0297.3862.161</p>
                        <hr />
                        <p><strong>Mã hóa đơn:</strong> #{lastInvoice.invoiceId}</p>
                        <p><strong>Bệnh nhân:</strong> {lastInvoice.patient?.PatientName}</p>
                        <p><strong>Chẩn đoán:</strong> {lastInvoice.patient?.Diagnosis}</p>
                        <p><strong>Ngày thanh toán:</strong> {new Date().toLocaleString('vi-VN')}</p>
                        <p><strong>Hình thức:</strong> {lastInvoice.paymentMethod}</p>
                        <hr />
                        <table>
                            <thead><tr><th>Dịch Vụ</th><th>SL</th><th>Đơn Giá</th><th>Thành Tiền</th></tr></thead>
                            <tbody>
                                <tr><td>Phí Khám Bệnh</td><td>1</td><td>{parseFloat(lastInvoice.preview?.examFee || 0).toLocaleString('vi-VN')} đ</td><td>{parseFloat(lastInvoice.preview?.examFee || 0).toLocaleString('vi-VN')} đ</td></tr>
                                {lastInvoice.preview?.details?.map((d, i) => (
                                    <tr key={i}><td>{d.MedicineName}</td><td>{d.Quantity}</td><td>{parseFloat(d.Price).toLocaleString('vi-VN')} đ</td><td>{parseFloat(d.SubTotal).toLocaleString('vi-VN')} đ</td></tr>
                                ))}
                                <tr className="total-row"><td colSpan={3}><strong>TỔNG CỘNG</strong></td><td><strong>{lastInvoice.total.toLocaleString('vi-VN')} VNĐ</strong></td></tr>
                            </tbody>
                        </table>
                        {lastInvoice.isK3 && (
                            <div style={{ textAlign: 'center', margin: '16px 0' }}>
                                <div className="stamp">BHYT K3 – MIỄN PHÍ 100%</div>
                                <p><em>Bệnh nhân không phải đóng bất kỳ khoản phí nào. Mang phiếu này đến quầy Dược để nhận thuốc.</em></p>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                            <div style={{ textAlign: 'center' }}><p><strong>Bệnh nhân</strong></p><p style={{ marginTop: '40px' }}>(Ký tên)</p></div>
                            <div style={{ textAlign: 'center' }}><p><strong>Thu Ngân</strong></p><p style={{ marginTop: '40px' }}>(Ký và ghi họ tên)</p></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;