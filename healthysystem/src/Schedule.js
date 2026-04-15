import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActionBtn = ({ bg, label, onClick }) => (
    <button onClick={onClick} style={{ flex: 1, backgroundColor: bg, color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{label}</button>
);

const Schedule = ({ user }) => {
    const [records, setRecords] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { 
        const fetchRecords = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/records', { headers: { 'Authorization': `Bearer ${token}` } });
                setRecords(res.data);
            } catch (err) { console.error("Lỗi lấy dữ liệu lịch", err); }
        };
        fetchRecords(); 
    }, []);

    const handleUpdateStatus = async (id, newStatus) => {
        const actionName = newStatus === 'Confirmed' ? 'DUYỆT' : 'HỦY';
        if (!window.confirm(`Xác nhận ${actionName} lịch khám #${id}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/appointments/${id}/status`, { status: newStatus }, { headers: { 'Authorization': `Bearer ${token}` } });
            alert(`✅ Đã ${actionName} thành công!`);
            
            // Reload lại data
            const res = await axios.get('http://localhost:3001/api/records', { headers: { 'Authorization': `Bearer ${token}` } });
            setRecords(res.data);
        } catch (err) { alert("❌ Lỗi thao tác."); }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalSlots = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];

    const today = new Date();
    const getRecordsForDate = (dateObj) => !dateObj ? [] : records.filter(r => new Date(r.AppointmentDate).toDateString() === dateObj.toDateString());

    const handleDayClick = (dateObj) => { if (dateObj) { setSelectedDate(dateObj); setShowModal(true); } };
    const isManager = user?.role === 'Nurse' || user?.role === 'Admin';

    return (
        <div style={{ padding: '10px' }}>
            {/* ĐÃ BỎ ICON 📅 */}
            <h2 style={{ color: '#0984e3', borderBottom: '3px solid #0984e3', paddingBottom: '10px', marginBottom: '25px', fontWeight: '800' }}>
                Quản Lý Lịch Trực & Khám Bệnh
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ backgroundColor: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>◀ Tháng trước</button>
                <h3 style={{ margin: 0, color: '#0984e3', fontSize: '22px' }}>Tháng {month + 1} - Năm {year}</h3>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ backgroundColor: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>Tháng sau ▶</button>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* ĐÃ ĐỔI MÀU NỀN CÁC THỨ THÀNH MÀU XANH #0984e3 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#0984e3', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => <div key={day} style={{ padding: '15px 0' }}>{day}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {totalSlots.map((dateObj, index) => {
                        const dayRecords = getRecordsForDate(dateObj);
                        const isToday = dateObj && dateObj.toDateString() === today.toDateString();
                        return (
                            <div key={index} onClick={() => handleDayClick(dateObj)} style={{ minHeight: '120px', padding: '10px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', backgroundColor: dateObj ? (isToday ? '#f0f9ff' : '#ffffff') : '#f8fafc', cursor: dateObj ? 'pointer' : 'default', transition: '0.2s' }} onMouseEnter={(e) => { if (dateObj) e.currentTarget.style.backgroundColor = '#e0f2fe'; }} onMouseLeave={(e) => { if (dateObj) e.currentTarget.style.backgroundColor = isToday ? '#f0f9ff' : '#ffffff'; }}>
                                {dateObj && (
                                    <>
                                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: isToday ? '#0284c7' : '#64748b', marginBottom: '10px' }}>{dateObj.getDate()}</div>
                                        {dayRecords.length > 0 && <div style={{ backgroundColor: '#3498db', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '5px' }}>{dayRecords.length} lịch hẹn</div>}
                                        {dayRecords.some(r => r.Status === 'Pending') && <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginLeft: '5px' }}>Có đơn chờ</div>}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {showModal && selectedDate && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#0984e3', fontSize: '20px' }}>Lịch khám ngày {selectedDate.toLocaleDateString('vi-VN')}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✖</button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                            {getRecordsForDate(selectedDate).length === 0 ? <p style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', marginTop: '30px' }}>Trống lịch.</p> : (
                                getRecordsForDate(selectedDate).map(record => (
                                    <div key={record.AppointmentID} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#f8fafc', position: 'relative' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>Bệnh nhân: <span style={{ color: '#0284c7' }}>{record.PatientName}</span></div>
                                        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '5px' }}>Giờ hẹn: <strong style={{ color: '#b91c1c' }}>{new Date(record.AppointmentDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</strong></div>
                                        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '5px' }}>Bác sĩ: <strong>{record.DoctorName}</strong> {record.Room && <span style={{ color: '#059669' }}>(🏥 Phòng {record.Room})</span>}</div>
                                        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>Lý do: <em>{record.Reason}</em></div>
                                        <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: record.Status === 'Pending' ? '#fef08a' : (record.Status === 'Confirmed' ? '#d1fae5' : '#fee2e2'), color: record.Status === 'Pending' ? '#a16207' : (record.Status === 'Confirmed' ? '#047857' : '#b91c1c'), padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {record.Status === 'Pending' ? 'Đang chờ' : (record.Status === 'Confirmed' ? 'Đã duyệt' : 'Đã hủy')}
                                        </span>
                                        {isManager && record.Status === 'Pending' && (
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '15px' }}>
                                                <ActionBtn bg="#10b981" label="Duyệt" onClick={() => handleUpdateStatus(record.AppointmentID, 'Confirmed')} />
                                                <ActionBtn bg="#f59e0b" label="Hủy" onClick={() => handleUpdateStatus(record.AppointmentID, 'Cancelled')} />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;