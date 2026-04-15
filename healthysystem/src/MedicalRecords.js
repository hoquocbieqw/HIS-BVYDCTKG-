import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const MedicalRecords = () => {
    const [pendingPatients, setPendingPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [icdSearch, setIcdSearch] = useState('');
    const [icdOpen, setIcdOpen] = useState(false);
    const [savedRecordId, setSavedRecordId] = useState(null);
    const [activeTab, setActiveTab] = useState('emr'); // 'emr' | 'prescription'
    const [prescriptionList, setPrescriptionList] = useState([]);
    const [prescSaved, setPrescSaved] = useState(false);
    const icdRef = useRef(null);

    const [recordData, setRecordData] = useState({
        Diagnosis: '',
        ICD10: '',
        TreatmentPlan: '',
        Notes: '',
        yhctServices: []
    });

    const icd10List = [
        { code: 'M54.2', name: 'Đau cổ (Cervicalgia)' },
        { code: 'M54.5', name: 'Đau lưng vùng thấp (Low back pain)' },
        { code: 'M54.4', name: 'Đau thắt lưng kèm đau thần kinh tọa' },
        { code: 'M47.2', name: 'Thoái hóa cột sống cổ có bệnh lý rễ thần kinh' },
        { code: 'M51.1', name: 'Thoát vị đĩa đệm thắt lưng' },
        { code: 'M79.3', name: 'Hội chứng đau cơ (Panniculitis)' },
        { code: 'M15',   name: 'Thoái hóa đa khớp' },
        { code: 'M25.5', name: 'Đau khớp' },
        { code: 'G51.0', name: 'Liệt Bell - Liệt dây TK VII ngoại biên' },
        { code: 'I10',   name: 'Tăng huyết áp nguyên phát' },
        { code: 'E11',   name: 'Đái tháo đường type 2' },
        { code: 'J00',   name: 'Viêm mũi họng cấp (cảm lạnh thông thường)' },
        { code: 'R51',   name: 'Đau đầu' },
        { code: 'G43',   name: 'Đau nửa đầu (Migraine)' },
        { code: 'F41.1', name: 'Rối loạn lo âu lan tỏa' },
    ];

    const availableServices = [
        'Châm cứu', 'Điện châm', 'Xoa bóp bấm huyệt',
        'Kéo giãn cột sống cổ', 'Kéo giãn cột sống thắt lưng',
        'Cứu ngải', 'Chiếu đèn hồng ngoại', 'Cấy chỉ'
    ];

    const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        fetchPendingPatients();
        fetchMedicines();
        // Đóng dropdown ICD khi click ngoài
        const handleClick = (e) => { if (icdRef.current && !icdRef.current.contains(e.target)) setIcdOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchPendingPatients = async () => {
        try {
            const res = await axios.get(`${API}/api/appointments/pending`, getAuthHeader());
            setPendingPatients(res.data);
        } catch (err) {
            console.error("Lỗi tải danh sách bệnh nhân:", err.message);
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${API}/api/medicines`, getAuthHeader());
            setMedicines(res.data);
        } catch (err) {
            console.error("Lỗi tải danh sách thuốc:", err.message);
        }
    };

    const handleSelectPatient = (p) => {
        setSelectedPatient(p);
        setSavedRecordId(null);
        setPrescSaved(false);
        setActiveTab('emr');
        setRecordData({ Diagnosis: '', ICD10: '', TreatmentPlan: '', Notes: '', yhctServices: [] });
        setIcdSearch('');
        setPrescriptionList([]);
    };

    const filteredICD = icd10List.filter(i =>
        i.name.toLowerCase().includes(icdSearch.toLowerCase()) || i.code.includes(icdSearch.toUpperCase())
    );

    const handleSelectICD = (icd) => {
        setRecordData({ ...recordData, ICD10: icd.code, Diagnosis: icd.name });
        setIcdSearch(`${icd.code} - ${icd.name}`);
        setIcdOpen(false);
    };

    const handleToggleService = (srv) => {
        const list = recordData.yhctServices;
        setRecordData({
            ...recordData,
            yhctServices: list.includes(srv) ? list.filter(s => s !== srv) : [...list, srv]
        });
    };

    const handleSignAndSave = async (e) => {
        e.preventDefault();
        if (!recordData.ICD10) return alert("Bắt buộc phải chọn mã ICD-10 để thanh toán BHYT!");
        if (!window.confirm("XÁC NHẬN KÝ SỐ:\nBạn chịu trách nhiệm pháp lý với Y lệnh này. Xác nhận khóa hồ sơ?")) return;

        const treatmentFull = recordData.TreatmentPlan +
            (recordData.yhctServices.length > 0 ? `\n[Chỉ định YHCT: ${recordData.yhctServices.join(', ')}]` : '');

        try {
            const res = await axios.post(`${API}/api/medical-records`, {
                AppointmentID: selectedPatient.AppointmentID,
                Diagnosis: recordData.Diagnosis,
                ICD10: recordData.ICD10,
                TreatmentPlan: treatmentFull,
                Notes: recordData.Notes
            }, getAuthHeader());

            setSavedRecordId(res.data.recordId);
            setActiveTab('prescription'); // tự chuyển sang tab kê đơn
            fetchPendingPatients();
        } catch (err) {
            alert("Lỗi lưu hồ sơ: " + (err.response?.data?.message || err.message));
        }
    };

    // --- KÊ ĐƠN THUỐC ---
    const handleAddPrescItem = () => {
        setPrescriptionList([...prescriptionList, { medicineId: '', medicineName: '', quantity: 1, dosage: '', unit: '' }]);
    };

    const handlePrescChange = (idx, field, value) => {
        const updated = [...prescriptionList];
        if (field === 'medicineId') {
            const med = medicines.find(m => String(m.MedicineID) === String(value));
            updated[idx] = { ...updated[idx], medicineId: value, medicineName: med?.MedicineName || '', unit: med?.Unit || '' };
        } else {
            updated[idx] = { ...updated[idx], [field]: value };
        }
        setPrescriptionList(updated);
    };

    const handleRemovePrescItem = (idx) => {
        setPrescriptionList(prescriptionList.filter((_, i) => i !== idx));
    };

    const handleSavePrescription = async () => {
        if (!savedRecordId) return alert("Vui lòng ký số bệnh án trước khi kê đơn!");
        if (prescriptionList.length === 0) return alert("Chưa có thuốc nào trong đơn.");
        const invalid = prescriptionList.find(p => !p.medicineId || !p.dosage || p.quantity < 1);
        if (invalid) return alert("Vui lòng điền đầy đủ thông tin thuốc (loại, liều dùng, số lượng).");

        try {
            await axios.post(`${API}/api/prescriptions`, {
                recordId: savedRecordId,
                prescriptionList: prescriptionList.map(p => ({
                    medicineId: p.medicineId,
                    quantity: Number(p.quantity),
                    dosage: p.dosage
                }))
            }, getAuthHeader());
            setPrescSaved(true);
            alert(`Kê đơn thành công! Mã bệnh án: #${savedRecordId}\nChuyển sang Thu ngân để thanh toán.`);
        } catch (err) {
            alert("Lỗi kê đơn: " + (err.response?.data?.message || err.message));
        }
    };

    const styles = {
        container: { padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', fontFamily: 'Arial, sans-serif' },
        panel: { backgroundColor: '#fff', border: '1px solid #bdc3c7', padding: '15px' },
        h3: { marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #2980b9', paddingBottom: '10px' },
        patientItem: (selected) => ({
            padding: '12px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer',
            backgroundColor: selected ? '#e8f4f8' : 'transparent',
            borderLeft: selected ? '4px solid #2980b9' : '4px solid transparent'
        }),
        tab: (active) => ({
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
            backgroundColor: active ? '#2980b9' : '#ecf0f1',
            color: active ? '#fff' : '#555',
            borderRadius: '4px 4px 0 0'
        }),
        input: { width: '100%', padding: '9px', border: '1px solid #bdc3c7', marginTop: '5px', boxSizing: 'border-box' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '3px' },
        btnRed: { backgroundColor: '#c0392b', color: 'white', padding: '11px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
        btnBlue: { backgroundColor: '#2980b9', color: 'white', padding: '11px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
        btnGreen: { backgroundColor: '#27ae60', color: 'white', padding: '11px 20px', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
        btnGray: { backgroundColor: '#95a5a6', color: 'white', padding: '8px 14px', border: 'none', cursor: 'pointer' },
    };

    return (
        <div style={styles.container}>
            {/* CỘT 1: HÀNG ĐỢI */}
            <div style={{ ...styles.panel, width: '320px', flexShrink: 0 }}>
                <h3 style={styles.h3}>HÀNG ĐỢI LÂM SÀNG</h3>
                {pendingPatients.length === 0 && <p style={{ color: '#7f8c8d' }}>Không có bệnh nhân chờ.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {pendingPatients.map(p => (
                        <li key={p.AppointmentID}
                            style={styles.patientItem(selectedPatient?.AppointmentID === p.AppointmentID)}
                            onClick={() => handleSelectPatient(p)}
                        >
                            <div style={{ fontWeight: 'bold' }}>{p.PatientName}</div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '3px' }}>Khoa: {p.Department}</div>
                            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Lý do: {p.Reason}</div>
                            {p.InsuranceType && p.InsuranceType !== 'None' && (
                                <span style={{ fontSize: '11px', backgroundColor: '#27ae60', color: '#fff', padding: '1px 6px', borderRadius: '3px' }}>
                                    BHYT {p.InsuranceType}{p.TransferTicket ? ' - Đúng tuyến' : ''}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* CỘT 2: EMR + KÊ ĐƠN */}
            <div style={{ ...styles.panel, flex: 1 }}>
                {!selectedPatient ? (
                    <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '60px 0', fontSize: '15px' }}>
                        Vui lòng chọn bệnh nhân từ hàng đợi lâm sàng.
                    </div>
                ) : (
                    <>
                        {/* Thông tin bệnh nhân */}
                        <div style={{ backgroundColor: '#f4f6f8', padding: '12px', borderLeft: '4px solid #2980b9', marginBottom: '15px' }}>
                            <strong>Đang khám: </strong>
                            <span style={{ color: '#c0392b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '16px' }}>{selectedPatient.PatientName}</span>
                            {savedRecordId && <span style={{ marginLeft: '15px', color: '#27ae60', fontWeight: 'bold' }}>Mã BA: #{savedRecordId}</span>}
                        </div>

                        {/* TABS */}
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '0' }}>
                            <button style={styles.tab(activeTab === 'emr')} onClick={() => setActiveTab('emr')}>1. Bệnh án & Chỉ định</button>
                            <button style={styles.tab(activeTab === 'prescription')} onClick={() => setActiveTab('prescription')}
                                disabled={!savedRecordId}>
                                2. Kê đơn thuốc {prescSaved ? '(Đã lưu)' : ''}
                            </button>
                        </div>

                        {/* TAB 1: EMR */}
                        {activeTab === 'emr' && (
                            <form onSubmit={handleSignAndSave} style={{ border: '1px solid #bdc3c7', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* ICD-10 */}
                                <div ref={icdRef} style={{ position: 'relative' }}>
                                    <label style={styles.label}>Mã bệnh ICD-10 / Chẩn đoán <span style={{ color: '#c0392b' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Gõ tên bệnh hoặc mã ICD (vd: M54, Đau cổ...)"
                                        value={icdSearch}
                                        style={styles.input}
                                        onChange={(e) => {
                                            setIcdSearch(e.target.value);
                                            setIcdOpen(true);
                                            if (e.target.value === '') setRecordData({ ...recordData, ICD10: '', Diagnosis: '' });
                                        }}
                                        onFocus={() => setIcdOpen(true)}
                                        autoComplete="off"
                                    />
                                    {icdOpen && icdSearch && !recordData.ICD10 && filteredICD.length > 0 && (
                                        <ul style={{
                                            position: 'absolute', width: '100%', backgroundColor: '#fff',
                                            border: '1px solid #bdc3c7', maxHeight: '180px', overflowY: 'auto',
                                            listStyle: 'none', padding: 0, margin: 0, zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                        }}>
                                            {filteredICD.map(icd => (
                                                <li key={icd.code}
                                                    onClick={() => handleSelectICD(icd)}
                                                    style={{ padding: '9px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                                >
                                                    <strong style={{ color: '#2980b9' }}>{icd.code}</strong> — {icd.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {recordData.ICD10 && (
                                        <div style={{ marginTop: '5px', padding: '6px 10px', backgroundColor: '#e8f4f8', fontSize: '13px', color: '#2980b9', fontWeight: 'bold' }}>
                                            Đã chọn: {recordData.ICD10} — {recordData.Diagnosis}
                                            <button type="button" onClick={() => { setRecordData({ ...recordData, ICD10: '', Diagnosis: '' }); setIcdSearch(''); }}
                                                style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontWeight: 'bold' }}>Xóa</button>
                                        </div>
                                    )}
                                </div>

                                {/* Chỉ định YHCT */}
                                <div>
                                    <label style={styles.label}>Chỉ định kỹ thuật YHCT</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f9f9f9', padding: '12px', border: '1px solid #ecf0f1' }}>
                                        {availableServices.map(srv => (
                                            <label key={srv} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                                <input type="checkbox"
                                                    checked={recordData.yhctServices.includes(srv)}
                                                    onChange={() => handleToggleService(srv)} />
                                                {srv}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Kế hoạch điều trị */}
                                <div>
                                    <label style={styles.label}>Kế hoạch điều trị / Lời dặn Bác sĩ <span style={{ color: '#c0392b' }}>*</span></label>
                                    <textarea required value={recordData.TreatmentPlan}
                                        onChange={e => setRecordData({ ...recordData, TreatmentPlan: e.target.value })}
                                        placeholder="Ghi kế hoạch điều trị, lời dặn dò..."
                                        style={{ ...styles.input, height: '80px', resize: 'vertical' }} />
                                </div>

                                {/* Ghi chú */}
                                <div>
                                    <label style={styles.label}>Ghi chú thêm</label>
                                    <textarea value={recordData.Notes}
                                        onChange={e => setRecordData({ ...recordData, Notes: e.target.value })}
                                        placeholder="Dị ứng thuốc, ghi chú đặc biệt..."
                                        style={{ ...styles.input, height: '60px', resize: 'vertical' }} />
                                </div>

                                {!savedRecordId ? (
                                    <button type="submit" style={{ ...styles.btnRed, padding: '13px' }}>
                                        KÝ SỐ & KHÓA BỆNH ÁN
                                    </button>
                                ) : (
                                    <div style={{ backgroundColor: '#27ae60', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                                        ĐÃ KHÓA BỆNH ÁN #{savedRecordId} — Chuyển sang Tab kê đơn thuốc
                                    </div>
                                )}
                            </form>
                        )}

                        {/* TAB 2: KÊ ĐƠN THUỐC */}
                        {activeTab === 'prescription' && (
                            <div style={{ border: '1px solid #bdc3c7', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <strong>Đơn thuốc Đông y — Mã BA: #{savedRecordId}</strong>
                                    {!prescSaved && (
                                        <button type="button" style={styles.btnBlue} onClick={handleAddPrescItem}>
                                            Thêm vị thuốc
                                        </button>
                                    )}
                                </div>

                                {prescSaved ? (
                                    <div style={{ backgroundColor: '#e8f8ee', padding: '15px', border: '1px solid #27ae60', color: '#155724', fontWeight: 'bold', textAlign: 'center' }}>
                                        Đơn thuốc đã lưu thành công. Bệnh nhân chuyển sang Thu ngân thanh toán.
                                    </div>
                                ) : (
                                    <>
                                        {prescriptionList.length === 0 ? (
                                            <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Chưa có vị thuốc nào. Nhấn "Thêm vị thuốc" hoặc để trống nếu không kê đơn.</p>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f4f6f7' }}>
                                                        <th style={{ padding: '9px', textAlign: 'left', border: '1px solid #ddd' }}>Vị thuốc</th>
                                                        <th style={{ padding: '9px', textAlign: 'center', border: '1px solid #ddd' }}>SL</th>
                                                        <th style={{ padding: '9px', textAlign: 'center', border: '1px solid #ddd' }}>ĐVT</th>
                                                        <th style={{ padding: '9px', textAlign: 'left', border: '1px solid #ddd' }}>Cách dùng</th>
                                                        <th style={{ padding: '9px', border: '1px solid #ddd' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {prescriptionList.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                                <select value={item.medicineId}
                                                                    onChange={e => handlePrescChange(idx, 'medicineId', e.target.value)}
                                                                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc' }}>
                                                                    <option value="">-- Chọn thuốc --</option>
                                                                    {medicines.map(m => (
                                                                        <option key={m.MedicineID} value={m.MedicineID}>
                                                                            {m.MedicineName} (còn {m.StockQuantity} {m.Unit})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                                <input type="number" min="1" value={item.quantity}
                                                                    onChange={e => handlePrescChange(idx, 'quantity', e.target.value)}
                                                                    style={{ width: '70px', padding: '6px', border: '1px solid #ccc', textAlign: 'center' }} />
                                                            </td>
                                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', color: '#666' }}>{item.unit}</td>
                                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                                <input type="text" value={item.dosage}
                                                                    placeholder="vd: Ngày 2 lần sáng tối"
                                                                    onChange={e => handlePrescChange(idx, 'dosage', e.target.value)}
                                                                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc' }} />
                                                            </td>
                                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                                <button type="button" style={styles.btnGray} onClick={() => handleRemovePrescItem(idx)}>Xóa</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                            <button type="button" style={styles.btnGreen} onClick={handleSavePrescription}>
                                                LƯU ĐƠN THUỐC & CHUYỂN THU NGÂN
                                            </button>
                                            <button type="button" style={{ ...styles.btnBlue }}
                                                onClick={() => { setPrescSaved(true); alert("Không kê đơn thuốc. Bệnh nhân chuyển sang Thu ngân thanh toán viện phí."); }}>
                                                KHÔNG KÊ ĐƠN
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MedicalRecords;