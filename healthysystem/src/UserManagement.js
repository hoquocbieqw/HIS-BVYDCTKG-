import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const departmentsList = [
    { id: '01', name: 'Khoa Khám bệnh (Phòng 01)' },
    { id: '02', name: 'Khoa Cấp cứu (Phòng 02)' },
    { id: '03', name: 'Khoa Nội tổng hợp (Phòng 03)' },
    { id: '04', name: 'Khoa Ngoại tổng hợp (Phòng 04)' },
    { id: '05', name: 'Khoa Nhi (Phòng 05)' },
    { id: '06', name: 'Khoa Sản (Phòng 06)' },
    { id: '07', name: 'Khoa Răng Hàm Mặt (Phòng 07)' },
    { id: '08', name: 'Khoa Tai Mũi Họng (Phòng 08)' },
    { id: '09', name: 'Khoa Mắt (Phòng 09)' },
    { id: '10', name: 'Khoa Da liễu (Phòng 10)' },
    { id: '11', name: 'Khoa Thần kinh (Phòng 11)' },
    { id: '12', name: 'Khoa Tim mạch (Phòng 12)' },
    { id: '13', name: 'Khoa Tiêu hóa (Phòng 13)' },
    { id: '14', name: 'Khoa Cơ xương khớp (Phòng 14)' },
    { id: '15', name: 'Khoa Phục hồi chức năng (Phòng 15)' }
];

const RoleBadge = ({ role }) => {
    const config = {
        Doctor: { bg: '#e0f2fe', text: '#0284c7', label: 'Bác sĩ' },
        Nurse: { bg: '#ffedd5', text: '#ea580c', label: 'Y tá' },
        Admin: { bg: '#f1f5f9', text: '#475569', label: 'Admin' },
        Patient: { bg: '#dcfce7', text: '#16a34a', label: 'Bệnh nhân' }
    };
    const curr = config[role] || config.Patient;
    return <span style={{ backgroundColor: curr.bg, color: curr.text, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{curr.label}</span>;
};

// COMPONENT NÚT BẤM ĐƯỢC THIẾT KẾ LẠI SIÊU THANH LỊCH (OUTLINE BUTTON)
const ActionBtn = ({ color, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            style={{
                backgroundColor: 'transparent',
                color: color,
                border: `1px solid ${color}`,
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                marginRight: '6px',
                transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = color;
                e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = color;
            }}
        >
            {label}
        </button>
    );
};

const UserManagement = ({ user }) => {
    const [usersList, setUsersList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [roomValue, setRoomValue] = useState('01');

    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userFormData, setUserFormData] = useState({ username: '', password: '', role: 'Patient' });

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/api/admin/users-list', { headers: { 'Authorization': `Bearer ${token}` } });
            setUsersList(res.data);
        } catch (err) { console.error("Lỗi lấy danh sách:", err); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openRoomModal = (id, currentRoom) => { setSelectedUserId(id); setRoomValue(currentRoom || '01'); setShowRoomModal(true); };

    const submitRoomAssign = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/admin/staff/${selectedUserId}/room`, { room: roomValue }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert("Đã cập nhật phòng thành công!");
            setShowRoomModal(false);
            fetchUsers();
        } catch (err) { alert("Lỗi xếp phòng."); }
    };

    const openUserModal = (u = null) => {
        if (u) {
            setEditingUserId(u.UserID);
            setUserFormData({ username: u.Username, password: '', role: u.Role });
        } else {
            setEditingUserId(null);
            setUserFormData({ username: '', password: '', role: 'Patient' });
        }
        setShowUserModal(true);
    };

    const submitUser = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
            if (editingUserId) {
                await axios.put(`http://localhost:3001/api/admin/users-list/${editingUserId}`, userFormData, config);
                alert("Cập nhật quyền/mật khẩu thành công!");
            } else {
                await axios.post('http://localhost:3001/api/register', userFormData);
                alert("Tạo tài khoản mới thành công!");
            }
            setShowUserModal(false);
            fetchUsers();
        } catch (error) {
            alert("Lỗi xử lý! Có thể Username đã tồn tại trong hệ thống.");
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("CẢNH BÁO: Xóa User có thể ảnh hưởng dữ liệu liên quan. Bạn có chắc chắn?")) {
            try {
                await axios.delete(`http://localhost:3001/api/admin/users-list/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                alert("Xóa thành công!");
                fetchUsers();
            } catch (error) {
                alert("Không thể xóa! Tài khoản này đang bị ràng buộc dữ liệu (đã có lịch khám hoặc bệnh án).");
            }
        }
    };

    const filteredUsers = usersList.filter(u => {
        const term = searchTerm.toLowerCase();
        const roleName = u.Role === 'Patient' ? 'bệnh nhân' : (u.Role === 'Doctor' ? 'bác sĩ' : (u.Role === 'Nurse' ? 'y tá' : 'admin'));
        return u.Username.toLowerCase().includes(term) || roleName.includes(term) || (u.Room || '').includes(term) || u.UserID.toString().includes(term);
    });

    return (
        <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0984e3', paddingBottom: '15px', marginBottom: '25px' }}>
                <h2 style={{ color: '#0984e3', margin: 0, fontWeight: '800' }}>
                    Quản Lý Hệ Thống Người Dùng
                </h2>
                <button onClick={() => openUserModal()} style={{ padding: '10px 20px', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    + Thêm User Mới
                </button>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '5px 15px' }}>
                <input type="text" placeholder="Tìm theo tên, mã số, chức vụ (bác sĩ, bệnh nhân) hoặc số phòng..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', border: 'none', padding: '10px 0', fontSize: '14px', outline: 'none', background: 'transparent', color: '#334155' }} />
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                    <thead style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>Mã ID</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>Họ và tên</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>Chức vụ</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center' }}>Phòng trực</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? filteredUsers.map((u, index) => (
                            <tr key={u.UserID} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfcfc', transition: '0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fcfcfc'}>
                                <td style={{ padding: '15px 20px', color: '#64748b', fontWeight: 'bold', fontSize: '14px' }}>#{u.UserID}</td>
                                <td style={{ padding: '15px 20px', color: '#1e293b', fontWeight: 'bold', fontSize: '14px' }}>{u.Username}</td>
                                <td style={{ padding: '15px 20px' }}><RoleBadge role={u.Role} /></td>
                                
                                <td style={{ padding: '15px 20px', color: '#059669', fontWeight: 'bold', textAlign: 'center', fontSize: '14px' }}>
                                    {u.Role === 'Patient' || u.Role === 'Admin' ? <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontWeight: 'normal' }}>---</span> : (u.Room ? `Phòng ${u.Room}` : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Chưa xếp</span>)}
                                </td>

                                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                    {/* SỬ DỤNG MÀU SẮC VIỀN THANH LỊCH HƠN */}
                                    {(u.Role === 'Doctor' || u.Role === 'Nurse') && (
                                        <ActionBtn color="#0284c7" label={u.Room ? 'Đổi phòng' : 'Cấp phòng'} onClick={() => openRoomModal(u.UserID, u.Room)} />
                                    )}
                                    <ActionBtn color="#d97706" label="Sửa Quyền" onClick={() => openUserModal(u)} />
                                    <ActionBtn color="#dc2626" label="Xóa" onClick={() => handleDeleteUser(u.UserID)} />
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Không tìm thấy dữ liệu người dùng.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* MODAL CẤP PHÒNG */}
            {showRoomModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>PHÂN KHOA / PHÒNG NHÂN SỰ</h3>
                        <p style={{ color: '#475569', fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>Chọn khoa/phòng cố định cho nhân viên:</p>
                        <select value={roomValue} onChange={(e) => setRoomValue(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', cursor: 'pointer', marginBottom: '25px', color: '#1e293b' }}>
                            {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRoomModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy</button>
                            <button onClick={submitRoomAssign} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#0984e3', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL THÊM/SỬA TÀI KHOẢN */}
            {showUserModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#0984e3', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', textAlign: 'center', fontWeight: '800' }}>
                            {editingUserId ? "SỬA TÀI KHOẢN" : "TẠO TÀI KHOẢN MỚI"}
                        </h3>
                        <form onSubmit={submitUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>Tên đăng nhập:</label>
                                <input value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} disabled={!!editingUserId} required style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: editingUserId ? '#f8fafc' : '#fff', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>Mật khẩu {editingUserId && '(Bỏ trống nếu không đổi)'}:</label>
                                <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required={!editingUserId} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>Phân quyền (Role):</label>
                                <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})} style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    <option value="Patient">Bệnh nhân (Patient)</option>
                                    <option value="Nurse">Y tá/Thu ngân (Nurse)</option>
                                    <option value="Doctor">Bác sĩ (Doctor)</option>
                                    <option value="Admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>Hủy Bỏ</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#0984e3', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Lưu Tài Khoản</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;