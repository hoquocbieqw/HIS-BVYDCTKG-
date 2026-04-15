import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

const PatientList = () => {
    const [patients, setPatients] = useState([]);
    const [queue, setQueue] = useState([]);
    const [activeTab, setActiveTab] = useState('patients');
    const [formData, setFormData] = useState({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '' });
    const [editingId, setEditingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Lấy role từ user object trong localStorage (đáng tin cậy hơn)
    const userStr = localStorage.getItem('user');
    const role = userStr ? JSON.parse(userStr).role : localStorage.getItem('role');

    const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchPatients = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/patients`, getAuthConfig());
            setPatients(res.data);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu bệnh nhân:", error);
        }
    }, []);

    const fetchQueue = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/queue`, getAuthConfig());
            setQueue(res.data);
        } catch (error) {
            console.error("Lỗi lấy hàng đợi:", error);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
        fetchQueue();
    }, [fetchPatients, fetchQueue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData, DOB: formData.DOB || null };
            if (editingId) {
                await axios.put(`${API}/api/patients/${editingId}`, dataToSend, getAuthConfig());
                alert("Cập nhật thành công!");
            } else {
                await axios.post(`${API}/api/patients`, dataToSend, getAuthConfig());
                alert("Thêm mới thành công!");
            }
            setShowModal(false);
            setFormData({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '' });
            setEditingId(null);
            fetchPatients();
        } catch (error) {
            alert("Lỗi xử lý: " + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bệnh nhân này?")) {
            try {
                await axios.delete(`${API}/api/patients/${id}`, getAuthConfig());
                fetchPatients();
            } catch (error) { alert("Lỗi khi xóa: " + (error.response?.data?.message || error.message)); }
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

    // DUYỆT BỆNH NHÂN vào hàng đợi khám
    const handleApprove = async (appointmentId) => {
        try {
            await axios.put(`${API}/api/appointments/${appointmentId}/approve`, {}, getAuthConfig());
            alert("Đã duyệt! Bệnh nhân vào hàng đợi khám.");
            fetchQueue();
        } catch (err) {
            alert("Lỗi duyệt: " + (err.response?.data?.message || err.message));
        }
    };

    // GỌI SỐ THỨ TỰ
    const handleCallNumber = async (appointmentId, queueNumber, patientName) => {
        try {
            await axios.put(`${API}/api/appointments/${appointmentId}/call`, {}, getAuthConfig());
            alert(`Đang gọi số ${queueNumber} - ${patientName} vào khám!`);
            fetchQueue();
        } catch (err) {
            alert("Lỗi gọi số: " + (err.response?.data?.message || err.message));
        }
    };

    const getMidnightToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

    const filteredPatients = patients.filter(p => {
        const matchName = p.Name && p.Name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchFilter = true;
        if (filterType === 'new') matchFilter = p.CreatedAt ? new Date(p.CreatedAt) >= getMidnightToday() : false;
        else if (filterType === 'old') matchFilter = p.CreatedAt ? new Date(p.CreatedAt) < getMidnightToday() : true;
        return matchName && matchFilter;
    });

    const getStatusBadge = (status) => {
        const map = {
            'Pending': { bg: '#fff3cd', color: '#856404', label: 'Chờ duyệt' },
            'Approved': { bg: '#d1ecf1', color: '#0c5460', label: 'Đã duyệt' },
            'Called': { bg: '#d4edda', color: '#155724', label: 'Đang gọi' },
            'Examined': { bg: '#cce5ff', color: '#004085', label: 'Đã khám' },
            'Paid': { bg: '#d4edda', color: '#155724', label: 'Đã TT' },
        };
        const s = map[status] || { bg: '#e2e8f0', color: '#475569', label: status };
        return <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{s.label}</span>;
    };

    const btnStyle = (bg) => ({
        backgroundColor: bg, color: 'white', border: 'none', padding: '6px 12px',
        borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
        marginRight: '4px', whiteSpace: 'nowrap'
    });

    return (
        <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '20px', fontWeight: '800' }}>
                Quản Lý Thông Tin Bệnh Nhân
            </h2>

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('patients')} style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', background: activeTab === 'patients' ? '#0984e3' : 'transparent', color: activeTab === 'patients' ? 'white' : '#64748b' }}>
                    Hồ sơ bệnh nhân
                </button>
                <button onClick={() => { setActiveTab('queue'); fetchQueue(); }} style={{ padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', background: activeTab === 'queue' ? '#e74c3c' : 'transparent', color: activeTab === 'queue' ? 'white' : '#64748b' }}>
                    Danh sách chờ khám ({queue.filter(q => ['Pending','Approved','Called'].includes(q.Status)).length})
                </button>
            </div>

            {/* TAB HỒ SƠ BỆNH NHÂN */}
            {activeTab === 'patients' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap: '12px' }}>
                        <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                            <input type="text" placeholder="Tìm theo họ và tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', fontSize: '14px' }}>
                                <option value="all">Tất cả</option>
                                <option value="new">Mới hôm nay</option>
                                <option value="old">Bệnh nhân cũ</option>
                            </select>
                        </div>
                        {['Receptionist', 'Admin'].includes(role) && (
                            <button onClick={openAddModal} style={{ padding: '10px 18px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                + Thêm Bệnh Nhân
                            </button>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                            <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '14px' }}>Họ Tên</th>
                                    <th style={{ padding: '14px' }}>Ngày Sinh</th>
                                    <th style={{ padding: '14px' }}>Điện thoại</th>
                                    <th style={{ padding: '14px' }}>Số BHYT</th>
                                    <th style={{ padding: '14px' }}>Địa chỉ</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.length > 0 ? filteredPatients.map((p, index) => (
                                    <tr key={p.PatientID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '13px', fontWeight: 'bold', color: '#1e293b' }}>{p.Name}</td>
                                        <td style={{ padding: '13px', color: '#475569' }}>{p.DOB ? new Date(p.DOB).toLocaleDateString('vi-VN') : ''}</td>
                                        <td style={{ padding: '13px', color: '#475569' }}>{p.Phone}</td>
                                        <td style={{ padding: '13px', color: '#475569' }}>{p.HealthInsuranceID}</td>
                                        <td style={{ padding: '13px', color: '#475569' }}>{p.Address}</td>
                                        <td style={{ padding: '13px', textAlign: 'center' }}>
                                            <button onClick={() => { setSelectedPatient(p); setShowDetailModal(true); }} style={btnStyle('#3b82f6')}>Xem</button>
                                            {['Receptionist', 'Admin'].includes(role) && (
                                                <>
                                                    <button onClick={() => startEdit(p)} style={btnStyle('#10b981')}>Sửa</button>
                                                    {role === 'Admin' && (
                                                        <button onClick={() => handleDelete(p.PatientID)} style={btnStyle('#ef4444')}>Xóa</button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Không tìm thấy bệnh nhân.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* TAB DANH SÁCH CHỜ KHÁM */}
            {activeTab === 'queue' && (
                <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                        <thead style={{ backgroundColor: '#e74c3c', color: 'white', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '14px', textAlign: 'center' }}>STT</th>
                                <th style={{ padding: '14px' }}>Họ tên BN</th>
                                <th style={{ padding: '14px' }}>Khoa khám</th>
                                <th style={{ padding: '14px' }}>BHYT</th>
                                <th style={{ padding: '14px' }}>Lý do</th>
                                <th style={{ padding: '14px', textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ padding: '14px', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queue.length > 0 ? queue.map((q, index) => (
                                <tr key={q.AppointmentID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: q.Status === 'Called' ? '#fff9e6' : index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ padding: '13px', textAlign: 'center', fontWeight: '900', fontSize: '20px', color: '#e74c3c' }}>
                                        {q.QueueNumber ? (q.QueueNumber < 10 ? `0${q.QueueNumber}` : q.QueueNumber) : '-'}
                                    </td>
                                    <td style={{ padding: '13px', fontWeight: 'bold', color: '#1e293b' }}>{q.PatientFullName}</td>
                                    <td style={{ padding: '13px', color: '#475569' }}>{q.Department}</td>
                                    <td style={{ padding: '13px' }}>
                                        {q.InsuranceType !== 'None' ? (
                                            <span style={{ backgroundColor: '#d1ecf1', color: '#0c5460', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {q.InsuranceType} {q.TransferTicket ? '(CT)' : ''}
                                            </span>
                                        ) : <span style={{ color: '#aaa', fontSize: '12px' }}>Tự trả</span>}
                                    </td>
                                    <td style={{ padding: '13px', color: '#475569', fontSize: '13px' }}>{q.Reason}</td>
                                    <td style={{ padding: '13px', textAlign: 'center' }}>{getStatusBadge(q.Status)}</td>
                                    <td style={{ padding: '13px', textAlign: 'center' }}>
                                        {q.Status === 'Pending' && ['Receptionist', 'Nurse', 'Admin'].includes(role) && (
                                            <button onClick={() => handleApprove(q.AppointmentID)} style={btnStyle('#27ae60')}>
                                                Duyệt
                                            </button>
                                        )}
                                        {q.Status === 'Approved' && ['Receptionist', 'Nurse', 'Admin'].includes(role) && (
                                            <button onClick={() => handleCallNumber(q.AppointmentID, q.QueueNumber, q.PatientFullName)} style={btnStyle('#f39c12')}>
                                                Gọi số
                                            </button>
                                        )}
                                        {q.Status === 'Called' && (
                                            <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '13px' }}>Đang vào khám</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Hôm nay chưa có bệnh nhân nào trong hàng đợi.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Thêm/Sửa */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            {editingId ? "CẬP NHẬT HỒ SƠ" : "THÊM BỆNH NHÂN MỚI"}
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px' }}>
                            <input placeholder="Họ và tên *" value={formData.Name} onChange={e => setFormData({ ...formData, Name: e.target.value })} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input type="date" value={formData.DOB} onChange={e => setFormData({ ...formData, DOB: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Điện thoại" value={formData.Phone} onChange={e => setFormData({ ...formData, Phone: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Số BHYT" value={formData.HealthInsuranceID} onChange={e => setFormData({ ...formData, HealthInsuranceID: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Người giám hộ (nếu có)" value={formData.Guardian} onChange={e => setFormData({ ...formData, Guardian: e.target.value })} style={{ gridColumn: 'span 2', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <input placeholder="Địa chỉ" value={formData.Address} onChange={e => setFormData({ ...formData, Address: e.target.value })} style={{ gridColumn: 'span 2', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '14px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xem Chi Tiết */}
            {showDetailModal && selectedPatient && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>CHI TIẾT BỆNH NHÂN</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', fontSize: '14px' }}>
                            {[
                                ['Họ và tên', selectedPatient.Name, true],
                                ['Ngày sinh', selectedPatient.DOB ? new Date(selectedPatient.DOB).toLocaleDateString('vi-VN') : 'Không có', false],
                                ['Số điện thoại', selectedPatient.Phone || 'Không có', false],
                                ['Số BHYT', selectedPatient.HealthInsuranceID || 'Không có', false],
                                ['Người giám hộ', selectedPatient.Guardian || 'Tự đăng ký', false],
                                ['Địa chỉ', selectedPatient.Address || 'Không có', false],
                            ].map(([label, value, bold]) => (
                                <div key={label} style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px' }}>
                                    <strong style={{ width: '160px', color: '#475569' }}>{label}:</strong>
                                    <span style={{ color: '#1e293b', fontWeight: bold ? 'bold' : 'normal' }}>{value}</span>
                                </div>
                            ))}
                            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginTop: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6', fontSize: '14px' }}>Thông tin lịch gần nhất</h4>
                                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                                    <div><strong>Khoa:</strong> {selectedPatient.Department || 'Chưa rõ'}</div>
                                    <div><strong>Bác sĩ:</strong> {selectedPatient.DoctorName ? 'Bs. ' + selectedPatient.DoctorName : 'Chưa xếp'}</div>
                                    <div><strong>Ngày hẹn:</strong> {selectedPatient.AppointmentDate ? new Date(selectedPatient.AppointmentDate).toLocaleString('vi-VN') : 'Chưa rõ'}</div>
                                    <div><strong>Lý do:</strong> <span style={{ color: '#e74c3c', fontStyle: 'italic' }}>{selectedPatient.Reason || 'Không ghi nhận'}</span></div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '11px 30px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientList;