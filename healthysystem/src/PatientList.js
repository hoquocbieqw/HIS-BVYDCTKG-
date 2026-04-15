import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const PatientList = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [patients, setPatients] = useState([]);
    const [queue, setQueue] = useState([]);
    const [formData, setFormData] = useState({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '', Department: 'Khoa Cơ xương khớp', InsuranceType: 'None', IsTransfer: false });
    const [editingId, setEditingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [addedQueueNumber, setAddedQueueNumber] = useState(null);

    const role = localStorage.getItem('role');

    const fetchPatients = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/patients`, auth());
            setPatients(res.data);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu bệnh nhân:", error);
        }
    }, []);

    const fetchQueue = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/queue/today`, auth());
            setQueue(res.data || []);
        } catch (error) {
            console.error("Lỗi tải hàng đợi:", error);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000);
        return () => clearInterval(interval);
    }, [fetchPatients, fetchQueue]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData, DOB: formData.DOB || null };
            if (editingId) {
                await axios.put(`${API}/api/patients/${editingId}`, dataToSend, auth());
                alert("Cập nhật thành công!");
                setAddedQueueNumber(null);
            } else {
                const res = await axios.post(`${API}/api/patients`, dataToSend, auth());
                alert(`Thêm mới thành công! Số thứ tự: ${res.data.QueueNumber}`);
                setAddedQueueNumber(res.data.QueueNumber);
            }
            setShowModal(false);
            setFormData({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '', Department: 'Khoa Cơ xương khớp', InsuranceType: 'None', IsTransfer: false });
            setEditingId(null);
            fetchPatients();
            fetchQueue();
        } catch (error) {
            alert("Lỗi xử lý! " + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bệnh nhân này?")) return;
        try {
            await axios.delete(`${API}/api/patients/${id}`, auth());
            fetchPatients();
        } catch (error) { alert("Lỗi khi xóa!"); }
    };

    const handleApprove = async (appointmentId) => {
        try {
            await axios.put(`${API}/api/queue/${appointmentId}/approve`, {}, auth());
            fetchQueue();
        } catch (err) {
            alert("Lỗi duyệt: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCall = async (appointmentId, queueNumber) => {
        try {
            await axios.put(`${API}/api/queue/${appointmentId}/call`, {}, auth());
            fetchQueue();
            alert(`Đã gọi số ${queueNumber}!`);
        } catch (err) {
            alert("Lỗi gọi số: " + (err.response?.data?.message || err.message));
        }
    };

    const startEdit = (p) => {
        setEditingId(p.PatientID);
        setFormData({ ...p, DOB: p.DOB ? p.DOB.split('T')[0] : '', Department: p.Department || 'Khoa Cơ xương khớp', InsuranceType: p.HealthInsuranceID ? 'BHYT' : 'None', IsTransfer: false });
        setShowModal(true);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ Name: '', DOB: '', Address: '', Phone: '', HealthInsuranceID: '', Guardian: '', Department: 'Khoa Cơ xương khớp', InsuranceType: 'None', IsTransfer: false });
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

    const getStatusInfo = (status) => {
        const map = {
            'Pending': { label: 'Chờ duyệt', bg: '#fff3cd', color: '#856404' },
            'WalkIn': { label: 'Vãng lai', bg: '#fde8d8', color: '#c0392b' },
            'Approved': { label: 'Đã duyệt', bg: '#d4edda', color: '#155724' },
            'Called': { label: 'Đã gọi vào', bg: '#d1ecf1', color: '#0c5460' },
            'Examined': { label: 'Đã khám', bg: '#e2d9f3', color: '#6f42c1' },
        };
        return map[status] || { label: status || 'Chưa rõ', bg: '#e2e8f0', color: '#475569' };
    };

    const departments = ["Khoa Cơ xương khớp", "Khoa Thần kinh", "Khoa Phục hồi chức năng", "Khoa Nội YHCT", "Khoa Khám bệnh"];

    const showNurseReceptionistButtons = ['Receptionist', 'Nurse', 'Admin'].includes(role);
    const showDoctorNurseApproveButtons = ['Doctor', 'Nurse', 'Admin', 'Receptionist'].includes(role);

    return (
        <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '20px', fontWeight: '800' }}>
                {role === 'Doctor' || role === 'Nurse' ? 'Danh sách chờ khám' : 'Quản Lý Thông Tin Bệnh Nhân'}
            </h2>

            {/* TABS */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '2px solid #dfe6e9' }}>
                <button onClick={() => setActiveTab('list')} style={{ padding: '11px 22px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', backgroundColor: activeTab === 'list' ? '#0984e3' : '#f1f2f6', color: activeTab === 'list' ? 'white' : '#636e72' }}>
                    Danh sách bệnh nhân ({filteredPatients.length})
                </button>
                <button onClick={() => setActiveTab('queue')} style={{ padding: '11px 22px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', backgroundColor: activeTab === 'queue' ? '#0984e3' : '#f1f2f6', color: activeTab === 'queue' ? 'white' : '#636e72' }}>
                    Hàng đợi hôm nay ({queue.length})
                </button>
            </div>

            {/* TAB 1: DANH SÁCH BỆNH NHÂN */}
            {activeTab === 'list' && (
                <>
                    {addedQueueNumber && (
                        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '15px' }}>
                            Thêm thành công! Số thứ tự được cấp: <span style={{ fontSize: '22px', color: '#e74c3c' }}>{addedQueueNumber < 10 ? `0${addedQueueNumber}` : addedQueueNumber}</span>
                            <button onClick={() => setAddedQueueNumber(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>x</button>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
                        <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                            <input type="text" placeholder="Tìm kiếm theo họ và tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ flex: 1, padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                                style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff', fontSize: '14px' }}>
                                <option value="all">Tất cả bệnh nhân</option>
                                <option value="new">Bệnh nhân mới hôm nay</option>
                                <option value="old">Bệnh nhân cũ</option>
                            </select>
                        </div>
                        {role !== 'Admin' && (
                            <button onClick={openAddModal} style={{ padding: '12px 20px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                + Thêm Bệnh Nhân
                            </button>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                            <thead style={{ backgroundColor: '#0984e3', color: 'white', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '15px' }}>Số TT</th>
                                    <th style={{ padding: '15px' }}>Họ Tên</th>
                                    <th style={{ padding: '15px' }}>Ngày Sinh</th>
                                    <th style={{ padding: '15px' }}>Điện thoại</th>
                                    <th style={{ padding: '15px' }}>Số BHYT</th>
                                    <th style={{ padding: '15px' }}>Trạng thái</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.length > 0 ? filteredPatients.map((p, index) => {
                                    const statusInfo = getStatusInfo(p.QueueStatus);
                                    return (
                                        <tr key={p.PatientID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '14px', textAlign: 'center', fontWeight: 'bold', color: '#e74c3c', fontSize: '18px' }}>
                                                {p.QueueNumber ? (p.QueueNumber < 10 ? `0${p.QueueNumber}` : p.QueueNumber) : '-'}
                                            </td>
                                            <td style={{ padding: '14px', fontWeight: 'bold', color: '#1e293b' }}>{p.Name}</td>
                                            <td style={{ padding: '14px', color: '#475569' }}>{p.DOB ? new Date(p.DOB).toLocaleDateString('vi-VN') : ''}</td>
                                            <td style={{ padding: '14px', color: '#475569' }}>{p.Phone}</td>
                                            <td style={{ padding: '14px', color: '#475569' }}>{p.HealthInsuranceID || '-'}</td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <button onClick={() => { setSelectedPatient(p); setShowDetailModal(true); }} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '4px' }}>Xem</button>
                                                {role !== 'Admin' && (
                                                    <>
                                                        <button onClick={() => startEdit(p)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '4px' }}>Sửa</button>
                                                    </>
                                                )}
                                                {role === 'Admin' && (
                                                    <button onClick={() => handleDelete(p.PatientID)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xóa</button>
                                                )}
                                                {showDoctorNurseApproveButtons && p.LatestAppointmentID && ['Pending', 'WalkIn'].includes(p.QueueStatus) && (
                                                    <button onClick={() => handleApprove(p.LatestAppointmentID)} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '4px' }}>Duyệt</button>
                                                )}
                                                {showDoctorNurseApproveButtons && p.LatestAppointmentID && p.QueueStatus === 'Approved' && (
                                                    <button onClick={() => handleCall(p.LatestAppointmentID, p.QueueNumber)} style={{ backgroundColor: '#2980b9', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '4px' }}>Gọi số</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Không tìm thấy bệnh nhân.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* TAB 2: HÀNG ĐỢI HÔM NAY */}
            {activeTab === 'queue' && (
                <div>
                    <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#0984e3', color: 'white' }}>
                                <tr>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Số TT</th>
                                    <th style={{ padding: '14px', textAlign: 'left' }}>Bệnh nhân</th>
                                    <th style={{ padding: '14px', textAlign: 'left' }}>Khoa</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Nguồn</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>BHYT</th>
                                    <th style={{ padding: '14px', textAlign: 'center' }}>Trạng thái</th>
                                    {showDoctorNurseApproveButtons && <th style={{ padding: '14px', textAlign: 'center' }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {queue.length === 0 ? (
                                    <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#95a5a6', fontStyle: 'italic' }}>Chưa có bệnh nhân nào trong hàng đợi hôm nay.</td></tr>
                                ) : queue.map((item, idx) => {
                                    const statusInfo = getStatusInfo(item.Status);
                                    return (
                                        <tr key={item.AppointmentID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ padding: '14px', textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: '#e74c3c' }}>
                                                {item.QueueNumber < 10 ? `0${item.QueueNumber}` : item.QueueNumber}
                                            </td>
                                            <td style={{ padding: '14px', fontWeight: 'bold', color: '#1e293b' }}>{item.PatientFullName}</td>
                                            <td style={{ padding: '14px', color: '#475569', fontSize: '13px' }}>{item.Department}</td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: item.AppointmentSource === 'Online' ? '#e8f4fd' : '#fff3cd', color: item.AppointmentSource === 'Online' ? '#0984e3' : '#856404', fontWeight: 'bold' }}>
                                                    {item.AppointmentSource === 'Online' ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: item.InsuranceType !== 'None' ? '#27ae60' : '#95a5a6' }}>
                                                {item.InsuranceType === 'BHYT_K3' ? 'K3' : item.InsuranceType === 'BHYT' ? 'BHYT' : 'Tự túc'}
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            {showDoctorNurseApproveButtons && (
                                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                                    {['Pending', 'WalkIn'].includes(item.Status) && (
                                                        <button onClick={() => handleApprove(item.AppointmentID)} style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginRight: '5px' }}>Duyệt</button>
                                                    )}
                                                    {item.Status === 'Approved' && (
                                                        <button onClick={() => handleCall(item.AppointmentID, item.QueueNumber)} style={{ padding: '6px 12px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Gọi số</button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Thêm/Sửa */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '520px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            {editingId ? "CẬP NHẬT HỒ SƠ BỆNH NHÂN" : "THÊM BỆNH NHÂN MỚI"}
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                            <input placeholder="Họ và tên *" value={formData.Name} onChange={e => setFormData({ ...formData, Name: e.target.value })} required style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', gridColumn: 'span 2' }} />
                            <div>
                                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Ngày sinh</label>
                                <input type="date" value={formData.DOB} onChange={e => setFormData({ ...formData, DOB: e.target.value })} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                            </div>
                            <input placeholder="Điện thoại *" value={formData.Phone} onChange={e => setFormData({ ...formData, Phone: e.target.value })} required style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            <input placeholder="Số BHYT" value={formData.HealthInsuranceID} onChange={e => setFormData({ ...formData, HealthInsuranceID: e.target.value })} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            <select value={formData.Department} onChange={e => setFormData({ ...formData, Department: e.target.value })} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <input placeholder="Người giám hộ (nếu có)" value={formData.Guardian} onChange={e => setFormData({ ...formData, Guardian: e.target.value })} style={{ gridColumn: 'span 2', padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            <input placeholder="Địa chỉ" value={formData.Address} onChange={e => setFormData({ ...formData, Address: e.target.value })} style={{ gridColumn: 'span 2', padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            {formData.HealthInsuranceID && !editingId && (
                                <label style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#c0392b', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formData.IsTransfer} onChange={e => setFormData({ ...formData, IsTransfer: e.target.checked })} />
                                    Có Giấy chuyển tuyến (BHYT K3 - 100% phí)
                                </label>
                            )}
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {editingId ? 'Cập nhật' : 'Thêm & Cấp số'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xem Chi Tiết */}
            {showDetailModal && selectedPatient && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            CHI TIẾT BỆNH NHÂN
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px', fontSize: '14px' }}>
                            {[
                                ['Số thứ tự', selectedPatient.QueueNumber ? (selectedPatient.QueueNumber < 10 ? `0${selectedPatient.QueueNumber}` : selectedPatient.QueueNumber) : '-'],
                                ['Họ và tên', selectedPatient.Name],
                                ['Ngày sinh', selectedPatient.DOB ? new Date(selectedPatient.DOB).toLocaleDateString('vi-VN') : 'Không có'],
                                ['Số điện thoại', selectedPatient.Phone || 'Không có'],
                                ['Số BHYT', selectedPatient.HealthInsuranceID || 'Không có'],
                                ['Người giám hộ', selectedPatient.Guardian || 'Tự đăng ký'],
                                ['Địa chỉ', selectedPatient.Address || 'Không có'],
                                ['Khoa khám', selectedPatient.Department || 'Chưa rõ'],
                                ['Bác sĩ phụ trách', selectedPatient.DoctorName ? 'Bs. ' + selectedPatient.DoctorName : 'Chưa xếp'],
                                ['Lý do khám', selectedPatient.Reason || 'Không ghi nhận'],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                                    <strong style={{ width: '160px', color: '#475569', flexShrink: 0 }}>{label}:</strong>
                                    <span style={{ color: '#1e293b' }}>{value}</span>
                                </div>
                            ))}
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