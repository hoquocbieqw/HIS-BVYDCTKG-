import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const PatientHistory = () => {
    const [data, setData] = useState({ debts: [], records: [], invoices: [], appointments: [] });
    const [activeTab, setActiveTab] = useState('records');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(`${API}/api/patient/full-history`, auth());
                setData(res.data);
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    const handlePrint = () => {
        if (!selectedRecord) return;
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Phiếu Khám Bệnh</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
            h2, h3 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            td, th { border: 1px solid #333; padding: 6px 10px; }
            th { background: #f0f0f0; }
            hr { border: 1px solid #999; }
        </style>
        </head><body>${content}</body></html>`);
        win.document.close();
        win.print();
    };

    const tabBtn = (t, label, count) => (
        <button onClick={() => setActiveTab(t)} style={{
            padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
            borderBottom: activeTab === t ? '3px solid #0984e3' : '3px solid transparent',
            background: 'transparent', color: activeTab === t ? '#0984e3' : '#7f8c8d'
        }}>
            {label} {count !== undefined ? `(${count})` : ''}
        </button>
    );

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #74b9ff', paddingBottom: '10px', marginBottom: '16px' }}>
                HỒ SƠ SỨC KHỎE CÁ NHÂN
            </h2>

            {/* CẢNH BÁO NỢ */}
            {data.debts.length > 0 && (
                <div style={{ background: '#fee', border: '1px solid #e74c3c', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px' }}>
                    <strong style={{ color: '#e74c3c' }}>Cảnh báo!</strong> Bạn có <strong>{data.debts.length}</strong> hồ sơ chưa thanh toán viện phí.
                    Vui lòng liên hệ quầy Thu ngân để được cấp phát thuốc.
                </div>
            )}

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '16px' }}>
                {tabBtn('records', 'Lịch Sử Khám Bệnh', data.records.length)}
                {tabBtn('appointments', 'Lịch Hẹn Của Tôi', data.appointments.length)}
                {tabBtn('invoices', 'Hóa Đơn Thanh Toán', data.invoices.length)}
            </div>

            {/* LỊCH SỬ KHÁM */}
            {activeTab === 'records' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ width: '300px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#0984e3', color: '#fff', padding: '12px 14px', fontWeight: 'bold', fontSize: '13px' }}>Danh Sách Lần Khám</div>
                        {data.records.length === 0 && <p style={{ padding: '16px', color: '#aaa', textAlign: 'center', fontSize: '13px' }}>Chưa có lần khám nào.</p>}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {data.records.map(r => (
                                <li key={r.RecordID} onClick={() => setSelectedRecord(r)}
                                    style={{
                                        padding: '12px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                                        background: selectedRecord?.RecordID === r.RecordID ? '#e8f4fd' : '#fff',
                                        borderLeft: selectedRecord?.RecordID === r.RecordID ? '4px solid #0984e3' : '4px solid transparent'
                                    }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#2c3e50' }}>{r.Diagnosis}</div>
                                    <div style={{ fontSize: '11px', color: '#0984e3', marginTop: '2px' }}>ICD: {r.ICD10}</div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>BS: {r.DoctorName} | {new Date(r.AppointmentDate || r.CreatedAt).toLocaleDateString('vi-VN')}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div style={{ flex: 1 }}>
                        {!selectedRecord ? (
                            <div style={{ background: '#fff', padding: '60px', textAlign: 'center', color: '#aaa', border: '1px solid #ddd', borderRadius: '8px' }}>
                                Chọn lần khám bên trái để xem chi tiết.
                            </div>
                        ) : (
                            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, color: '#0984e3' }}>Chi Tiết Lần Khám</h3>
                                    <button onClick={handlePrint} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                        In Phiếu Khám
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', fontSize: '14px' }}>
                                    <div><span style={{ color: '#888' }}>Ngày khám:</span> <strong>{new Date(selectedRecord.AppointmentDate || selectedRecord.CreatedAt).toLocaleDateString('vi-VN')}</strong></div>
                                    <div><span style={{ color: '#888' }}>Bác sĩ:</span> <strong>{selectedRecord.DoctorName}</strong></div>
                                    <div><span style={{ color: '#888' }}>Mã ICD-10:</span> <span style={{ background: '#e8f4fd', color: '#0984e3', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{selectedRecord.ICD10}</span></div>
                                    <div><span style={{ color: '#888' }}>Trạng thái:</span> <strong>{selectedRecord.Status || 'Hoàn thành'}</strong></div>
                                </div>

                                <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '6px' }}>Chẩn Đoán</div>
                                    <div>{selectedRecord.Diagnosis}</div>
                                </div>

                                <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '6px' }}>Kế Hoạch Điều Trị</div>
                                    <div style={{ whiteSpace: 'pre-line' }}>{selectedRecord.TreatmentPlan}</div>
                                </div>

                                {selectedRecord.prescriptions?.length > 0 && (
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>Đơn Thuốc Đông Y</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ background: '#e8f4f8' }}>
                                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Tên Thuốc</th>
                                                    <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Số Lượng</th>
                                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Liều Dùng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedRecord.prescriptions.map((p, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.MedicineName}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>{p.Quantity}</td>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.Dosage}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LỊCH HẸN */}
            {activeTab === 'appointments' && (
                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#0984e3', color: '#fff' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Ngày Khám</th>
                                <th style={{ padding: '12px' }}>Khoa</th>
                                <th style={{ padding: '12px' }}>Bác Sĩ</th>
                                <th style={{ padding: '12px' }}>Lý Do</th>
                                <th style={{ padding: '12px' }}>BHYT</th>
                                <th style={{ padding: '12px' }}>Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.appointments.map((a, i) => (
                                <tr key={a.AppointmentID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '11px 16px', fontWeight: 'bold' }}>{new Date(a.AppointmentDate).toLocaleDateString('vi-VN')}</td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>{a.Department}</td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>{a.DoctorName || '—'}</td>
                                    <td style={{ padding: '11px', color: '#7f8c8d' }}>{a.Reason}</td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '10px', background: '#e8f4fd', color: '#0984e3', fontWeight: 'bold' }}>
                                            {a.InsuranceType || 'Không có'}
                                            {a.TransferTicket ? ' + CT' : ''}
                                        </span>
                                    </td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            background: a.Status === 'Confirmed' ? '#e8f8f5' : a.Status === 'Pending' ? '#fff3cd' : '#fee',
                                            color: a.Status === 'Confirmed' ? '#27ae60' : a.Status === 'Pending' ? '#e67e22' : '#e74c3c'
                                        }}>
                                            {a.Status === 'Confirmed' ? 'Đã Khám' : a.Status === 'Pending' ? 'Chờ Khám' : 'Đã Hủy'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.appointments.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>Chưa có lịch hẹn nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* HÓA ĐƠN */}
            {activeTab === 'invoices' && (
                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#27ae60', color: '#fff' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã HĐ</th>
                                <th style={{ padding: '12px' }}>Chẩn Đoán</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Số Tiền Đã Trả</th>
                                <th style={{ padding: '12px' }}>Phương Thức</th>
                                <th style={{ padding: '12px' }}>Thời Gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.invoices.map((inv, i) => (
                                <tr key={inv.InvoiceID} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '11px 16px', color: '#888' }}>#{inv.InvoiceID}</td>
                                    <td style={{ padding: '11px' }}>{inv.Diagnosis}</td>
                                    <td style={{ padding: '11px', textAlign: 'right', fontWeight: 'bold', color: parseFloat(inv.TotalAmount) === 0 ? '#27ae60' : '#e74c3c' }}>
                                        {parseFloat(inv.TotalAmount) === 0 ? 'MIỄN PHÍ (BHYT K3)' : parseFloat(inv.TotalAmount).toLocaleString('vi-VN') + ' đ'}
                                    </td>
                                    <td style={{ padding: '11px', textAlign: 'center' }}>{inv.PaymentMethod}</td>
                                    <td style={{ padding: '11px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>{new Date(inv.CreatedAt).toLocaleString('vi-VN')}</td>
                                </tr>
                            ))}
                            {data.invoices.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>Chưa có hóa đơn nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PHIẾU IN ẨN */}
            <div ref={printRef} style={{ display: 'none' }}>
                {selectedRecord && (
                    <div>
                        <h2>BỆNH VIỆN Y DƯỢC CỔ TRUYỀN KIÊN GIANG</h2>
                        <h3>PHIẾU KHÁM BỆNH</h3>
                        <hr />
                        <p><strong>Ngày khám:</strong> {new Date(selectedRecord.AppointmentDate || selectedRecord.CreatedAt).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Bác sĩ:</strong> {selectedRecord.DoctorName}</p>
                        <p><strong>Chẩn đoán:</strong> {selectedRecord.Diagnosis}</p>
                        <p><strong>Mã ICD-10:</strong> {selectedRecord.ICD10}</p>
                        <p><strong>Kế hoạch điều trị:</strong></p>
                        <p style={{ marginLeft: '16px', whiteSpace: 'pre-line' }}>{selectedRecord.TreatmentPlan}</p>
                        {selectedRecord.prescriptions?.length > 0 && (
                            <>
                                <hr />
                                <h4>ĐƠN THUỐC</h4>
                                <table>
                                    <thead><tr><th>STT</th><th>Tên Thuốc</th><th>Số Lượng</th><th>Liều Dùng</th></tr></thead>
                                    <tbody>
                                        {selectedRecord.prescriptions.map((p, i) => (
                                            <tr key={i}><td>{i + 1}</td><td>{p.MedicineName}</td><td>{p.Quantity}</td><td>{p.Dosage}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p><strong>Bác sĩ điều trị</strong></p>
                                <p style={{ marginTop: '50px' }}>(Ký và ghi rõ họ tên)</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientHistory;