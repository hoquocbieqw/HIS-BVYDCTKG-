import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [icdSearch, setIcdSearch] = useState('');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [savedRecord, setSavedRecord] = useState(null);

    const [recordData, setRecordData] = useState({
        Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: []
    });

    const icd10Dictionary = [
        { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
        { code: 'M54.4', name: 'Đau thắt lưng cùng với đau thần kinh tọa' },
        { code: 'M54.2', name: 'Đau cột sống cổ (Cervicalgia)' },
        { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
        { code: 'E11', name: 'Bệnh đái tháo đường không phụ thuộc insulin' },
        { code: 'M15', name: 'Thoái hóa đa khớp' },
        { code: 'G51.0', name: 'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)' },
        { code: 'M47.8', name: 'Thoái hóa cột sống khác' },
        { code: 'F32.9', name: 'Rối loạn trầm cảm' },
        { code: 'G43', name: 'Đau nửa đầu (Migraine)' },
    ];

    const availableServices = [
        'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống', 'Điện châm', 'Cứu ngải', 'Chiếu đèn hồng ngoại', 'Cấy chỉ', 'Dưỡng sinh'
    ];

    useEffect(() => { fetchPendingPatients(); }, []);

    const fetchPendingPatients = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, auth());
            setPendingPatients(res.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách bệnh nhân:", err.message);
        }
    };

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(icd.code + ' - ' + icd.name);
    };

    const handleToggleService = (service) => {
        const current = recordData.yhctServices;
        setRecordData({
            ...recordData,
            yhctServices: current.includes(service) ? current.filter(s => s !== service) : [...current, service]
        });
    };

    const handleSignAndSave = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert("Hệ thống yêu cầu bắt buộc phải có mã ICD-10 để thanh toán BHYT!");
        const confirmSign = window.confirm("XÁC NHẬN CHỮ KÝ SỐ:\nBạn chịu trách nhiệm pháp lý với Y lệnh này. Xác nhận khóa hồ sơ?");
        if (!confirmSign) return;

        try {
            const treatmentPlanFull = recordData.TreatmentPlan +
                (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : '');

            const res = await axios.post(`${API}/api/medical-records`, {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: treatmentPlanFull,
                Notes: recordData.Notes
            }, auth());

            setSavedRecord({
                RecordID: res.data.recordId,
                PatientName: selectedPatient.PatientName,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: treatmentPlanFull,
                Notes: recordData.Notes,
                YHCTServices: recordData.yhctServices,
                Department: selectedPatient.Department,
                QueueNumber: selectedPatient.QueueNumber,
                InsuranceType: selectedPatient.InsuranceType,
                TransferTicket: selectedPatient.TransferTicket,
                SavedAt: new Date().toLocaleString('vi-VN')
            });
            setShowPrintModal(true);

            setSelectedPatient(null);
            setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
            setIcdSearch('');
            fetchPendingPatients();
        } catch (err) {
            alert("Lỗi lưu hồ sơ: " + (err.response?.data?.message || err.message));
        }
    };

    const printExamSheet = () => {
        const printContent = document.getElementById('exam-print-area').innerHTML;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Phiếu khám bệnh</title>
        <style>
            body { font-family: "Times New Roman", Times, serif; margin: 30px; font-size: 14px; }
            h2, h3 { text-align: center; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .row { display: flex; margin-bottom: 8px; }
            .label { width: 180px; font-weight: bold; }
            .stamp-area { border: 1px dashed #333; height: 80px; margin-top: 20px; display: flex; align-items: center; justify-content: center; color: #999; font-style: italic; }
            .sig-area { margin-top: 40px; text-align: right; }
        </style></head>
        <body>${printContent}</body></html>`);
        w.document.close();
        w.print();
    };

    const getInsuranceLabel = (type, transfer) => {
        if (type === 'BHYT_K3' && transfer) return 'BHYT K3 + Giấy chuyển tuyến (Hưởng 100%)';
        if (type === 'BHYT') return 'BHYT (Không có giấy chuyển tuyến)';
        return 'Tự túc (Không BHYT)';
    };

    const filteredICD = icd10Dictionary.filter(i =>
        !recordData.ICD10 && icdSearch && (
            i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.toUpperCase().includes(icdSearch.toUpperCase())
        )
    );

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
            {/* CỘT 1: HÀNG ĐỢI LÂM SÀNG */}
            <div style={{ width: '340px', backgroundColor: '#fff', border: '1px solid #bdc3c7', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px' }}>
                    HÀNG ĐỢI LÂM SÀNG ({pendingPatients.length})
                </div>
                <div style={{ padding: '10px' }}>
                    <button onClick={fetchPendingPatients} style={{ width: '100%', padding: '8px', backgroundColor: '#ecf0f1', border: '1px solid #bdc3c7', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Làm mới danh sách
                    </button>
                </div>
                {pendingPatients.length === 0 ? (
                    <p style={{ color: '#7f8c8d', padding: '15px', fontStyle: 'italic', fontSize: '13px' }}>Chưa có bệnh nhân nào trong hàng đợi. Lễ tân cần duyệt bệnh nhân trước.</p>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID}
                            style={{
                                padding: '12px 15px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                backgroundColor: selectedPatient?.AppointmentID === p.AppointmentID ? '#e8f4f8' : 'transparent',
                                borderLeft: selectedPatient?.AppointmentID === p.AppointmentID ? '4px solid #2980b9' : '4px solid transparent'
                            }}
                            onClick={() => setSelectedPatient(p)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ backgroundColor: '#e74c3c', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
                                    {p.QueueNumber || '?'}
                                </span>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.PatientName}</div>
                                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                                        {p.Reason} | {p.Department || ''}
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ backgroundColor: p.InsuranceType !== 'None' ? '#d4edda' : '#f8d7da', color: p.InsuranceType !== 'None' ? '#155724' : '#721c24', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                            {p.InsuranceType === 'BHYT_K3' ? 'K3' : p.InsuranceType === 'BHYT' ? 'BHYT' : 'Tự túc'}
                                        </span>
                                        <span style={{ marginLeft: '5px', color: '#aaa', fontSize: '11px' }}>{p.Status}</span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: KHU VỰC EMR */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '10px' }}>
                    HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR)
                </h3>

                {!selectedPatient ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0', fontSize: '15px' }}>
                        Vui lòng chọn bệnh nhân từ hàng đợi lâm sàng bên trái để tiến hành khám.
                        <br /><span style={{ fontSize: '13px', marginTop: '10px', display: 'block' }}>Nếu không có bệnh nhân, hãy yêu cầu Lễ tân duyệt bệnh nhân trong hàng đợi.</span>
                    </div>
                ) : (
                    <form onSubmit={handleSignAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* THÔNG TIN BỆNH NHÂN */}
                        <div style={{ backgroundColor: '#eaf4fb', padding: '15px', border: '1px solid #aed6f1', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#7f8c8d', textTransform: 'uppercase' }}>Đang khám bệnh nhân</div>
                                    <div style={{ color: '#c0392b', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px' }}>{selectedPatient.PatientName}</div>
                                    <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>Khoa: {selectedPatient.Department} | Lý do: {selectedPatient.Reason}</div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#555' }}>
                                    <div>Số TT: <strong style={{ fontSize: '20px', color: '#e74c3c' }}>{selectedPatient.QueueNumber || '-'}</strong></div>
                                    <div style={{ marginTop: '4px', color: selectedPatient.InsuranceType !== 'None' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                        {getInsuranceLabel(selectedPatient.InsuranceType, selectedPatient.TransferTicket)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MÃ ICD-10 */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                                Mã bệnh quốc tế ICD-10 / Chẩn đoán <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input type="text" placeholder="Gõ tên bệnh hoặc mã ICD (VD: Đau lưng, M54...)" value={icdSearch}
                                onChange={(e) => { setIcdSearch(e.target.value); if (!e.target.value) setRecordData({ ...recordData, ICD10: '', Diagnosis: '' }); }}
                                style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px' }} />
                            {filteredICD.length > 0 && (
                                <ul style={{ position: 'absolute', width: '100%', backgroundColor: '#fff', border: '1px solid #bdc3c7', maxHeight: '160px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                    {filteredICD.map(icd => (
                                        <li key={icd.code} onClick={() => handleSelectICD(icd)}
                                            style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                            onMouseEnter={e => e.target.style.backgroundColor = '#e8f4f8'}
                                            onMouseLeave={e => e.target.style.backgroundColor = 'white'}>
                                            <strong>{icd.code}</strong> - {icd.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {recordData.ICD10 && (
                                <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724', fontWeight: 'bold', fontSize: '13px' }}>
                                    Đã chọn: {recordData.ICD10} - {recordData.Diagnosis}
                                </div>
                            )}
                        </div>

                        {/* CHỈ ĐỊNH DỊCH VỤ YHCT */}
                        <div>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Chỉ định Kỹ thuật YHCT (gửi Y tá thực hiện):</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f4f6f7', padding: '15px', border: '1px solid #ecf0f1', borderRadius: '6px' }}>
                                {availableServices.map(srv => (
                                    <label key={srv} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                        <input type="checkbox" checked={recordData.yhctServices.includes(srv)} onChange={() => handleToggleService(srv)} />
                                        {srv}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* KẾ HOẠCH ĐIỀU TRỊ */}
                        <div>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Kế hoạch điều trị / Lời dặn Bác sĩ: <span style={{ color: 'red' }}>*</span></label>
                            <textarea required value={recordData.TreatmentPlan}
                                onChange={e => setRecordData({ ...recordData, TreatmentPlan: e.target.value })}
                                placeholder="Ghi kế hoạch điều trị, lời dặn dò cho bệnh nhân..."
                                style={{ width: '100%', height: '90px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px', resize: 'vertical' }}></textarea>
                        </div>

                        <div>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Ghi chú thêm:</label>
                            <textarea value={recordData.Notes}
                                onChange={e => setRecordData({ ...recordData, Notes: e.target.value })}
                                placeholder="Ghi chú thêm về tình trạng bệnh nhân..."
                                style={{ width: '100%', height: '60px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px', resize: 'vertical' }}></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                            <button type="submit" style={{ flex: 2, backgroundColor: '#c0392b', color: 'white', padding: '14px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px', fontSize: '14px' }}>
                                KÝ SỐ & KHÓA BỆNH ÁN
                            </button>
                            <button type="button" onClick={() => setSelectedPatient(null)} style={{ flex: 1, backgroundColor: '#95a5a6', color: 'white', padding: '14px', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px', fontSize: '14px' }}>
                                Hủy
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* MODAL IN PHIẾU KHÁM */}
            {showPrintModal && savedRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', fontSize: '15px' }}>
                            Khóa bệnh án thành công! Mã hồ sơ: #{savedRecord.RecordID}
                        </div>

                        <div id="exam-print-area">
                            <div className="header" style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>Bệnh viện Y Dược Cổ Truyền Kiên Giang</div>
                                <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>PHIẾU KHÁM BỆNH</div>
                                <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>Mã hồ sơ: #{savedRecord.RecordID} | Ngày: {savedRecord.SavedAt}</div>
                            </div>

                            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>Bệnh nhân:</span><span style={{ fontWeight: 'bold', color: '#c0392b', textTransform: 'uppercase' }}>{savedRecord.PatientName}</span></div>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>Số thứ tự:</span><span>{savedRecord.QueueNumber || '-'}</span></div>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>Khoa:</span><span>{savedRecord.Department}</span></div>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>BHYT:</span><span style={{ color: '#27ae60', fontWeight: 'bold' }}>{getInsuranceLabel(savedRecord.InsuranceType, savedRecord.TransferTicket)}</span></div>
                                <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>Mã ICD-10:</span><span><strong>{savedRecord.ICD10}</strong></span></div>
                                <div style={{ display: 'flex', marginBottom: '6px' }}><span style={{ width: '180px', fontWeight: 'bold' }}>Chẩn đoán:</span><span>{savedRecord.Diagnosis}</span></div>
                                <div style={{ marginBottom: '6px' }}><strong>Kế hoạch điều trị:</strong><br /><span style={{ whiteSpace: 'pre-line', paddingLeft: '10px' }}>{savedRecord.TreatmentPlan}</span></div>
                                {savedRecord.YHCTServices && savedRecord.YHCTServices.length > 0 && (
                                    <div style={{ marginBottom: '6px' }}><strong>Chỉ định YHCT:</strong><span style={{ paddingLeft: '10px' }}>{savedRecord.YHCTServices.join(', ')}</span></div>
                                )}
                                {savedRecord.Notes && (
                                    <div style={{ marginBottom: '6px' }}><strong>Ghi chú:</strong><span style={{ paddingLeft: '10px' }}>{savedRecord.Notes}</span></div>
                                )}
                                <div style={{ borderTop: '1px solid #ccc', marginTop: '15px', paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div style={{ flex: 1, border: '1px dashed #666', padding: '10px', minHeight: '70px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>Mộc xác nhận BHYT / Y tá đóng dấu</div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Bác sĩ khám</div>
                                            <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '4px' }}>(Chữ ký số đã xác nhận)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button onClick={printExamSheet} style={{ flex: 1, padding: '12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                In phiếu khám (Y tá đóng mộc)
                            </button>
                            <button onClick={() => setShowPrintModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                Đóng & Tiếp tục khám
                            </button>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '12px', color: '#7f8c8d', marginTop: '10px', fontStyle: 'italic' }}>
                            Bệnh nhân mang phiếu này đến Y tá đóng mộc BHYT, sau đó đến Thu ngân thanh toán.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalRecords;