import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PatientList = () => {
    const [patients, setPatients] = useState([]);
    const [formData, setFormData] = useState({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '' });
    const [editingId, setEditingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // LẤY QUYỀN HIỆN TẠI TỪ LOCALSTORAGE ĐỂ ẨN HIỆN NÚT
    const role = localStorage.getItem('role');

    const fetchPatients = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const res = await axios.get('http://localhost:3001/api/patients', config);
            setPatients(res.data);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu bệnh nhân:", error);
        }
    }, []);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const dataToSend = { ...formData };
            if (!dataToSend.DOB) dataToSend.DOB = null; 

            if (editingId) {
                await axios.put(`http://localhost:3001/api/patients/${editingId}`, dataToSend, config);
                alert("Cập nhật thành công!");
            } else {
                await axios.post('http://localhost:3001/api/patients', dataToSend, config);
                alert("Thêm mới thành công!");
            }
            setShowModal(false);
            setFormData({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '' });
            setEditingId(null);
            fetchPatients();
        } catch (error) { 
            alert("Lỗi xử lý! Vui lòng kiểm tra lại kết nối hoặc dữ liệu nhập."); 
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bệnh nhân này?")) {
            try {
                const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
                await axios.delete(`http://localhost:3001/api/patients/${id}`, config);
                fetchPatients();
            } catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    const startEdit = (p) => {
        setEditingId(p.PatientID);
        setFormData({ ...p, DOB: p.DOB ? p.DOB.split('T')[0] : '' });
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '' });
        setShowModal(true);
    };

    const getMidnightToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

    const filteredPatients = patients.filter(p => {
        const matchName = p.Name && p.Name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchFilter = true;
        if (filterType === 'new') matchFilter = p.CreatedAt ? new Date(p.CreatedAt) >= getMidnightToday() : false;
        else if (filterType === 'old') matchFilter = p.CreatedAt ? new Date(p.CreatedAt) < getMidnightToday() : true;
        return matchName && matchFilter;
    });

    return (
        <div style={{ padding: '10px', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                Quản Lý Thông Tin Bệnh Nhân
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
                <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                    <input type="text" placeholder="Tìm kiếm theo họ và tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', fontSize: '15px' }}>
                        <option value="all">Tất cả bệnh nhân</option>
                        <option value="new">Bệnh nhân mới (Từ 00:00 hôm nay)</option>
                        <option value="old">Bệnh nhân cũ</option>
                    </select>
                </div>
                
                {/* ẨN NÚT THÊM NẾU LÀ ADMIN */}
                {role !== 'Admin' && (
                    <button onClick={openAddModal} style={{ padding: '12px 20px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                        + Thêm Bệnh Nhân
                    </button>
                )}
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                    <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '16px' }}>Họ Tên</th>
                            <th style={{ padding: '16px' }}>Ngày Sinh</th>
                            <th style={{ padding: '16px' }}>Điện thoại</th>
                            <th style={{ padding: '16px' }}>Số BHYT</th>
                            <th style={{ padding: '16px' }}>Địa chỉ</th>
                            <th style={{ padding: '16px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPatients.length > 0 ? filteredPatients.map((p, index) => (
                            <tr key={p.PatientID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '15px', fontWeight: 'bold', color: '#1e293b' }}>{p.Name}</td>
                                <td style={{ padding: '15px', color: '#475569' }}>{p.DOB ? new Date(p.DOB).toLocaleDateString('vi-VN') : ''}</td>
                                <td style={{ padding: '15px', color: '#475569' }}>{p.Phone}</td>
                                <td style={{ padding: '15px', color: '#475569' }}>{p.HealthInsuranceID}</td>
                                <td style={{ padding: '15px', color: '#475569' }}>{p.Address}</td>
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                                    <button onClick={() => {setSelectedPatient(p); setShowDetailModal(true);}} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginRight: '5px' }}>Xem</button>
                                    
                                    {/* ẨN NÚT SỬA/XÓA NẾU LÀ ADMIN */}
                                    {role !== 'Admin' && (
                                        <>
                                            <button onClick={() => startEdit(p)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginRight: '5px' }}>Sửa</button>
                                            <button onClick={() => handleDelete(p.PatientID)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Xóa</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        )) : <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Không tìm thấy bệnh nhân.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal Thêm/Sửa */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            {editingId ? "CẬP NHẬT HỒ SƠ" : "THÊM BỆNH NHÂN MỚI"}
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                            <input placeholder="Họ và tên" value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input type="date" value={formData.DOB} onChange={e => setFormData({...formData, DOB: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Điện thoại" value={formData.Phone} onChange={e => setFormData({...formData, Phone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Số BHYT" value={formData.HealthInsuranceID} onChange={e => setFormData({...formData, HealthInsuranceID: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Người giám hộ (nếu có)" value={formData.Guardian} onChange={e => setFormData({...formData, Guardian: e.target.value})} style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Địa chỉ" value={formData.Address} onChange={e => setFormData({...formData, Address: e.target.value})} style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xem Chi Tiết */}
            {showDetailModal && selectedPatient && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            CHI TIẾT BỆNH NHÂN
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', fontSize: '15px' }}>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Họ và tên:</strong><span style={{ color: '#1e293b', fontWeight: 'bold' }}>{selectedPatient.Name}</span></div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Ngày sinh:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.DOB ? new Date(selectedPatient.DOB).toLocaleDateString('vi-VN') : 'Không có'}</span></div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Số điện thoại:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.Phone || 'Không có'}</span></div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Số BHYT:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.HealthInsuranceID || 'Không có'}</span></div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Người giám hộ:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.Guardian || 'Tự đăng ký'}</span></div>
                            <div style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}><strong style={{ width: '160px', color: '#475569' }}>Địa chỉ:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.Address || 'Không có'}</span></div>
                            
                            <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginTop: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>Thông tin lịch đăng ký gần nhất</h4>
                                <div style={{ display: 'flex', marginBottom: '8px' }}><strong style={{ width: '145px', color: '#475569' }}>Khoa khám:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.Department || 'Chưa rõ'}</span></div>
                                <div style={{ display: 'flex', marginBottom: '8px' }}><strong style={{ width: '145px', color: '#475569' }}>Bác sĩ phụ trách:</strong><span style={{ color: '#1e293b', fontWeight: 'bold' }}>{selectedPatient.DoctorName ? 'Bs. ' + selectedPatient.DoctorName : 'Chưa xếp'}</span></div>
                                <div style={{ display: 'flex', marginBottom: '8px' }}><strong style={{ width: '145px', color: '#475569' }}>Thời gian hẹn:</strong><span style={{ color: '#1e293b' }}>{selectedPatient.AppointmentDate ? new Date(selectedPatient.AppointmentDate).toLocaleString('vi-VN') : 'Chưa rõ'}</span></div>
                                <div style={{ display: 'flex' }}><strong style={{ width: '145px', color: '#475569' }}>Lý do khám:</strong><span style={{ color: '#e74c3c', fontStyle: 'italic', flex: 1 }}>{selectedPatient.Reason || 'Không ghi nhận'}</span></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '12px 30px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientList;