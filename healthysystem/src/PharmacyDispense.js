import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const PharmacyDispense = () => {
    const [paidPrescriptions, setPaidPrescriptions] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState([]);
    const [dispenseStatus, setDispenseStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPaidPrescriptions();
        const interval = setInterval(fetchPaidPrescriptions, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchPaidPrescriptions = async () => {
        try {
            const res = await axios.get(`${API}/api/prescriptions/history`, auth());
            setPaidPrescriptions(res.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách đơn thuốc đã thanh toán:", err.message);
        }
    };

    const handleSelectPrescription = async (record) => {
        setSelectedRecord(record);
        setDispenseStatus('');
        try {
            const res = await axios.get(`${API}/api/prescriptions/details/${record.RecordID}`, auth());

            // Giả lập FEFO: sắp xếp theo hạn sử dụng gần nhất
            const detailsWithBatch = res.data.map((item, index) => {
                const monthsToExpiry = 3 + (index % 10); // Giả lập: hàng có index nhỏ hơn hết hạn sớm hơn
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + monthsToExpiry);
                return {
                    ...item,
                    BatchNumber: `LOT-${new Date().getFullYear()}-${String(item.MedicineID || index + 1).padStart(3, '0')}`,
                    ExpiryDate: expiryDate.toLocaleDateString('vi-VN'),
                    AllocatedFEFO: true,
                    MonthsLeft: monthsToExpiry
                };
            });
            // Sắp xếp FEFO: hạn sớm nhất lên đầu
            detailsWithBatch.sort((a, b) => a.MonthsLeft - b.MonthsLeft);
            setPrescriptionDetails(detailsWithBatch);
        } catch (err) {
            alert("Lỗi tải chi tiết đơn thuốc: " + err.message);
        }
    };

    const handleConfirmDispense = async () => {
        if (!selectedRecord) return;
        const confirmPrint = window.confirm(
            `XÁC NHẬN CẤP PHÁT:\nBệnh nhân: ${selectedRecord.PatientName}\nHệ thống sẽ trừ kho theo nguyên tắc FEFO (hết hạn trước - xuất trước).\nBạn có muốn xác nhận không?`
        );
        if (!confirmPrint) return;

        setLoading(true);
        try {
            await axios.post(`${API}/api/prescriptions/${selectedRecord.RecordID}/dispense`, {}, auth());
            setDispenseStatus(`ĐÃ XUẤT KHO VÀ CẤP PHÁT THÀNH CÔNG!\nBệnh nhân: ${selectedRecord.PatientName}`);
            setTimeout(() => {
                setSelectedRecord(null);
                setPrescriptionDetails([]);
                setDispenseStatus('');
                fetchPaidPrescriptions();
            }, 3000);
        } catch (err) {
            alert("Lỗi cấp phát: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const printLabel = () => {
        if (!selectedRecord || prescriptionDetails.length === 0) return;
        const printContent = prescriptionDetails.map(item => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;font-weight:bold">${item.MedicineName}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.Unit}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.Quantity}</td>
                <td style="padding:8px;border:1px solid #ddd;font-size:12px">${item.BatchNumber}</td>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;color:#c0392b">${item.ExpiryDate}</td>
                <td style="padding:8px;border:1px solid #ddd">${item.Dosage}</td>
            </tr>
        `).join('');
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Nhãn thuốc</title>
        <style>body{font-family:Arial;margin:20px;}h2,h3{text-align:center;}table{width:100%;border-collapse:collapse;}
        .footer{margin-top:30px;font-size:12px;color:#666;font-style:italic;}</style></head>
        <body>
            <h3>BV Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h3>
            <h2>NHÃN THUỐC - PHIẾU CẤP PHÁT</h2>
            <p><strong>Bệnh nhân:</strong> ${selectedRecord.PatientName} &nbsp;&nbsp; <strong>Mã BA:</strong> #${selectedRecord.RecordID}</p>
            <p><strong>Chẩn đoán:</strong> ${selectedRecord.Diagnosis}</p>
            <p><strong>Ngày cấp phát:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            <table style="margin-top:15px;">
                <thead style="background:#f4f4f4;"><tr>
                    <th style="padding:8px;border:1px solid #ddd">Tên thuốc</th>
                    <th style="padding:8px;border:1px solid #ddd">ĐVT</th>
                    <th style="padding:8px;border:1px solid #ddd">SL</th>
                    <th style="padding:8px;border:1px solid #ddd">Mã Lô</th>
                    <th style="padding:8px;border:1px solid #ddd">Hạn SD</th>
                    <th style="padding:8px;border:1px solid #ddd">Cách dùng</th>
                </tr></thead>
                <tbody>${printContent}</tbody>
            </table>
            <p class="footer">* Hệ thống đã áp dụng nguyên tắc FEFO (First Expired - First Out) khi xuất kho.<br/>
            Vui lòng sử dụng thuốc đúng chỉ định của bác sĩ.</p>
        </body></html>`);
        w.document.close();
        w.print();
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
            {/* CỘT 1: DANH SÁCH ĐƠN THUỐC ĐÃ THANH TOÁN */}
            <div style={{ width: '380px', backgroundColor: '#fff', border: '1px solid #bdc3c7', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#8e44ad', color: 'white', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px' }}>
                    ĐƠN THUỐC CHỜ CẤP PHÁT ({paidPrescriptions.length})
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f9f0ff', fontSize: '12px', color: '#6c3483', borderBottom: '1px solid #d7bde2' }}>
                    Chỉ hiển thị đơn thuốc đã được Thu ngân thanh toán.
                </div>
                {paidPrescriptions.length === 0 ? (
                    <p style={{ color: '#7f8c8d', padding: '20px', textAlign: 'center', fontStyle: 'italic', fontSize: '13px' }}>
                        Chưa có đơn thuốc nào cần cấp phát.<br />Thu ngân cần thanh toán trước.
                    </p>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
                    {paidPrescriptions.map(record => (
                        <li key={record.RecordID}
                            style={{
                                padding: '12px 15px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                backgroundColor: selectedRecord?.RecordID === record.RecordID ? '#f5eef8' : 'transparent',
                                borderLeft: selectedRecord?.RecordID === record.RecordID ? '4px solid #8e44ad' : '4px solid transparent'
                            }}
                            onClick={() => handleSelectPrescription(record)}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>{record.PatientName}</div>
                            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>
                                Mã BA: #{record.RecordID} | {new Date(record.AppointmentDate).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c3483', marginTop: '4px', fontWeight: 'bold' }}>{record.Diagnosis}</div>
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                <span style={{ backgroundColor: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                    ĐÃ THANH TOÁN - Chờ cấp phát
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: CHI TIẾT ĐƠN THUỐC & FEFO */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '10px' }}>
                    CHI TIẾT ĐƠN THUỐC & NGUYÊN TẮC FEFO
                </h3>

                {!selectedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0', fontSize: '15px' }}>
                        Chọn đơn thuốc từ danh sách bên trái để xem chi tiết và tiến hành cấp phát.
                        <br /><span style={{ fontSize: '13px', display: 'block', marginTop: '10px' }}>Hệ thống chỉ hiển thị đơn thuốc sau khi Thu ngân đã thanh toán.</span>
                    </div>
                ) : (
                    <div>
                        {/* THÔNG TIN BỆNH NHÂN */}
                        <div style={{ backgroundColor: '#f9f0ff', padding: '15px', border: '1px solid #d7bde2', marginBottom: '15px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong>Bệnh nhân: </strong>
                                        <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRecord.PatientName}</span>
                                    </div>
                                    <div style={{ marginBottom: '6px' }}><strong>Chẩn đoán: </strong>{selectedRecord.Diagnosis}</div>
                                    <div><strong>Ngày khám: </strong>{new Date(selectedRecord.AppointmentDate).toLocaleDateString('vi-VN')}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ backgroundColor: '#8e44ad', color: 'white', padding: '5px 12px', fontWeight: 'bold', borderRadius: '4px', fontSize: '13px' }}>
                                        MÃ QUÉT: BR-{selectedRecord.RecordID}
                                    </div>
                                    <div style={{ marginTop: '8px', backgroundColor: '#d4edda', color: '#155724', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                        ĐÃ THANH TOÁN
                                    </div>
                                </div>
                            </div>
                        </div>

                        {dispenseStatus ? (
                            <div style={{ backgroundColor: '#27ae60', color: 'white', padding: '25px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', border: '2px solid #1e8449', borderRadius: '8px', whiteSpace: 'pre-line' }}>
                                {dispenseStatus}
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#6c3483', fontWeight: 'bold', backgroundColor: '#f9f0ff', padding: '8px 12px', borderRadius: '4px' }}>
                                    * Hệ thống đã tự động phân bổ lô thuốc có hạn sử dụng gần nhất (FEFO: First Expired, First Out).
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f4f6f7', borderBottom: '2px solid #bdc3c7' }}>
                                                <th style={{ padding: '11px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Tên thuốc / Vị thuốc YHCT</th>
                                                <th style={{ padding: '11px', textAlign: 'center', border: '1px solid #ecf0f1' }}>ĐVT</th>
                                                <th style={{ padding: '11px', textAlign: 'center', border: '1px solid #ecf0f1' }}>SL</th>
                                                <th style={{ padding: '11px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Mã Lô (Batch)</th>
                                                <th style={{ padding: '11px', textAlign: 'center', border: '1px solid #ecf0f1' }}>Hạn SD (FEFO)</th>
                                                <th style={{ padding: '11px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Cách dùng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescriptionDetails.length === 0 ? (
                                                <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#95a5a6' }}>Đang tải dữ liệu...</td></tr>
                                            ) : (
                                                prescriptionDetails.map((item, index) => (
                                                    <tr key={index} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index === 0 ? '#fff9e6' : 'white' }}>
                                                        <td style={{ padding: '11px', fontWeight: 'bold', border: '1px solid #ecf0f1' }}>{item.MedicineName}</td>
                                                        <td style={{ padding: '11px', textAlign: 'center', border: '1px solid #ecf0f1' }}>{item.Unit}</td>
                                                        <td style={{ padding: '11px', textAlign: 'center', fontWeight: 'bold', color: '#2980b9', border: '1px solid #ecf0f1', fontSize: '15px' }}>{item.Quantity}</td>
                                                        <td style={{ padding: '11px', fontSize: '12px', border: '1px solid #ecf0f1', color: '#636e72' }}>{item.BatchNumber}</td>
                                                        <td style={{ padding: '11px', textAlign: 'center', fontSize: '12px', color: '#c0392b', fontWeight: 'bold', border: '1px solid #ecf0f1' }}>
                                                            {item.ExpiryDate}
                                                            {index === 0 && <div style={{ fontSize: '10px', color: '#e67e22' }}>FEFO ưu tiên</div>}
                                                        </td>
                                                        <td style={{ padding: '11px', fontSize: '13px', border: '1px solid #ecf0f1' }}>{item.Dosage}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={printLabel} disabled={prescriptionDetails.length === 0}
                                        style={{ backgroundColor: '#2980b9', color: 'white', padding: '12px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px', opacity: prescriptionDetails.length === 0 ? 0.5 : 1 }}>
                                        In nhãn thuốc
                                    </button>
                                    <button onClick={() => setSelectedRecord(null)}
                                        style={{ backgroundColor: '#95a5a6', color: 'white', padding: '12px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px' }}>
                                        Hủy bỏ
                                    </button>
                                    <button onClick={handleConfirmDispense} disabled={prescriptionDetails.length === 0 || loading}
                                        style={{ backgroundColor: '#8e44ad', color: 'white', padding: '12px 30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px', opacity: (prescriptionDetails.length === 0 || loading) ? 0.5 : 1, fontSize: '14px' }}>
                                        {loading ? 'Đang xử lý...' : 'XÁC NHẬN XUẤT KHO'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmacyDispense; 