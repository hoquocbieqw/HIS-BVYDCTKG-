import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const Appointment = () => {
    const [doctors, setDoctors] = useState([]); 
    const [formData, setFormData] = useState({
        doctorName: '',
        patientName: '',
        dob: '',
        phone: '',
        address: '',
        guardian: '',
        healthInsuranceID: '', // Thêm trường BHYT
        department: '',
        appointmentDate: '',
        reason: ''
    });

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/doctors', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setDoctors(res.data);
            } catch (err) {}
        };
        fetchDoctors();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3001/api/appointments', formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Đăng ký lịch khám thành công!');
            
            setFormData({
                doctorName: '',
                patientName: '',
                dob: '',
                phone: '',
                address: '',
                guardian: '',
                healthInsuranceID: '', // Reset trường BHYT
                department: '',
                appointmentDate: '',
                reason: ''
            });
        } catch (err) {
            alert('Lỗi đăng ký lịch khám.');
        }
    };

    return (
        <div className="appointment-wrapper">
            <div className="appointment-card">
                <h2 className="form-title" style={{ color: '#0984e3', borderBottomColor: '#0984e3' }}>
                    Đăng ký lịch hẹn mới
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ color: '#0984e3' }}>Chọn bác sĩ phụ trách:</label>
                        <select name="doctorName" className="form-control" onChange={handleChange} value={formData.doctorName} required>
                            <option value="">-- Vui lòng chọn bác sĩ --</option>
                            {doctors.map(doc => (
                                <option key={doc.UserID} value={doc.Username}>Bs. {doc.Username}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div>
                            <label className="form-label" style={{ color: '#0984e3' }}>Họ và tên bệnh nhân:</label>
                            <input type="text" name="patientName" className="form-control" onChange={handleChange} value={formData.patientName} required />
                        </div>
                        <div>
                            <label className="form-label" style={{ color: '#0984e3' }}>Ngày tháng năm sinh:</label>
                            <input type="date" name="dob" className="form-control" onChange={handleChange} value={formData.dob} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div>
                            <label className="form-label" style={{ color: '#0984e3' }}>Số điện thoại liên lạc:</label>
                            <input type="text" name="phone" className="form-control" onChange={handleChange} value={formData.phone} required />
                        </div>
                        <div>
                            <label className="form-label" style={{ color: '#0984e3' }}>Họ tên người giám hộ (nếu có):</label>
                            <input type="text" name="guardian" className="form-control" onChange={handleChange} value={formData.guardian} placeholder="Dành cho bệnh nhân dưới 18 tuổi" />
                        </div>
                    </div>

                    {/* Bổ sung ô nhập Số BHYT bên cạnh Địa chỉ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ color: '#0984e3' }}>Địa chỉ thường trú:</label>
                            <input type="text" name="address" className="form-control" onChange={handleChange} value={formData.address} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ color: '#0984e3' }}>Số thẻ BHYT (Nếu có):</label>
                            <input type="text" name="healthInsuranceID" className="form-control" onChange={handleChange} value={formData.healthInsuranceID} placeholder="Mã số BHYT..." />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ color: '#0984e3' }}>Khoa khám chữa bệnh (Tìm kiếm hoặc cuộn chọn):</label>
                        <input list="departmentList" name="department" className="form-control" onChange={handleChange} value={formData.department} placeholder="-- Nhập hoặc chọn khoa khám bệnh --" required />
                        <datalist id="departmentList">
                            <option value="Khoa Khám bệnh (Phòng 01)" />
                            <option value="Khoa Cấp cứu (Phòng 02)" />
                            <option value="Khoa Nội tổng hợp (Phòng 03)" />
                            <option value="Khoa Ngoại tổng hợp (Phòng 04)" />
                            <option value="Khoa Nhi (Phòng 05)" />
                            <option value="Khoa Sản (Phòng 06)" />
                            <option value="Khoa Răng Hàm Mặt (Phòng 07)" />
                            <option value="Khoa Tai Mũi Họng (Phòng 08)" />
                            <option value="Khoa Mắt (Phòng 09)" />
                            <option value="Khoa Da liễu (Phòng 10)" />
                            <option value="Khoa Thần kinh (Phòng 11)" />
                            <option value="Khoa Tim mạch (Phòng 12)" />
                            <option value="Khoa Tiêu hóa (Phòng 13)" />
                            <option value="Khoa Cơ xương khớp (Phòng 14)" />
                            <option value="Khoa Phục hồi chức năng (Phòng 15)" />
                        </datalist>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label" style={{ color: '#0984e3' }}>Thời gian khám dự kiến:</label>
                        <input type="datetime-local" name="appointmentDate" className="form-control" onChange={handleChange} value={formData.appointmentDate} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ color: '#0984e3' }}>Lý do khám bệnh (Triệu chứng):</label>
                        <textarea name="reason" className="form-control" placeholder="Mô tả chi tiết triệu chứng của bạn..." onChange={handleChange} value={formData.reason} required />
                    </div>

                    <button type="submit" className="btn-submit" style={{ backgroundColor: '#0984e3' }}>
                        XÁC NHẬN ĐĂNG KÝ KHÁM
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Appointment;