import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [icdSearch, setIcdSearch] = useState('');
    const [savedRecord, setSavedRecord] = useState(null); // Để hiện nút in phiếu

    const [recordData, setRecordData] = useState({
        Diagnosis: '',
        ICD10: '',
        TreatmentPlan: '',
        Notes: '',
        yhctServices: []
    });

    const icd10Dictionary = [
        { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
        { code: 'M54.4', name: 'Đau thắt lưng cùng với đau thần kinh tọa' },
        { code: 'M54.2', name: 'Đau vùng cổ gáy (Cervicalgia)' },
        { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
        { code: 'E11', name: 'Bệnh đái tháo đường không phụ thuộc insulin' },
        { code: 'M15', name: 'Thoái hóa đa khớp' },
        { code: 'M16', name: 'Viêm khớp háng thoái hóa (Coxarthrosis)' },
        { code: 'M17', name: 'Viêm khớp gối thoái hóa (Gonarthrosis)' },
        { code: 'G51.0', name: 'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)' },
        { code: 'G54.2', name: 'Tổn thương rễ thần kinh cổ' },
        { code: 'R51', name: 'Đau đầu' },
        { code: 'M79.3', name: 'Đau gân cơ (Panniculitis)' },
    ];

    const availableServices = [
        'Châm cứu', 'Xoa bóp bấm huyệt', 'Kéo giãn cột sống',
        'Điện châm', 'Cứu ngải', 'Chiếu đèn hồng ngoại', 'Cấy chỉ'
    ];

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchPendingPatients(); }, []);

    const fetchPendingPatients = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, getAuthHeader());
            setPendingPatients(res.data);
        } catch (err) {
            console.error("Lỗi tải hàng đợi:", err.message);
        }
    };

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(icd.code + ' - ' + icd.name);
    };

    const handleToggleService = (service) => {
        const curr = recordData.yhctServices;
        setRecordData({
            ...recordData,
            yhctServices: curr.includes(service) ? curr.filter(s => s !== service) : [...curr, service]
        });
    };

    const handleSignAndSave = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert("Hệ thống yêu cầu bắt buộc phải có mã ICD-10 để thanh toán BHYT!");
        const confirmSign = window.confirm("XÁC NHẬN CHỮ KÝ SỐ:\nBạn chịu trách nhiệm pháp lý với Y lệnh này. Xác nhận khóa hồ sơ?");
        if (!confirmSign) return;

        const treatmentNote = recordData.TreatmentPlan + (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : '');

        try {
            const res = await axios.post(`${API}/api/medical-records`, {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: treatmentNote,
                Notes: recordData.Notes
            }, getAuthHeader());

            // Lưu thông tin để in phiếu
            setSavedRecord({
                recordId: res.data.recordId,
                patientName: selectedPatient.PatientName,
                diagnosis: recordData.Diagnosis,
                icd10: recordData.ICD10,
                treatmentPlan: treatmentNote,
                notes: recordData.Notes,
                yhctServices: recordData.yhctServices,
                department: selectedPatient.Department,
                appointmentDate: new Date().toLocaleString('vi-VN'),
                insuranceType: selectedPatient.InsuranceType,
            });

            // Reset form
            setSelectedPatient(null);
            setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
            setIcdSearch('');
            fetchPendingPatients();
        } catch (err) {
            alert("Lỗi lưu hồ sơ: " + (err.response?.data?.message || err.message));
        }
    };

    // IN PHIẾU KHÁM - Chỉ in phiếu, không in toàn trang web
    const handlePrintRecord = () => {
        if (!savedRecord) return;
        const printContent = `
            <html>
            <head>
                <title>Phiếu Khám Bệnh</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
                    .header h1 { margin: 5px 0; font-size: 20px; color: #0a4f8a; }
                    .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-transform: uppercase; }
                    .row { display: flex; margin-bottom: 10px; }
                    .label { width: 180px; font-weight: bold; color: #333; }
                    .value { flex: 1; }
                    .section { margin-top: 15px; border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
                    .section-title { font-weight: bold; color: #0a4f8a; margin-bottom: 8px; }
                    .footer { margin-top: 30px; display: flex; justify-content: space-between; }
                    .sign-box { text-align: center; width: 200px; }
                    .sign-box p { margin: 0; font-size: 13px; color: #555; }
                    .sign-area { height: 60px; border-bottom: 1px solid #333; margin-top: 40px; }
                    .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 10px; font-weight: bold; font-size: 13px; }
                    @media print { body { padding: 15px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Bệnh viện Y Dược Cổ truyền Kiên Giang</h2>
                    <h1>PHIẾU KHÁM BỆNH</h1>
                    <p>Mã hồ sơ: <strong>BA-${savedRecord.recordId}</strong> &nbsp;|&nbsp; Ngày: ${savedRecord.appointmentDate}</p>
                </div>

                <div class="row"><span class="label">Họ và tên BN:</span><span class="value"><strong>${savedRecord.patientName}</strong></span></div>
                <div class="row"><span class="label">Khoa khám:</span><span class="value">${savedRecord.department || 'YHCT'}</span></div>
                <div class="row"><span class="label">BHYT:</span><span class="value">${savedRecord.insuranceType !== 'None' ? `<span class="badge">${savedRecord.insuranceType}</span>` : 'Tự trả'}</span></div>

                <div class="section">
                    <div class="section-title">CHẨN ĐOÁN</div>
                    <div class="row"><span class="label">Mã ICD-10:</span><span class="value"><strong>${savedRecord.icd10}</strong></span></div>
                    <div class="row"><span class="label">Chẩn đoán:</span><span class="value">${savedRecord.diagnosis}</span></div>
                </div>

                ${savedRecord.yhctServices.length > 0 ? `
                <div class="section">
                    <div class="section-title">CHỈ ĐỊNH KỸ THUẬT YHCT</div>
                    <div>${savedRecord.yhctServices.map(s => `- ${s}`).join('<br/>')}</div>
                </div>` : ''}

                <div class="section">
                    <div class="section-title">KẾ HOẠCH ĐIỀU TRỊ</div>
                    <div>${savedRecord.treatmentPlan ? savedRecord.treatmentPlan.replace(/\n/g, '<br/>') : 'Chưa ghi'}</div>
                </div>

                ${savedRecord.notes ? `
                <div class="section">
                    <div class="section-title">GHI CHÚ CỦA BÁC SĨ</div>
                    <div>${savedRecord.notes}</div>
                </div>` : ''}

                <div class="footer">
                    <div class="sign-box">
                        <p>Xác nhận BHYT (Y tá)</p>
                        <div class="sign-area"></div>
                        <p>Ký tên, đóng dấu</p>
                    </div>
                    <div class="sign-box">
                        <p>Bác sĩ điều trị (Chữ ký số)</p>
                        <div class="sign-area"></div>
                        <p><strong>ĐÃ KÝ SỐ</strong></p>
                    </div>
                </div>

                <p style="text-align:center; margin-top:20px; font-size:12px; color:#888;">
                    Bệnh nhân giữ phiếu này để đến Y tá đóng mộc BHYT, sau đó đến Thu ngân thanh toán.
                </p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
            {/* CỘT 1: HÀNG ĐỢI LÂM SÀNG */}
            <div style={{ width: '340px', backgroundColor: '#fff', border: '1px solid #bdc3c7', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#2980b9', color: '#fff', padding: '14px 16px', fontWeight: 'bold', fontSize: '14px' }}>
                    HÀNG ĐỢI LÂM SÀNG ({pendingPatients.length})
                </div>
                <div style={{ padding: '10px' }}>
                    <button onClick={fetchPendingPatients} style={{ width: '100%', padding: '8px', border: '1px solid #2980b9', borderRadius: '4px', cursor: 'pointer', color: '#2980b9', fontWeight: 'bold', background: '#fff', fontSize: '13px' }}>
                        Làm mới danh sách
                    </button>
                </div>
                {pendingPatients.length === 0 ? (
                    <p style={{ color: '#7f8c8d', padding: '15px', textAlign: 'center', fontSize: '13px' }}>Không có bệnh nhân chờ khám.<br/>Lễ tân/Y tá cần duyệt bệnh nhân trước.</p>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '500px', overflowY: 'auto' }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID}
                            style={{
                                padding: '12px 15px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
                                backgroundColor: selectedPatient?.AppointmentID === p.AppointmentID ? '#e8f4f8' : 'transparent',
                                borderLeft: selectedPatient?.AppointmentID === p.AppointmentID ? '4px solid #2980b9' : '4px solid transparent'
                            }}
                            onClick={() => { setSelectedPatient(p); setSavedRecord(null); }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{p.PatientName}</div>
                                <span style={{ backgroundColor: '#2980b9', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                                    #{p.QueueNumber || '-'}
                                </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>Lý do: {p.Reason}</div>
                            <div style={{ fontSize: '12px', color: '#3498db', marginTop: '2px' }}>{p.Department}</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: BỆNH ÁN ĐIỆN TỬ */}
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #bdc3c7', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '10px' }}>
                    HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR)
                </h3>

                {/* Hiện nút in phiếu sau khi lưu thành công */}
                {savedRecord && !selectedPatient && (
                    <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                        <div style={{ color: '#155724', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>
                            Đã ký số & khóa hồ sơ thành công! (Mã BA: {savedRecord.recordId})
                        </div>
                        <p style={{ color: '#155724', margin: '0 0 15px 0', fontSize: '14px' }}>
                            Hãy in phiếu khám để bệnh nhân mang đến Y tá đóng mộc BHYT, rồi ra Thu ngân thanh toán.
                        </p>
                        <button onClick={handlePrintRecord} style={{ padding: '12px 30px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginRight: '10px' }}>
                            In Phiếu Khám
                        </button>
                        <button onClick={() => setSavedRecord(null)} style={{ padding: '12px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                            Đóng
                        </button>
                    </div>
                )}

                {!selectedPatient && !savedRecord ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px 0', fontSize: '15px' }}>
                        Vui lòng chọn bệnh nhân từ hàng đợi lâm sàng để tiến hành khám.
                    </div>
                ) : selectedPatient ? (
                    <form onSubmit={handleSignAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ backgroundColor: '#f0f8ff', padding: '14px', border: '1px solid #2980b9', borderRadius: '6px' }}>
                            <div>Đang khám: <span style={{ color: '#c0392b', fontSize: '17px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedPatient.PatientName}</span></div>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                                Số TT: #{selectedPatient.QueueNumber || '-'} | Khoa: {selectedPatient.Department} | BHYT: {selectedPatient.InsuranceType !== 'None' ? selectedPatient.InsuranceType : 'Tự trả'}
                            </div>
                        </div>

                        {/* MÃ ICD-10 */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mã bệnh quốc tế ICD-10 / Chẩn đoán: <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                placeholder="Gõ tên bệnh hoặc mã ICD (VD: Đau lưng, M54...)"
                                value={icdSearch}
                                onChange={(e) => {
                                    setIcdSearch(e.target.value);
                                    if (e.target.value === '') setRecordData({ ...recordData, ICD10: '', Diagnosis: '' });
                                }}
                                style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box' }}
                            />
                            {icdSearch && !recordData.ICD10 && (
                                <ul style={{ position: 'absolute', width: '100%', backgroundColor: '#fff', border: '1px solid #bdc3c7', maxHeight: '160px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0, zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                    {icd10Dictionary.filter(i => i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.toUpperCase().includes(icdSearch.toUpperCase())).map(icd => (
                                        <li key={icd.code} onClick={() => handleSelectICD(icd)}
                                            style={{ padding: '9px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e8f4f8'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}>
                                            <strong>{icd.code}</strong> - {icd.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {recordData.ICD10 && (
                                <div style={{ marginTop: '6px', padding: '6px 12px', backgroundColor: '#e8f4f8', borderRadius: '4px', fontSize: '13px', color: '#2980b9' }}>
                                    Đã chọn: <strong>{recordData.ICD10}</strong> - {recordData.Diagnosis}
                                </div>
                            )}
                        </div>

                        {/* DỊCH VỤ YHCT */}
                        <div>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Chỉ định Kỹ thuật / Liệu trình YHCT:</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f4f6f7', padding: '14px', border: '1px solid #ecf0f1', borderRadius: '6px' }}>
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
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Kế hoạch điều trị / Lời dặn: <span style={{ color: 'red' }}>*</span></label>
                            <textarea required value={recordData.TreatmentPlan} onChange={e => setRecordData({ ...recordData, TreatmentPlan: e.target.value })}
                                style={{ width: '100%', height: '80px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
                        </div>

                        {/* GHI CHÚ */}
                        <div>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Ghi chú thêm:</label>
                            <textarea value={recordData.Notes} onChange={e => setRecordData({ ...recordData, Notes: e.target.value })}
                                style={{ width: '100%', height: '60px', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
                            <button type="button" onClick={() => { setSelectedPatient(null); setSavedRecord(null); }}
                                style={{ flex: 1, backgroundColor: '#95a5a6', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Hủy
                            </button>
                            <button type="submit"
                                style={{ flex: 2, backgroundColor: '#c0392b', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                KÝ SỐ & KHÓA BỆNH ÁN
                            </button>
                        </div>
                    </form>
                ) : null}
            </div>
        </div>
    );
};

export default MedicalRecords;