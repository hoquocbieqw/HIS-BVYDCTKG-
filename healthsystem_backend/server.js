const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken, checkRole } = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'vat';
const PORT = 3001;

app.get('/', (req, res) => res.send('Server Hệ thống Y tế đang chạy!'));

// ==========================================
// 1. API AUTH & USERS
// ==========================================
app.post('/api/register', (req, res) => {
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Lỗi mã hóa mật khẩu: ' + err.message });
        db.query('INSERT INTO Users (Username, Password, Role) VALUES (?, ?, ?)', [req.body.username, hash, req.body.role], (err, result) => {
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username đã tồn tại.' });
            if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });
            return res.status(201).json({ message: 'Đăng ký thành công!', userId: result.insertId });
        });
    });
});

app.post('/api/login', (req, res) => {
    db.query('SELECT * FROM Users WHERE Username = ?', [req.body.username], (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Người dùng không tồn tại' });
        bcrypt.compare(req.body.password, results[0].Password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Lỗi kiểm tra mật khẩu: ' + err.message });
            if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu!' });
            const token = jwt.sign({ id: results[0].UserID, role: results[0].Role }, SECRET_KEY, { expiresIn: '1h' });
            return res.status(200).json({ message: 'Đăng nhập thành công!', token, user: { id: results[0].UserID, username: results[0].Username, role: results[0].Role } });
        });
    });
});

app.get('/api/doctors', authenticateToken, (req, res) => {
    db.query("SELECT UserID, Username FROM Users WHERE Role = 'Doctor'", (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });
        return res.status(200).json(results);
    });
});

// ==========================================
// 2. API LỊCH HẸN & ĐỒNG BỘ BỆNH NHÂN
// ==========================================
app.post('/api/appointments', authenticateToken, checkRole(['Patient', 'Receptionist', 'Admin']), (req, res) => {
    const { doctorName, patientName, dob, phone, address, guardian, healthInsuranceID, department, appointmentDate, reason, insuranceType, transferTicket } = req.body;
    const userId = req.user.id;

    // SỬA LỖI MÚI GIỜ: Sử dụng CURDATE() của MySQL thay vì Javascript Date
    db.query("SELECT COALESCE(MAX(QueueNumber), 0) + 1 AS nextNum FROM Appointments WHERE DATE(AppointmentDate) = CURDATE() OR DATE(CreatedAt) = CURDATE()", (err, numRes) => {
        const queueNumber = (err || !numRes.length) ? 1 : numRes[0].nextNum;

        const sqlAppt = "INSERT INTO Appointments (PatientID, DoctorName, PatientFullName, DOB, ContactPhone, Address, Guardian, Department, AppointmentDate, Reason, Status, InsuranceType, TransferTicket, QueueNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)";
        db.query(sqlAppt, [userId, doctorName, patientName, dob, phone, address, guardian, department, appointmentDate, reason, insuranceType || 'None', transferTicket ? 1 : 0, queueNumber], (err, result) => {
            if (err) return res.status(500).json({ message: 'Lỗi CSDL khi tạo lịch hẹn: ' + err.message });

            // Đồng bộ vào bảng Patients
            db.query("SELECT PatientID FROM Patients WHERE UserID = ? AND Name = ?", [userId, patientName], (err2, patRes) => {
                if (!err2 && patRes.length === 0) {
                    db.query("INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian, HealthInsuranceID) VALUES (?, ?, ?, ?, ?, ?, ?)", [patientName, dob, phone, address, userId, guardian || null, healthInsuranceID || null]);
                } else if (!err2 && patRes.length > 0) {
                    db.query("UPDATE Patients SET DOB=?, Phone=?, Address=?, Guardian=?, HealthInsuranceID=? WHERE UserID=? AND Name=?", [dob, phone, address, guardian || null, healthInsuranceID || null, userId, patientName]);
                }
            });
            return res.status(201).json({ message: 'Đặt lịch thành công!', appointmentId: result.insertId, queueNumber });
        });
    });
});

app.get('/api/my-patients', authenticateToken, checkRole(['Patient', 'Admin']), (req, res) => {
    db.query("SELECT PatientID, Name as FullName, DOB as DateOfBirth, Phone, Address, Guardian, HealthInsuranceID FROM Patients WHERE UserID = ?", [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/records', authenticateToken, checkRole(['Doctor', 'Nurse', 'Receptionist', 'Admin', 'Patient']), (req, res) => {
    let sql = "SELECT * FROM Appointments ORDER BY AppointmentDate DESC";
    let params = [];
    if (req.user.role === 'Patient') {
        sql = "SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC";
        params = [req.user.id];
    } else if (req.user.role === 'Doctor') {
        sql = "SELECT * FROM Appointments WHERE DoctorName = (SELECT Username FROM Users WHERE UserID = ?) ORDER BY AppointmentDate DESC";
        params = [req.user.id];
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.put('/api/appointments/:id/status', authenticateToken, checkRole(['Receptionist', 'Admin', 'Nurse']), (req, res) => {
    db.query("UPDATE Appointments SET Status = ? WHERE AppointmentID = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Thành công!" });
    });
});

// API DUYỆT BỆNH NHÂN (Lễ tân/Y tá duyệt để đẩy vào hàng đợi khám của Bác sĩ)
app.put('/api/appointments/:id/approve', authenticateToken, checkRole(['Receptionist', 'Nurse', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Status = 'Waiting' WHERE AppointmentID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã duyệt bệnh nhân vào hàng đợi khám!" });
    });
});

// API GỌI SỐ THỨ TỰ
app.put('/api/appointments/:id/call', authenticateToken, checkRole(['Receptionist', 'Nurse', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Status = 'Called' WHERE AppointmentID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã gọi số bệnh nhân!" });
    });
});

app.put('/api/appointments/:id/room', authenticateToken, checkRole(['Nurse', 'Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Room = ? WHERE AppointmentID = ?", [req.body.room, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Thành công!" });
    });
});

app.delete('/api/appointments/:id', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("DELETE FROM Appointments WHERE AppointmentID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã xóa!" });
    });
});

// ==========================================
// 3. API TIẾP NHẬN VÃNG LAI (LỄ TÂN)
// ==========================================
app.post('/api/reception/walk-in', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    const { patientName, dob, phone, healthInsuranceID, department, reason, isTransfer } = req.body;
    const receptionistUserId = req.user.id;

    // Tìm hoặc tạo mới bệnh nhân
    db.query("SELECT PatientID FROM Patients WHERE Phone = ? OR Name = ?", [phone, patientName], (err, patRes) => {
        const insertAppointment = (patientId) => {
            // SỬA LỖI MÚI GIỜ
            db.query("SELECT COALESCE(MAX(QueueNumber), 0) + 1 AS nextNum FROM Appointments WHERE DATE(CreatedAt) = CURDATE()", (err2, numRes) => {
                const queueNumber = (err2 || !numRes.length) ? 1 : numRes[0].nextNum;
                db.query(
                    "INSERT INTO Appointments (PatientID, PatientFullName, DOB, ContactPhone, Department, Reason, Status, InsuranceType, TransferTicket, AppointmentDate, QueueNumber) VALUES (?, ?, ?, ?, ?, ?, 'Waiting', ?, ?, NOW(), ?)",
                    [patientId, patientName, dob || null, phone || null, department, reason, healthInsuranceID ? 'K3' : 'None', isTransfer ? 1 : 0, queueNumber],
                    (err3, result) => {
                        if (err3) return res.status(500).json({ message: "Lỗi tạo lịch khám: " + err3.message });
                        return res.status(201).json({
                            message: "Cấp số thành công!",
                            ticket: {
                                QueueNumber: queueNumber,
                                PatientName: patientName,
                                Department: department,
                                Time: new Date().toLocaleTimeString('vi-VN'),
                                AppointmentID: result.insertId
                            }
                        });
                    }
                );
            });
        };

        if (!err && patRes.length > 0) {
            insertAppointment(patRes[0].PatientID);
        } else {
            db.query("INSERT INTO Patients (Name, DOB, Phone, HealthInsuranceID, UserID) VALUES (?, ?, ?, ?, ?)",
                [patientName, dob || null, phone || null, healthInsuranceID || null, receptionistUserId],
                (errIns, insRes) => {
                    if (errIns) return res.status(500).json({ message: "Lỗi tạo bệnh nhân: " + errIns.message });
                    insertAppointment(insRes.insertId);
                }
            );
        }
    });
});

// API LẤY DANH SÁCH HÀNG ĐỢI (Cho Lễ tân, Y tá xem và duyệt)
app.get('/api/queue', authenticateToken, checkRole(['Receptionist', 'Nurse', 'Admin', 'Doctor']), (req, res) => {
    // SỬA LỖI MÚI GIỜ
    db.query(
        "SELECT AppointmentID, PatientFullName, QueueNumber, Department, Status, InsuranceType, TransferTicket, AppointmentDate, Reason FROM Appointments WHERE DATE(AppointmentDate) = CURDATE() OR DATE(CreatedAt) = CURDATE() ORDER BY QueueNumber ASC",
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results || []);
        }
    );
});

// API LẤY SỐ THỨ TỰ CHO BỆNH NHÂN XEM
app.get('/api/patient/queue-number', authenticateToken, checkRole(['Patient']), (req, res) => {
    // SỬA LỖI MÚI GIỜ
    db.query(
        "SELECT AppointmentID, PatientFullName, QueueNumber, Department, Status, AppointmentDate FROM Appointments WHERE PatientID = ? AND (DATE(AppointmentDate) = CURDATE() OR DATE(CreatedAt) = CURDATE()) ORDER BY AppointmentDate ASC LIMIT 1",
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results[0] || null);
        }
    );
});

// ==========================================
// 4. API QUẢN LÝ BỆNH NHÂN
// ==========================================
app.get('/api/patients', authenticateToken, checkRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), (req, res) => {
    const syncQuery = `INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian)
        SELECT A.PatientFullName, MAX(A.DOB), MAX(A.ContactPhone), MAX(A.Address), A.PatientID, MAX(A.Guardian)
        FROM Appointments A
        WHERE A.PatientFullName IS NOT NULL AND A.PatientFullName != ''
        AND NOT EXISTS (SELECT 1 FROM Patients P WHERE P.UserID = A.PatientID AND P.Name = A.PatientFullName)
        GROUP BY A.PatientID, A.PatientFullName`;
    db.query(syncQuery, () => {
        const fetchQuery = `SELECT p.*,
            (SELECT Reason FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS Reason,
            (SELECT Department FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS Department,
            (SELECT DoctorName FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS DoctorName,
            (SELECT AppointmentDate FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS AppointmentDate
            FROM Patients p ORDER BY p.CreatedAt DESC`;
        db.query(fetchQuery, (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        });
    });
});

app.post('/api/patients', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("INSERT INTO Patients (Name, DOB, Address, Phone, HealthInsuranceID, Guardian, UserID, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [req.body.Name, req.body.DOB || null, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.status(201).json({ message: "Thêm thành công", PatientID: result.insertId });
        }
    );
});

app.put('/api/patients/:id', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Patients SET Name=?, DOB=?, Address=?, Phone=?, HealthInsuranceID=?, Guardian=? WHERE PatientID=?",
        [req.body.Name, req.body.DOB || null, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json({ message: "Cập nhật thành công" });
        }
    );
});

app.delete('/api/patients/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("DELETE FROM Patients WHERE PatientID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Xóa thành công" });
    });
});

// ==========================================
// 5. API CHUYÊN MÔN BÁC SĨ - HÀNG ĐỢI LÂM SÀNG
// ==========================================
// Lấy bệnh nhân đã được duyệt (Approved / Waiting / Called) để bác sĩ khám
app.get('/api/appointments/pending', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    // ĐÃ GỠ BỎ TẤT CẢ CÁC BỘ LỌC GÂY LỖI "TÀNG HÌNH":
    // 1. Gỡ lọc theo tên Bác sĩ -> Bác sĩ nào cũng thấy danh sách chung.
    // 2. Gỡ lọc theo Ngày (CURDATE) -> Không bao giờ bị ẩn do lệch múi giờ.
    // 3. Bao trùm mọi trạng thái: Pending (Chưa duyệt), Approved/Waiting (Đã duyệt), Called (Đang gọi).
    const sql = `SELECT AppointmentID, PatientID, PatientFullName AS PatientName, 
                 AppointmentDate, Reason, Department, QueueNumber, Status, 
                 InsuranceType, TransferTicket
                 FROM Appointments 
                 WHERE Status IN ('Pending', 'Approved', 'Waiting', 'Called')
                 ORDER BY QueueNumber ASC`;

    db.query(sql, [], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results || []);
    });
});

app.get('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT mr.*, a.PatientFullName AS PatientName, a.AppointmentDate, a.DoctorName 
              FROM MedicalRecords mr 
              JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
              ORDER BY mr.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.post('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;

    db.query("SELECT a.PatientID, a.PatientFullName FROM Appointments a WHERE a.AppointmentID = ?", [AppointmentID], (err, appRes) => {
        if (err || appRes.length === 0) return res.status(500).json({ message: "Lỗi tìm lịch hẹn: " + (err ? err.message : 'Không tìm thấy') });

        const userIdFromAppointment = appRes[0].PatientID;
        const patientName = appRes[0].PatientFullName;

        db.query("SELECT PatientID FROM Patients WHERE UserID = ? AND Name = ?", [userIdFromAppointment, patientName], (err2, patRes) => {
            
            const doInsert = (realPatientID) => {
                db.query(
                    "INSERT INTO MedicalRecords (PatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10) VALUES (?, ?, ?, ?, ?, ?)",
                    [realPatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 || null],
                    (errInsert, result) => {
                        if (errInsert) return res.status(500).json({ message: "Lỗi DB: " + errInsert.message });
                        db.query("UPDATE Appointments SET Status = 'Examined' WHERE AppointmentID = ?", [AppointmentID]);
                        return res.status(201).json({ message: "Tạo bệnh án thành công!", recordId: result.insertId });
                    }
                );
            };

            if (!err2 && patRes.length > 0) {
                doInsert(patRes[0].PatientID);
            } else {
                db.query("SELECT PatientID FROM Patients WHERE UserID = ?", [userIdFromAppointment], (err3, patRes2) => {
                    if (!err3 && patRes2.length > 0) {
                        doInsert(patRes2[0].PatientID);
                    } else {
                        db.query(
                            "SELECT ContactPhone, DOB, Address FROM Appointments WHERE AppointmentID = ?", [AppointmentID],
                            (err4, apptDetail) => {
                                const phone = (apptDetail && apptDetail[0]) ? apptDetail[0].ContactPhone : null;
                                const dob = (apptDetail && apptDetail[0]) ? apptDetail[0].DOB : null;
                                db.query(
                                    "INSERT INTO Patients (Name, DOB, Phone, UserID, CreatedAt) VALUES (?, ?, ?, ?, NOW())",
                                    [patientName, dob || null, phone || null, userIdFromAppointment],
                                    (errNew, newPat) => {
                                        if (errNew) return res.status(500).json({ message: "Lỗi tạo bệnh nhân: " + errNew.message });
                                        doInsert(newPat.insertId);
                                    }
                                );
                            }
                        );
                    }
                });
            }
        });
    });
});

app.put('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;
    db.query("UPDATE MedicalRecords SET Diagnosis=?, TreatmentPlan=?, Notes=?, ICD10=? WHERE RecordID=?",
        [Diagnosis, TreatmentPlan, Notes, ICD10 || null, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json({ message: "Cập nhật thành công" });
        }
    );
});

app.delete('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    db.query("UPDATE MedicalRecords SET Status = 'Cancelled' WHERE RecordID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã hủy" });
    });
});

app.post('/api/treatments', authenticateToken, checkRole(['Doctor', 'Nurse']), (req, res) => {
    const { recordId, TechniqueType, Result, Notes } = req.body;
    db.query("INSERT INTO TreatmentSessions (RecordID, NurseID, TechniqueType, SessionDate, Result, Notes) VALUES (?, ?, ?, NOW(), ?, ?)",
        [recordId, req.user.id, TechniqueType, Result, Notes],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json({ message: "Ghi nhận thành công" });
        }
    );
});

app.get('/api/treatments/:recordId', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT ts.*, u.Username AS NurseName FROM TreatmentSessions ts 
              JOIN Users u ON ts.NurseID = u.UserID 
              WHERE ts.RecordID = ? ORDER BY ts.SessionDate DESC`,
        [req.params.recordId],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results || []);
        }
    );
});

// ==========================================
// 6. API PHIẾU KHÁM (Y TÁ XÁC NHẬN BHYT & XUẤT PHIẾU THANH TOÁN)
// ==========================================
app.put('/api/medical-records/:id/confirm-insurance', authenticateToken, checkRole(['Nurse', 'Admin']), (req, res) => {
    const { InsuranceConfirmed } = req.body;
    db.query("UPDATE MedicalRecords SET InsuranceConfirmed = ?, NurseConfirmedAt = NOW() WHERE RecordID = ?",
        [InsuranceConfirmed ? 1 : 0, req.params.id],
        (err) => {
            if (err) {
                console.warn("InsuranceConfirmed column may not exist:", err.message);
                return res.json({ message: "Xác nhận thành công (cần chạy migration nếu lỗi column)" });
            }
            return res.json({ message: "Đã xác nhận BHYT, bệnh nhân có thể ra Thu ngân!" });
        }
    );
});

app.get('/api/nurse/pending-confirm', authenticateToken, checkRole(['Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT mr.RecordID, mr.Diagnosis, mr.ICD10, mr.TreatmentPlan, mr.CreatedAt,
              a.PatientFullName AS PatientName, a.InsuranceType, a.TransferTicket, a.Department, a.AppointmentDate
              FROM MedicalRecords mr 
              JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
              WHERE a.Status = 'Examined'
              ORDER BY mr.CreatedAt DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results || []);
        }
    );
});

// ==========================================
// 7. API QUẢN LÝ THUỐC & KÊ ĐƠN
// ==========================================
app.get('/api/medicines', authenticateToken, (req, res) => {
    db.query("SELECT * FROM medicines WHERE StockQuantity > 0", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/medicines/all', authenticateToken, (req, res) => {
    db.query("SELECT * FROM medicines ORDER BY MedicineName ASC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.post('/api/medicines', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    const { MedicineName, Unit, StockQuantity, Price, Description } = req.body;
    db.query("INSERT INTO medicines (MedicineName, Unit, StockQuantity, Price, Description) VALUES (?, ?, ?, ?, ?)",
        [MedicineName, Unit, StockQuantity, Price, Description],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.status(201).json({ message: "Nhập thuốc thành công" });
        }
    );
});

app.put('/api/medicines/:id', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    const { MedicineName, Unit, StockQuantity, Price, Description } = req.body;
    db.query("UPDATE medicines SET MedicineName=?, Unit=?, StockQuantity=?, Price=?, Description=? WHERE MedicineID=?",
        [MedicineName, Unit, StockQuantity, Price, Description, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json({ message: "Cập nhật thành công" });
        }
    );
});

app.delete('/api/medicines/:id', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    db.query("DELETE FROM medicines WHERE MedicineID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Xóa thuốc thành công" });
    });
});

app.post('/api/prescriptions', authenticateToken, checkRole(['Doctor', 'Admin']), async (req, res) => {
    const { recordId, prescriptionList } = req.body;
    if (!prescriptionList || prescriptionList.length === 0) return res.status(400).json({ message: "Đơn thuốc không được để trống" });
    try {
        const promises = prescriptionList.map(item => {
            return new Promise((resolve, reject) => {
                db.query("INSERT INTO prescription_details (RecordID, MedicineID, Quantity, Dosage, Status) VALUES (?, ?, ?, ?, 'Pending')",
                    [recordId, item.medicineId, item.quantity, item.dosage],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
        });
        await Promise.all(promises);
        return res.status(201).json({ message: "Kê đơn thành công!" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi DB: " + (error.message || "Không thể kê đơn") });
    }
});

app.get('/api/prescriptions/history', authenticateToken, checkRole(['Doctor', 'Pharmacist', 'Admin']), (req, res) => {
    db.query(`SELECT DISTINCT mr.RecordID, mr.Diagnosis, a.PatientFullName AS PatientName, a.AppointmentDate 
              FROM MedicalRecords mr 
              JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
              JOIN prescription_details pd ON mr.RecordID = pd.RecordID 
              ORDER BY a.AppointmentDate DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        }
    );
});

app.get('/api/prescriptions/dispensable', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    db.query(`SELECT DISTINCT mr.RecordID, mr.Diagnosis, a.PatientFullName AS PatientName, a.AppointmentDate, i.PaymentMethod
              FROM MedicalRecords mr 
              JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
              JOIN prescription_details pd ON mr.RecordID = pd.RecordID
              JOIN invoices i ON mr.RecordID = i.RecordID
              WHERE pd.Status = 'Pending' AND i.PaymentStatus = 'Paid'
              ORDER BY i.CreatedAt DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results || []);
        }
    );
});

app.post('/api/pharmacy/dispense', authenticateToken, checkRole(['Pharmacist', 'Admin']), async (req, res) => {
    const { recordId } = req.body;
    try {
        const meds = await new Promise((resolve, reject) => {
            db.query("SELECT MedicineID, Quantity FROM prescription_details WHERE RecordID = ? AND Status = 'Pending'", [recordId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });
        if (!meds.length) return res.status(400).json({ message: "Không có thuốc cần cấp phát hoặc đã cấp phát rồi." });

        for (const med of meds) {
            await new Promise((resolve, reject) => {
                // SỬ DỤNG CASE WHEN ĐỂ KHÔNG BAO GIỜ CHO MYSQL TÍNH TOÁN RA SỐ ÂM
                db.query("UPDATE medicines SET StockQuantity = CASE WHEN StockQuantity >= ? THEN StockQuantity - ? ELSE 0 END WHERE MedicineID = ?",
                    [med.Quantity, med.Quantity, med.MedicineID],
                    (err, r) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        await new Promise((resolve, reject) => {
            db.query("UPDATE prescription_details SET Status = 'Dispensed' WHERE RecordID = ?", [recordId], (err) => {
                if (err) reject(err); else resolve();
            });
        });
        return res.json({ message: "Xuất kho và cấp phát thuốc thành công!" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi cấp phát: " + error.message });
    }
});

app.get('/api/prescriptions/details/:recordId', authenticateToken, (req, res) => {
    db.query(`SELECT pd.Quantity, pd.Dosage, pd.Status, m.MedicineName, m.Unit, m.MedicineID
              FROM prescription_details pd 
              JOIN medicines m ON pd.MedicineID = m.MedicineID 
              WHERE pd.RecordID = ?`,
        [req.params.recordId],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        }
    );
});

// ==========================================
// 8. API VIỆN PHÍ & THANH TOÁN
// ==========================================
app.get('/api/billing/pending', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT mr.RecordID, p.Name AS PatientName, mr.Diagnosis, mr.CreatedAt 
              FROM medicalrecords mr 
              JOIN patients p ON mr.PatientID = p.PatientID 
              LEFT JOIN invoices i ON mr.RecordID = i.RecordID 
              WHERE i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid' 
              ORDER BY mr.CreatedAt DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        }
    );
});

app.get('/api/billing/preview/:recordId', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId } = req.params;
    const sqlCalculate = `SELECT m.MedicineName, pd.Quantity, m.Price, (pd.Quantity * m.Price) AS SubTotal, a.InsuranceType, a.TransferTicket 
                          FROM prescription_details pd 
                          JOIN medicines m ON pd.MedicineID = m.MedicineID 
                          JOIN medicalrecords mr ON pd.RecordID = mr.RecordID
                          JOIN appointments a ON mr.AppointmentID = a.AppointmentID
                          WHERE pd.RecordID = ? AND pd.Status = 'Pending'`;
    db.query(sqlCalculate, [recordId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        if (results.length === 0) {
            db.query(`SELECT a.InsuranceType, a.TransferTicket FROM medicalrecords mr JOIN appointments a ON mr.AppointmentID = a.AppointmentID WHERE mr.RecordID = ?`, [recordId], (err2, res2) => {
                if (err2 || res2.length === 0) return res.json({ details: [], examFee: 50000, medicineTotal: 0, InsuranceType: 'None', TransferTicket: 0 });
                return res.json({ details: [], examFee: 50000, medicineTotal: 0, InsuranceType: res2[0].InsuranceType, TransferTicket: res2[0].TransferTicket });
            });
            return;
        }
        const medicineTotal = results.reduce((sum, item) => sum + parseFloat(item.SubTotal || 0), 0);
        return res.json({ details: results, examFee: 50000, medicineTotal, InsuranceType: results[0].InsuranceType, TransferTicket: results[0].TransferTicket });
    });
});

app.post('/api/invoices', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId, examFee, medicineTotal, totalAmount, paymentMethod, details } = req.body;
    db.query("SELECT InvoiceID FROM invoices WHERE RecordID = ? AND PaymentStatus = 'Paid'", [recordId], (checkErr, checkRes) => {
        if (checkErr) return res.status(500).json({ message: "Lỗi DB: " + checkErr.message });
        if (checkRes.length > 0) return res.status(400).json({ message: "Bệnh án này đã được thanh toán" });
        db.query("INSERT INTO invoices (RecordID, ExamFee, MedicineTotal, TotalAmount, PaymentMethod, PaymentStatus) VALUES (?, ?, ?, ?, ?, 'Paid')",
            [recordId, examFee, medicineTotal, totalAmount, paymentMethod],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
                const invoiceId = result.insertId;
                if (details && details.length > 0) {
                    details.forEach(item => {
                        db.query("INSERT INTO invoice_details (InvoiceID, MedicineName, Quantity, PriceAtTime, SubTotal) VALUES (?, ?, ?, ?, ?)",
                            [invoiceId, item.MedicineName, item.Quantity, item.Price, item.SubTotal]);
                    });
                }
                db.query(`UPDATE Appointments a 
                          JOIN MedicalRecords mr ON a.AppointmentID = mr.AppointmentID 
                          SET a.Status = 'Paid' 
                          WHERE mr.RecordID = ?`, [recordId]);
                return res.status(201).json({ message: "Thanh toán thành công!", invoiceId });
            }
        );
    });
});

app.get('/api/invoices/paid', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT i.*, p.Name AS PatientName FROM invoices i 
              JOIN medicalrecords mr ON i.RecordID = mr.RecordID 
              JOIN patients p ON mr.PatientID = p.PatientID 
              WHERE i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        }
    );
});

app.post('/api/invoices/cancel/:id', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { cancelReason } = req.body;
    db.query("SELECT RecordID FROM invoices WHERE InvoiceID = ?", [req.params.id], (err, invRes) => {
        if (err || invRes.length === 0) return res.status(500).json({ message: "Lỗi tìm hóa đơn: " + (err ? err.message : '') });
        const recordId = invRes[0].RecordID;
        db.query("UPDATE invoices SET PaymentStatus = 'Unpaid', CancelReason = ? WHERE InvoiceID = ?", [cancelReason, req.params.id]);
        db.query("UPDATE prescription_details SET Status = 'Pending' WHERE RecordID = ? AND Status = 'Dispensed'", [recordId]);
        return res.json({ message: "Đã hủy hóa đơn!" });
    });
});

// ==========================================
// 9. API BỆNH NHÂN XEM HỒ SƠ VÀ QUẢN LÝ LỊCH
// ==========================================
app.get('/api/patient/full-history', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;
    const sqlRecords = `SELECT mr.RecordID, mr.Diagnosis, mr.TreatmentPlan, mr.Notes, mr.Status, mr.ICD10,
                        a.AppointmentDate, a.DoctorName, a.PatientFullName, a.Department
                        FROM medicalrecords mr 
                        JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
                        WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;
    const sqlInvoices = `SELECT i.InvoiceID, i.TotalAmount, i.PaymentMethod, i.CreatedAt, mr.Diagnosis, a.PatientFullName 
                         FROM invoices i 
                         JOIN medicalrecords mr ON i.RecordID = mr.RecordID 
                         JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
                         WHERE a.PatientID = ? AND i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`;
    const sqlAppointments = `SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC`;

    db.query(sqlRecords, [userId], (err, records) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query(sqlInvoices, [userId], (err, invoices) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            db.query(sqlAppointments, [userId], (err, appointments) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                db.query("SELECT pd.RecordID, m.MedicineName, pd.Quantity, pd.Dosage, pd.Status FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID", (err, meds) => {
                    if (err) return res.status(500).json({ message: "Lỗi DB" });
                    const safeRecords = records || [];
                    const safeMeds = meds || [];
                    const recordsWithMeds = safeRecords.map(rec => ({
                        ...rec,
                        prescriptions: safeMeds.filter(m => m.RecordID === rec.RecordID)
                    }));
                    return res.json({ records: recordsWithMeds, invoices: invoices || [], appointments: appointments || [] });
                });
            });
        });
    });
});

app.get('/api/patient/dashboard', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;
    const sqlDebt = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.PatientFullName 
                     FROM medicalrecords mr 
                     JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
                     LEFT JOIN invoices i ON mr.RecordID = i.RecordID 
                     WHERE a.PatientID = ? AND (i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid') 
                     ORDER BY a.AppointmentDate DESC`;
    const sqlUpcoming = `SELECT * FROM Appointments WHERE PatientID = ? AND AppointmentDate >= CURDATE() AND Status NOT IN ('Cancelled', 'Paid') ORDER BY AppointmentDate ASC`;
    const sqlHistory = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.DoctorName, a.PatientFullName 
                        FROM medicalrecords mr 
                        JOIN Appointments a ON mr.AppointmentID = a.AppointmentID 
                        WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;

    db.query(sqlDebt, [userId], (err, debts) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query(sqlUpcoming, [userId], (err, upcoming) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            db.query(sqlHistory, [userId], (err, history) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                return res.json({ debts: debts || [], upcoming: upcoming || [], history: history || [] });
            });
        });
    });
});

app.get('/api/patient/appointments', authenticateToken, checkRole(['Patient']), (req, res) => {
    db.query(`SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC`, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results || []);
    });
});

app.put('/api/patient/appointments/:id', authenticateToken, checkRole(['Patient']), (req, res) => {
    const { patientName, dob, phone, address, guardian, department, appointmentDate, reason } = req.body;
    db.query("UPDATE Appointments SET PatientFullName=?, DOB=?, ContactPhone=?, Address=?, Guardian=?, Department=?, AppointmentDate=?, Reason=? WHERE AppointmentID=? AND PatientID=? AND Status='Pending'",
        [patientName, dob, phone, address, guardian, department, appointmentDate, reason, req.params.id, req.user.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json({ message: "Cập nhật thành công" });
        }
    );
});

app.delete('/api/patient/appointments/:id', authenticateToken, checkRole(['Patient']), (req, res) => {
    db.query("DELETE FROM Appointments WHERE AppointmentID=? AND PatientID=? AND Status='Pending'", [req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã hủy lịch" });
    });
});

// ==========================================
// 10. API DASHBOARD BIỂU ĐỒ
// ==========================================
app.get('/api/reports/chart-revenue', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    const sql = `SELECT DATE_FORMAT(CreatedAt, '%d/%m') as date, SUM(TotalAmount) as revenue FROM invoices WHERE PaymentStatus = 'Paid' GROUP BY DATE(CreatedAt) ORDER BY DATE(CreatedAt) DESC LIMIT 7`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results.reverse());
    });
});

app.get('/api/reports/chart-medicines', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    const sql = `SELECT MedicineName, SUM(Quantity) as total_sold FROM invoice_details GROUP BY MedicineName ORDER BY total_sold DESC LIMIT 5`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/reports/revenue', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    const sql = "SELECT InvoiceID, TotalAmount, CreatedAt, PaymentMethod FROM invoices WHERE PaymentStatus = 'Paid' ORDER BY CreatedAt DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

// ==========================================
// 11. API ADMIN DASHBOARD & QUẢN LÝ USER
// ==========================================
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    let stats = { appointments: 0, patients: 0, doctors: 0 };
    let apptSql = "SELECT COUNT(*) AS count FROM Appointments";
    let apptParams = [];
    if (req.user.role === 'Patient') { apptSql += " WHERE PatientID = ?"; apptParams.push(req.user.id); }
    else if (req.user.role === 'Doctor') { apptSql += " WHERE DoctorName = (SELECT Username FROM Users WHERE UserID = ?)"; apptParams.push(req.user.id); }
    db.query(apptSql, apptParams, (err, apptRes) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        if (apptRes.length > 0) stats.appointments = apptRes[0].count;
        db.query("SELECT COUNT(*) AS count FROM Users WHERE Role = 'Patient'", (err, patRes) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            if (patRes.length > 0) stats.patients = patRes[0].count;
            db.query("SELECT COUNT(*) AS count FROM Users WHERE Role = 'Doctor'", (err, docRes) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                if (docRes.length > 0) stats.doctors = docRes[0].count;
                return res.json(stats);
            });
        });
    });
});

app.get('/api/admin/users-count', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("SELECT Role, COUNT(*) as count FROM Users GROUP BY Role", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        let stats = { Patient: 0, Doctor: 0, Nurse: 0, Receptionist: 0, Pharmacist: 0, Cashier: 0, Admin: 0 };
        results.forEach(row => stats[row.Role] = row.count);
        return res.json(stats);
    });
});

app.get('/api/admin/staff', authenticateToken, checkRole(['Admin', 'Nurse']), (req, res) => {
    db.query("SELECT UserID, Username, Role, Room FROM Users WHERE Role IN ('Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Cashier') ORDER BY Role, Username", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.put('/api/admin/staff/:id/room', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("UPDATE Users SET Room = ? WHERE UserID = ?", [req.body.room, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json({ message: "Thành công" });
    });
});

app.get('/api/admin/users-list', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("SELECT UserID, Username, Role, CreatedAt FROM Users ORDER BY CreatedAt DESC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.put('/api/admin/users-list/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    const { role, password } = req.body;
    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ message: "Lỗi mã hóa" });
            db.query("UPDATE Users SET Role = ?, Password = ? WHERE UserID = ?", [role, hash, req.params.id], (err) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                return res.json({ message: "Cập nhật thành công" });
            });
        });
    } else {
        db.query("UPDATE Users SET Role = ? WHERE UserID = ?", [role, req.params.id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json({ message: "Cập nhật quyền thành công" });
        });
    }
});

app.delete('/api/admin/users-list/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("DELETE FROM Users WHERE UserID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Không thể xóa do User này đang bị ràng buộc dữ liệu." });
        return res.json({ message: "Đã xóa User" });
    });
});

app.listen(PORT, () => console.log(`Server Backend chạy tại http://localhost:${PORT}`));