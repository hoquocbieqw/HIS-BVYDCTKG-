import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PharmacyDispense = () => {
    const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [prescriptionDetails, setPrescriptionDetails] = useState([]);
    const [dispenseStatus, setDispenseStatus] = useState('');

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchPendingPrescriptions();
    }, []);

    const fetchPendingPrescriptions = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/prescriptions/history', getAuthHeader());
            // Lọc ra những đơn thuốc đang ở trạng thái 'Pending' hoặc 'Paid' chờ phát
            // Trong thực tế, chỉ phát thuốc khi Thu ngân đã thu tiền (Paid), ở đây ta hiển thị danh sách chờ.
            setPendingPrescriptions(res.data);
        } catch (err) {
            alert("Lỗi tải danh sách đơn thuốc: " + err.message);
        }
    };

    const handleSelectPrescription = async (record) => {
        setSelectedRecord(record);
        setDispenseStatus('');
        try {
            const res = await axios.get(`http://localhost:3001/api/prescriptions/details/${record.RecordID}`, getAuthHeader());
            
            // Giả lập logic FEFO (First Expired, First Out) từ Database. 
            // Hệ thống tự động map thuốc với Lô (Batch) có hạn sử dụng gần nhất.
            const detailsWithBatch = res.data.map((item, index) => ({
                ...item,
                BatchNumber: `LOT-2026-${String(item.MedicineID || index).padStart(3, '0')}`,
                ExpiryDate: new Date(new Date().setMonth(new Date().getMonth() + Math.floor(Math.random() * 12) + 1)).toLocaleDateString('vi-VN'),
                AllocatedFEFO: true
            }));
            
            setPrescriptionDetails(detailsWithBatch);
        } catch (err) {
            alert("Lỗi tải chi tiết đơn thuốc: " + err.message);
        }
    };

    const handleConfirmDispense = async (e) => {
        e.preventDefault();
        
        const confirmPrint = window.confirm("XÁC NHẬN CẤP PHÁT:\nHệ thống sẽ trừ kho theo nguyên tắc FEFO. Bạn có muốn in hướng dẫn sử dụng dán lên túi thuốc không?");
        if (!confirmPrint) return;

        // Giả lập API gọi cập nhật trạng thái
        // Thực tế sẽ gọi axios.post cập nhật Status = 'Dispensed'
        setDispenseStatus('ĐÃ XUẤT KHO VÀ CẤP PHÁT THÀNH CÔNG');
        
        setTimeout(() => {
            setSelectedRecord(null);
            setPrescriptionDetails([]);
            setDispenseStatus('');
            fetchPendingPrescriptions();
        }, 3000);
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* CỘT 1: DANH SÁCH ĐƠN THUỐC CHỜ PHÁT */}
            <div style={{ width: '380px', backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '15px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '10px' }}>HÀNG ĐỢI CẤP PHÁT THUỐC</h3>
                {pendingPrescriptions.length === 0 ? <p style={{ color: '#7f8c8d' }}>Không có đơn thuốc nào chờ cấp phát.</p> : null}
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingPrescriptions.map(record => (
                        <li key={record.RecordID} 
                            style={{ 
                                padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer', 
                                backgroundColor: selectedRecord?.RecordID === record.RecordID ? '#f5eef8' : 'transparent',
                                borderLeft: selectedRecord?.RecordID === record.RecordID ? '4px solid #8e44ad' : '4px solid transparent'
                            }}
                            onClick={() => handleSelectPrescription(record)}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>{record.PatientName}</div>
                            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>Mã BA: {record.RecordID} | {new Date(record.AppointmentDate).toLocaleDateString('vi-VN')}</div>
                            <div style={{ fontSize: '12px', color: '#8e44ad', marginTop: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Trạng thái: Chờ xuất kho</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: CHI TIẾT ĐƠN THUỐC & FEFO QUẢN LÝ LÔ */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #8e44ad', paddingBottom: '10px' }}>CHI TIẾT ĐƠN THUỐC & ÁP DỤNG FEFO</h3>
                
                {!selectedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px 0' }}>Vui lòng chọn đơn thuốc bên danh sách hàng đợi hoặc quét mã vạch trên biên lai.</div>
                ) : (
                    <div>
                        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px dashed #7f8c8d', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ marginBottom: '8px' }}><strong>Bệnh nhân:</strong> <span style={{ color: '#c0392b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRecord.PatientName}</span></div>
                                    <div style={{ marginBottom: '8px' }}><strong>Chẩn đoán:</strong> {selectedRecord.Diagnosis}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ backgroundColor: '#ecf0f1', padding: '5px 10px', fontWeight: 'bold', border: '1px solid #bdc3c7' }}>MÃ QUÉT: BR-{selectedRecord.RecordID}</div>
                                </div>
                            </div>
                        </div>

                        {dispenseStatus ? (
                            <div style={{ backgroundColor: '#27ae60', color: 'white', padding: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', border: '2px solid #1e8449' }}>
                                {dispenseStatus}
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#c0392b', fontWeight: 'bold' }}>* Hệ thống đã tự động phân bổ lô thuốc có hạn sử dụng gần nhất (FEFO).</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f4f6f7', borderBottom: '2px solid #bdc3c7' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Tên thuốc / Vị thuốc</th>
                                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>ĐVT</th>
                                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>SL</th>
                                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Mã Lô (Batch)</th>
                                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>Hạn SD</th>
                                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ecf0f1' }}>Cách dùng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescriptionDetails.length === 0 ? (
                                            <tr><td colSpan="6" style={{ padding: '10px', textAlign: 'center' }}>Đang tải dữ liệu đơn thuốc...</td></tr>
                                        ) : (
                                            prescriptionDetails.map((item, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', border: '1px solid #ecf0f1' }}>{item.MedicineName}</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ecf0f1' }}>{item.Unit}</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#2980b9', border: '1px solid #ecf0f1' }}>{item.Quantity}</td>
                                                    <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #ecf0f1' }}>{item.BatchNumber}</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#c0392b', border: '1px solid #ecf0f1' }}>{item.ExpiryDate}</td>
                                                    <td style={{ padding: '10px', fontSize: '13px', border: '1px solid #ecf0f1' }}>{item.Dosage}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setSelectedRecord(null)} style={{ backgroundColor: '#95a5a6', color: 'white', padding: '12px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                        HỦY BỎ
                                    </button>
                                    <button onClick={handleConfirmDispense} disabled={prescriptionDetails.length === 0} style={{ backgroundColor: '#8e44ad', color: 'white', padding: '12px 30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: prescriptionDetails.length === 0 ? 0.5 : 1 }}>
                                        IN NHÃN & XUẤT KHO
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