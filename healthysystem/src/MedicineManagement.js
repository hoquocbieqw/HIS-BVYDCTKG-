import React, { useState, useEffect } from 'react';
import axios from 'axios';

const formatDateTime = (dateString) => new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

const MedicineManagement = () => {
    // State quản lý danh mục thuốc
    const [medicines, setMedicines] = useState([]);
    const [medSearchTerm, setMedSearchTerm] = useState('');
    
    // State quản lý form Thêm/Sửa thuốc
    const [medFormData, setMedFormData] = useState({ MedicineName: '', Unit: 'Viên', StockQuantity: 0, Price: 0, Description: '' });
    const [isEditingMed, setIsEditingMed] = useState(false);
    const [selectedMedId, setSelectedMedId] = useState(null);

    // State quản lý Lịch sử đơn thuốc
    const [prescriptions, setPrescriptions] = useState([]);
    const [prescSearchTerm, setPrescSearchTerm] = useState('');
    const [selectedPrescription, setSelectedPrescription] = useState(null); // Để hiển thị chi tiết đơn thuốc

    useEffect(() => {
        fetchMedicines();
        fetchPrescriptions();
    }, []);

    // -----------------------------------------------------
    // PHẦN 1: QUẢN LÝ DANH MỤC THUỐC (THÊM, SỬA, XÓA, XEM)
    // -----------------------------------------------------
    const fetchMedicines = async () => {
        try {
            const token = localStorage.getItem('token');
            // Gọi API lấy TẤT CẢ thuốc (bao gồm cả loại hết hàng) để quản lý
            const res = await axios.get('http://localhost:3001/api/medicines/all', { headers: { Authorization: `Bearer ${token}` } });
            setMedicines(res.data);
        } catch (err) { console.error("Lỗi lấy danh sách thuốc:", err); }
    };

    const handleEditMedRequest = (med) => {
        setIsEditingMed(true);
        setSelectedMedId(med.MedicineID);
        setMedFormData({
            MedicineName: med.MedicineName,
            Unit: med.Unit,
            StockQuantity: med.StockQuantity,
            Price: med.Price,
            Description: med.Description || ''
        });
    };

    const handleCancelEditMed = () => {
        setIsEditingMed(false);
        setSelectedMedId(null);
        setMedFormData({ MedicineName: '', Unit: 'Viên', StockQuantity: 0, Price: 0, Description: '' });
    };

    const handleSaveMedicine = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            if (isEditingMed) {
                // Gọi API Cập nhật thuốc
                await axios.put(`http://localhost:3001/api/medicines/${selectedMedId}`, medFormData, config);
                alert("Cập nhật thông tin thuốc thành công!");
            } else {
                // Gọi API Thêm thuốc mới (Nhập kho)
                await axios.post('http://localhost:3001/api/medicines', medFormData, config);
                alert("Nhập loại thuốc mới vào kho thành công!");
            }
            handleCancelEditMed();
            fetchMedicines();
        } catch (err) {
            alert("Lỗi xử lý kho thuốc: " + (err.response?.data?.message || "Lỗi Server"));
        }
    };

    const handleDeleteMedicine = async (id) => {
        if (window.confirm("CẢNH BÁO: Việc xóa loại thuốc này có thể ảnh hưởng đến các đơn thuốc cũ. Bạn có chắc chắn muốn xóa?")) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:3001/api/medicines/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                fetchMedicines();
                alert("Đã xóa thuốc khỏi danh mục!");
            } catch (err) { alert("Không thể xóa loại thuốc này do đã được sử dụng trong đơn thuốc."); }
        }
    };

    const filteredMedicines = medicines.filter(m => 
        m.MedicineName.toLowerCase().includes(medSearchTerm.toLowerCase())
    );

    // -----------------------------------------------------
    // PHẦN 2: XEM VÀ TÌM KIẾM LỊCH SỬ ĐƠN THUỐC
    // -----------------------------------------------------
    const fetchPrescriptions = async () => {
        try {
            const token = localStorage.getItem('token');
            // Gọi API lấy lịch sử các đơn thuốc đã kê
            const res = await axios.get('http://localhost:3001/api/prescriptions/history', { headers: { Authorization: `Bearer ${token}` } });
            setPrescriptions(res.data);
        } catch (err) { console.error("Lỗi lấy lịch sử đơn thuốc:", err); }
    };

    const handleViewPrescriptionDetails = async (recordId) => {
        try {
            const token = localStorage.getItem('token');
            // Gọi API lấy chi tiết các loại thuốc trong 1 đơn thuốc cụ thể
            const res = await axios.get(`http://localhost:3001/api/prescriptions/details/${recordId}`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Tìm thông tin chung của đơn thuốc từ danh sách hiện tại
            const prescInfo = prescriptions.find(p => p.RecordID === recordId);
            setSelectedPrescription({ ...prescInfo, details: res.data });
            
        } catch (err) { alert("Không thể tải chi tiết đơn thuốc!"); }
    };

    const filteredPrescriptions = prescriptions.filter(p => {
        const pName = p.PatientName || '';
        const diag = p.Diagnosis || '';
        const term = prescSearchTerm || '';
        return pName.toLowerCase().includes(term.toLowerCase()) || 
               diag.toLowerCase().includes(term.toLowerCase());
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', margin: 0, fontWeight: '800' }}>
                Quản Lý Kho Thuốc & Lịch Sử Kê Đơn
            </h2>

            {/* KHU VỰC 1: QUẢN LÝ DANH MỤC THUỐC */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                
                {/* Form Nhập/Sửa Thuốc */}
                <div style={{ flex: '1 1 350px', backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#e67e22', borderBottom: '2px solid #fde0c5', paddingBottom: '10px', marginTop: 0 }}>
                        {isEditingMed ? "✏️ CẬP NHẬT THÔNG TIN THUỐC" : "📦 NHẬP LOẠI THUỐC MỚI"}
                    </h3>
                    
                    <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Tên thuốc:</label>
                            <input type="text" placeholder="Nhập tên thuốc..." value={medFormData.MedicineName} onChange={e => setMedFormData({...medFormData, MedicineName: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Đơn vị tính:</label>
                                <select value={medFormData.Unit} onChange={e => setMedFormData({...medFormData, Unit: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}>
                                    <option value="Viên">Viên</option>
                                    <option value="Chai">Chai</option>
                                    <option value="Gói">Gói</option>
                                    <option value="Tuýp">Tuýp</option>
                                    <option value="Hộp">Hộp</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Số lượng tồn:</label>
                                <input type="number" min="0" value={medFormData.StockQuantity} onChange={e => setMedFormData({...medFormData, StockQuantity: parseInt(e.target.value) || 0})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Đơn giá (VNĐ):</label>
                            <input type="number" min="0" step="100" value={medFormData.Price} onChange={e => setMedFormData({...medFormData, Price: parseFloat(e.target.value) || 0})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        <div>
                            <label style={{ fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Công dụng / Ghi chú:</label>
                            <textarea placeholder="Nhập ghi chú hoặc công dụng của thuốc..." value={medFormData.Description} onChange={e => setMedFormData({...medFormData, Description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '80px', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            {isEditingMed && (
                                <button type="button" onClick={handleCancelEditMed} style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>HỦY</button>
                            )}
                            <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {isEditingMed ? "CẬP NHẬT THUỐC" : "THÊM VÀO KHO"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Danh sách Thuốc trong kho */}
                <div style={{ flex: '2 1 500px', backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxHeight: '550px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                        <h3 style={{ color: '#0984e3', margin: 0 }}>📊 DANH MỤC THUỐC TRONG KHO</h3>
                        <input type="text" placeholder="Tìm kiếm tên thuốc..." value={medSearchTerm} onChange={(e) => setMedSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '200px' }} />
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Mã</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Tên thuốc</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Tồn kho</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Đơn giá</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMedicines.length > 0 ? filteredMedicines.map((m, index) => (
                                <tr key={m.MedicineID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td style={{ padding: '12px', color: '#64748b' }}>#{m.MedicineID}</td>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                                        {m.MedicineName}
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', fontStyle: 'italic', marginTop: '2px' }}>{m.Description}</div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: m.StockQuantity <= 50 ? '#ef4444' : '#10b981' }}>
                                            {m.StockQuantity} {m.Unit}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#e67e22', fontWeight: 'bold' }}>
                                        {m.Price.toLocaleString('vi-VN')} đ
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button onClick={() => handleEditMedRequest(m)} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '5px' }}>Sửa</button>
                                        <button onClick={() => handleDeleteMedicine(m.MedicineID)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xóa</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Không tìm thấy loại thuốc nào.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* KHU VỰC 2: TRA CỨU LỊCH SỬ ĐƠN THUỐC */}
            <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#0984e3', margin: 0 }}>🗂️ TRA CỨU LỊCH SỬ KÊ ĐƠN</h3>
                    <input type="text" placeholder="Tìm tên bệnh nhân, chẩn đoán..." value={prescSearchTerm} onChange={(e) => setPrescSearchTerm(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '300px' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Bảng danh sách bệnh án đã được kê đơn */}
                    <div style={{ flex: '1 1 500px', overflowX: 'auto', borderRight: '1px solid #e2e8f0', paddingRight: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Ngày khám</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Bệnh nhân</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Chẩn đoán</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Đơn thuốc</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPrescriptions.length > 0 ? filteredPrescriptions.map((p, index) => (
                                    <tr key={p.RecordID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: selectedPrescription?.RecordID === p.RecordID ? '#dbeafe' : (index % 2 === 0 ? '#ffffff' : '#f8fafc'), cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => handleViewPrescriptionDetails(p.RecordID)}>
                                        <td style={{ padding: '12px', color: '#b91c1c', fontWeight: '600' }}>{formatDateTime(p.AppointmentDate)}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{p.PatientName}</td>
                                        <td style={{ padding: '12px', color: '#475569' }}>{p.Diagnosis}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button style={{ backgroundColor: '#0984e3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xem chi tiết ➡️</button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có dữ liệu lịch sử đơn thuốc.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Vùng hiển thị chi tiết đơn thuốc khi click vào */}
                    <div style={{ flex: '1 1 350px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        {selectedPrescription ? (
                            <div>
                                <h4 style={{ margin: '0 0 15px 0', color: '#1e293b', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px' }}>
                                    Chi tiết đơn thuốc của: <span style={{ color: '#0984e3' }}>{selectedPrescription.PatientName}</span>
                                </h4>
                                <div style={{ marginBottom: '15px', fontSize: '14px', color: '#475569' }}>
                                    <div><strong>Ngày khám:</strong> {formatDateTime(selectedPrescription.AppointmentDate)}</div>
                                    <div><strong>Chẩn đoán:</strong> {selectedPrescription.Diagnosis}</div>
                                </div>
                                
                                <strong style={{ color: '#1e293b' }}>Danh sách thuốc:</strong>
                                <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#1e293b' }}>
                                    {selectedPrescription.details && selectedPrescription.details.length > 0 ? (
                                        selectedPrescription.details.map((detail, idx) => (
                                            <li key={idx} style={{ marginBottom: '12px', lineHeight: '1.4' }}>
                                                <span style={{ fontWeight: 'bold', color: '#e67e22' }}>{detail.MedicineName}</span> 
                                                <span style={{ fontWeight: 'bold' }}> x {detail.Quantity} {detail.Unit}</span>
                                                <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>Liều dùng: {detail.Dosage}</div>
                                            </li>
                                        ))
                                    ) : (
                                        <li style={{ color: '#94a3b8', fontStyle: 'italic' }}>Bệnh án này không có đơn thuốc.</li>
                                    )}
                                </ul>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                                <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
                                <p>Click vào nút "Xem chi tiết" ở bảng bên trái để xem nội dung đơn thuốc.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MedicineManagement;       