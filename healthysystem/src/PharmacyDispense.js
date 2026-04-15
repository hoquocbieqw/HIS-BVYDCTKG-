import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const PharmacyDispense = () => {
    const [readyList, setReadyList] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState([]);
    const [dispensing, setDispensing] = useState(false);
    const [dispensed, setDispensed] = useState(false);

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchReadyList(); }, []);

    // Chỉ lấy đơn thuốc đã được Thu ngân thanh toán (Status='Paid')
    const fetchReadyList = async () => {
        try {
            const res = await axios.get(`${API}/api/prescriptions/ready-dispense`, getAuthHeader());
            setReadyList(res.data);
        } catch (err) {
            console.error("Lỗi tải danh sách cấp phát:", err.message);
        }
    };

    const handleSelectRecord = async (record) => {
        setSelectedRecord(record);
        setDispensed(false);
        try {
            const res = await axios.get(`${API}/api/prescriptions/details/${record.RecordID}`, getAuthHeader());
            // Thêm thông tin lô FEFO (demo - trong thực tế lấy từ bảng medicine_batches)
            const withBatch = res.data.map((item, idx) => ({
                ...item,
                BatchNumber: `LOT-${new Date().getFullYear()}-${String(item.MedicineID || idx + 1).padStart(3, '0')}`,
                ExpiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6 + (idx % 6))).toLocaleDateString('vi-VN'),
            }));
            setPrescriptionDetails(withBatch);
        } catch (err) {
            alert("Lỗi tải chi tiết đơn: " + err.message);
        }
    };

    const handleConfirmDispense = async () => {
        if (!selectedRecord) return;
        if (!window.confirm(`XÁC NHẬN CẤP PHÁT THUỐC:\nBệnh nhân: ${selectedRecord.PatientName}\nHệ thống sẽ trừ kho theo nguyên tắc FEFO.\n\nXác nhận?`)) return;

        setDispensing(true);
        try {
            await axios.post(`${API}/api/prescriptions/dispense/${selectedRecord.RecordID}`, {}, getAuthHeader());
            setDispensed(true);
            fetchReadyList();
        } catch (err) {
            alert("Lỗi cấp phát: " + (err.response?.data?.message || err.message));
        } finally {
            setDispensing(false);
        }
    };

    const handleNextPatient = () => {
        setSelectedRecord(null);
        setPrescriptionDetails([]);
        setDispensed(false);
    };

    const isK3Free = selectedRecord?.InsuranceType === 'K3' && Number(selectedRecord?.TransferTicket) === 1;

    const styles = {
        container: { padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' },
        panel: { backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '15px' },
        h3: { marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '10px' },
        recordItem: (selected) => ({
            padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
            backgroundColor: selected ? '#f5eef8' : 'transparent',
            borderLeft: selected ? '4px solid #8e44ad' : '4px solid transparent'
        }),
        th: { padding: '10px', textAlign: 'left', border: '1px solid #ddd', backgroundColor: '#f4f6f7' },
        td: { padding: '10px', border: '1px solid #ddd' },
    };

    return (
        <div style={styles.container}>
            {/* CỘT 1: DANH SÁCH CHỜ CẤP PHÁT */}
            <div style={{ ...styles.panel, width: '340px', flexShrink: 0 }}>
                <h3 style={styles.h3}>HÀNG ĐỢI CẤP PHÁT THUỐC</h3>
                <div style={{ fontSize: '12px', color: '#8e44ad', marginBottom: '10px', fontStyle: 'italic' }}>
                    Chỉ hiển thị đơn thuốc đã được Thu ngân thanh toán.
                </div>
                {readyList.length === 0 ? (
                    <p style={{ color: '#7f8c8d' }}>Không có đơn thuốc chờ cấp phát.</p>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {readyList.map(record => (
                        <li key={record.RecordID}
                            style={styles.recordItem(selectedRecord?.RecordID === record.RecordID)}
                            onClick={() => handleSelectRecord(record)}
                        >
                            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{record.PatientName}</div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>
                                Mã BA: #{record.RecordID} — {new Date(record.AppointmentDate).toLocaleDateString('vi-VN')}
                            </div>
                            {record.InsuranceType === 'K3' && Number(record.TransferTicket) === 1 ? (
                                <span style={{ fontSize: '11px', backgroundColor: '#27ae60', color: '#fff', padding: '2px 7px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }}>
                                    BHYT K3 — Thuốc Miễn Phí
                                </span>
                            ) : record.InsuranceType && record.InsuranceType !== 'None' ? (
                                <span style={{ fontSize: '11px', backgroundColor: '#2980b9', color: '#fff', padding: '2px 7px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }}>
                                    BHYT {record.InsuranceType}
                                </span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: CHI TIẾT ĐƠN THUỐC */}
            <div style={{ ...styles.panel, flex: 1 }}>
                <h3 style={styles.h3}>CHI TIẾT ĐƠN THUỐC & CẤP PHÁT</h3>

                {!selectedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0' }}>
                        Chọn đơn thuốc từ danh sách bên trái hoặc quét mã trên phiếu bệnh nhân.
                    </div>
                ) : dispensed ? (
                    <div>
                        <div style={{ backgroundColor: '#27ae60', color: '#fff', padding: '25px', textAlign: 'center', borderRadius: '4px', marginBottom: '15px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>XUẤT KHO THÀNH CÔNG</div>
                            <div>Bệnh nhân: {selectedRecord.PatientName}</div>
                            {isK3Free && <div style={{ marginTop: '8px', fontSize: '14px' }}>Thuốc được cấp phát MIỄN PHÍ (BHYT K3 đúng tuyến)</div>}
                        </div>
                        {/* Phiếu nhận thuốc demo */}
                        <div style={{ border: '1px dashed #8e44ad', padding: '15px', marginBottom: '15px', fontSize: '13px' }}>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>PHIẾU NHẬN THUỐC — BV YDCT KIÊN GIANG</div>
                            <div>Bệnh nhân: <strong>{selectedRecord.PatientName}</strong></div>
                            <div>Mã bệnh án: <strong>#{selectedRecord.RecordID}</strong></div>
                            <div>Ngày cấp: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></div>
                            {isK3Free && <div style={{ color: '#27ae60', fontWeight: 'bold', marginTop: '5px' }}>BHYT K3 CHI TRẢ 100% — BN TRẢ: 0 VNĐ</div>}
                            <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f4f6f7' }}>
                                        <th style={styles.th}>Thuốc</th>
                                        <th style={{ ...styles.th, textAlign: 'center' }}>SL</th>
                                        <th style={styles.th}>Cách dùng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescriptionDetails.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.td}>{item.MedicineName}</td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>{item.Quantity} {item.Unit}</td>
                                            <td style={styles.td}>{item.Dosage}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#2980b9', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                In phiếu nhận thuốc
                            </button>
                            <button onClick={handleNextPatient} style={{ padding: '10px 20px', backgroundColor: '#8e44ad', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                Bệnh nhân tiếp theo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Header bệnh nhân */}
                        <div style={{ backgroundColor: '#f9f9f9', padding: '12px', border: '1px dashed #bdc3c7', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div><strong>Bệnh nhân:</strong> <span style={{ color: '#c0392b', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRecord.PatientName}</span></div>
                                    <div style={{ marginTop: '4px' }}><strong>Chẩn đoán:</strong> {selectedRecord.Diagnosis}</div>
                                    {isK3Free && (
                                        <div style={{ marginTop: '6px', backgroundColor: '#e8f8ee', padding: '5px 10px', color: '#155724', fontWeight: 'bold', display: 'inline-block', borderRadius: '3px', fontSize: '13px' }}>
                                            BHYT K3 — THUỐC MIỄN PHÍ 100%
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '13px', color: '#555' }}>
                                    <div style={{ fontWeight: 'bold' }}>Mã quét:</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8e44ad' }}>BR-{selectedRecord.RecordID}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#c0392b', fontWeight: 'bold', marginBottom: '8px' }}>
                            * Hệ thống tự động phân bổ lô thuốc hạn dùng gần nhất (nguyên tắc FEFO).
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Tên thuốc / Vị thuốc</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>ĐVT</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>SL</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Tồn kho</th>
                                    <th style={styles.th}>Mã Lô</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Hạn SD</th>
                                    <th style={styles.th}>Cách dùng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptionDetails.length === 0 ? (
                                    <tr><td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: '#7f8c8d' }}>Đang tải chi tiết...</td></tr>
                                ) : prescriptionDetails.map((item, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.MedicineName}</td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>{item.Unit}</td>
                                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#2980b9' }}>{item.Quantity}</td>
                                        <td style={{ ...styles.td, textAlign: 'center', color: item.StockQuantity < item.Quantity ? '#c0392b' : '#27ae60' }}>
                                            {item.StockQuantity}
                                        </td>
                                        <td style={{ ...styles.td, fontSize: '12px' }}>{item.BatchNumber}</td>
                                        <td style={{ ...styles.td, textAlign: 'center', fontSize: '12px', color: '#c0392b' }}>{item.ExpiryDate}</td>
                                        <td style={{ ...styles.td, fontSize: '13px' }}>{item.Dosage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedRecord(null)}
                                style={{ backgroundColor: '#95a5a6', color: '#fff', padding: '11px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                Hủy bỏ
                            </button>
                            <button onClick={handleConfirmDispense}
                                disabled={dispensing || prescriptionDetails.length === 0}
                                style={{
                                    backgroundColor: dispensing ? '#7f8c8d' : '#8e44ad',
                                    color: '#fff', padding: '11px 25px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                    opacity: prescriptionDetails.length === 0 ? 0.5 : 1
                                }}>
                                {dispensing ? 'Đang xử lý...' : 'XÁC NHẬN XUẤT KHO & CẤP PHÁT'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmacyDispense;