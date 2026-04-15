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

// Ghi Audit Log
const writeAuditLog = (userId, action, tableName, recordId, detail) => {
    const sql = "INSERT INTO AuditLogs (UserID, Action, TableName, RecordID, Detail, CreatedAt) VALUES (?, ?, ?, ?, ?, NOW())";
    db.query(sql, [userId, action, tableName, recordId, detail], () => {});
};

// ==========================================
// 1. AUTH & USERS
// ==========================================
app.post('/api/register', (req, res) => {
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Lỗi mã hóa: ' + err.message });
        db.query('INSERT INTO Users (Username, Password, Role) VALUES (?, ?, ?)',
            [req.body.username, hash, req.body.role || 'Patient'],
            (err, result) => {
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
            if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu!' });
            const token = jwt.sign({ id: results[0].UserID, role: results[0].Role }, SECRET_KEY, { expiresIn: '8h' });
            return res.status(200).json({ message: 'Đăng nhập thành công!', token, user: { id: results[0].UserID, username: results[0].Username, role: results[0].Role } });
        });
    });
});

app.get('/api/doctors', authenticateToken, (req, res) => {
    db.query("SELECT UserID, Username FROM Users WHERE Role = 'Doctor'", (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi DB' });
        return res.json(results);
    });
});

// ==========================================
// 2. LỊCH HẸN (QUY TRÌNH 1 - ONLINE)
// ==========================================
app.post('/api/appointments', authenticateToken, checkRole(['Patient', 'Receptionist', 'Admin']), (req, res) => {
    const { doctorName, patientName, dob, phone, address, guardian, healthInsuranceID, department, appointmentDate, reason, insuranceType, transferTicket } = req.body;
    const userId = req.user.id;

    const sql = "INSERT INTO Appointments (PatientID, DoctorName, PatientFullName, DOB, ContactPhone, Address, Guardian, Department, AppointmentDate, Reason, Status, InsuranceType, TransferTicket) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)";
    db.query(sql, [userId, doctorName, patientName, dob, phone, address, guardian, department, appointmentDate, reason, insuranceType || 'None', transferTicket ? 1 : 0], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });

        db.query("SELECT * FROM Patients WHERE UserID = ? AND Name = ?", [userId, patientName], (err2, patRes) => {
            if (!err2 && patRes.length === 0) {
                db.query("INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian, HealthInsuranceID) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [patientName, dob, phone, address, userId, guardian || null, healthInsuranceID || null]);
            } else if (!err2 && patRes.length > 0) {
                db.query("UPDATE Patients SET DOB=?, Phone=?, Address=?, Guardian=?, HealthInsuranceID=? WHERE UserID=? AND Name=?",
                    [dob, phone, address, guardian || null, healthInsuranceID || null, userId, patientName]);
            }
        });
        writeAuditLog(userId, 'CREATE', 'Appointments', result.insertId, `Đặt lịch: ${patientName}`);
        return res.status(201).json({ message: 'Đặt lịch thành công!', appointmentId: result.insertId });
    });
});

// QUY TRÌNH 1 - LỄ TÂN TIẾP NHẬN VÃNG LAI
app.post('/api/reception/walk-in', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    const { patientName, dob, phone, healthInsuranceID, department, reason, isTransfer, insuranceType } = req.body;
    const userId = req.user.id;

    // Lấy số thứ tự trong ngày
    const today = new Date().toISOString().split('T')[0];
    db.query("SELECT COUNT(*) as cnt FROM Appointments WHERE DATE(AppointmentDate) = ?", [today], (err, countRes) => {
        if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });
        const queueNumber = (countRes[0].cnt || 0) + 1;

        const sql = "INSERT INTO Appointments (PatientID, PatientFullName, DOB, ContactPhone, Department, Reason, AppointmentDate, Status, InsuranceType, TransferTicket, QueueNumber) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Pending', ?, ?, ?)";
        db.query(sql, [userId, patientName, dob, phone, department, reason, insuranceType || 'None', isTransfer ? 1 : 0, queueNumber], (err, result) => {
            if (err) return res.status(500).json({ message: 'Lỗi DB: ' + err.message });

            // Tự động tạo/cập nhật hồ sơ bệnh nhân
            db.query("SELECT PatientID FROM Patients WHERE Phone = ?", [phone], (err2, patRes) => {
                if (!err2 && patRes.length === 0) {
                    db.query("INSERT INTO Patients (Name, DOB, Phone, HealthInsuranceID) VALUES (?, ?, ?, ?)",
                        [patientName, dob, phone, healthInsuranceID || null]);
                }
            });

            writeAuditLog(userId, 'CREATE', 'Appointments', result.insertId, `Lễ tân tiếp nhận vãng lai: ${patientName}`);
            return res.status(201).json({
                message: 'Cấp số thành công!',
                ticket: {
                    AppointmentID: result.insertId,
                    QueueNumber: queueNumber,
                    PatientName: patientName,
                    Department: department,
                    InsuranceType: insuranceType || 'None',
                    TransferTicket: isTransfer,
                    Time: new Date().toLocaleTimeString('vi-VN')
                }
            });
        });
    });
});

app.get('/api/records', authenticateToken, (req, res) => {
    let sql = "SELECT * FROM Appointments ORDER BY AppointmentDate DESC";
    let params = [];
    if (req.user.role === 'Patient') { sql = "SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC"; params = [req.user.id]; }
    else if (req.user.role === 'Doctor') { sql = "SELECT * FROM Appointments WHERE DoctorName = (SELECT Username FROM Users WHERE UserID = ?) ORDER BY AppointmentDate DESC"; params = [req.user.id]; }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.put('/api/appointments/:id/status', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Status = ? WHERE AppointmentID = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        writeAuditLog(req.user.id, 'UPDATE', 'Appointments', req.params.id, `Cập nhật trạng thái: ${req.body.status}`);
        return res.json({ message: "Thành công!" });
    });
});

app.put('/api/appointments/:id/room', authenticateToken, checkRole(['Nurse', 'Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Room = ? WHERE AppointmentID = ?", [req.body.room, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json({ message: "Thành công!" });
    });
});

app.delete('/api/appointments/:id', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("DELETE FROM Appointments WHERE AppointmentID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json({ message: "Đã xóa!" });
    });
});

// ==========================================
// 3. QUẢN LÝ BỆNH NHÂN
// ==========================================
app.get('/api/patients', authenticateToken, checkRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), (req, res) => {
    const syncQuery = `INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian)
        SELECT A.PatientFullName, MAX(A.DOB), MAX(A.ContactPhone), MAX(A.Address), A.PatientID, MAX(A.Guardian)
        FROM Appointments A WHERE A.PatientFullName IS NOT NULL AND A.PatientFullName != ''
        AND NOT EXISTS (SELECT 1 FROM Patients P WHERE P.UserID = A.PatientID AND P.Name = A.PatientFullName)
        GROUP BY A.PatientID, A.PatientFullName`;
    db.query(syncQuery, () => {
        const fetchQuery = `SELECT p.*,
            (SELECT InsuranceType FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS InsuranceType,
            (SELECT TransferTicket FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS TransferTicket,
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
        [req.body.Name, req.body.DOB, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            writeAuditLog(req.user.id, 'CREATE', 'Patients', result.insertId, `Tạo hồ sơ: ${req.body.Name}`);
            return res.status(201).json({ message: "Thêm thành công", PatientID: result.insertId });
        });
});

app.put('/api/patients/:id', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Patients SET Name=?, DOB=?, Address=?, Phone=?, HealthInsuranceID=?, Guardian=? WHERE PatientID=?",
        [req.body.Name, req.body.DOB, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            writeAuditLog(req.user.id, 'UPDATE', 'Patients', req.params.id, `Cập nhật hồ sơ bệnh nhân`);
            return res.json({ message: "Cập nhật thành công" });
        });
});

app.delete('/api/patients/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("DELETE FROM Patients WHERE PatientID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        writeAuditLog(req.user.id, 'DELETE', 'Patients', req.params.id, 'Xóa hồ sơ bệnh nhân');
        return res.json({ message: "Xóa thành công" });
    });
});

// ==========================================
// 4. BÁC SĨ - BỆNH ÁN ĐIỆN TỬ (QUY TRÌNH 2)
// ==========================================
app.get('/api/appointments/pending', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    let sql = `SELECT a.AppointmentID, a.PatientID, a.PatientFullName AS PatientName, a.AppointmentDate, 
               a.Reason, a.Department, a.InsuranceType, a.TransferTicket, a.QueueNumber
               FROM Appointments a WHERE a.Status = 'Pending' ORDER BY a.QueueNumber ASC, a.AppointmentDate ASC`;
    let params = [];
    if (req.user.role === 'Doctor') {
        sql = `SELECT a.AppointmentID, a.PatientID, a.PatientFullName AS PatientName, a.AppointmentDate, 
               a.Reason, a.Department, a.InsuranceType, a.TransferTicket, a.QueueNumber
               FROM Appointments a WHERE a.Status = 'Pending' AND a.DoctorName = (SELECT Username FROM Users WHERE UserID = ?)
               ORDER BY a.QueueNumber ASC`;
        params = [req.user.id];
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT mr.*, a.PatientFullName AS PatientName, a.AppointmentDate, a.DoctorName, a.InsuranceType, a.TransferTicket
              FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
              ORDER BY mr.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.post('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;
    db.query("SELECT PatientID FROM Appointments WHERE AppointmentID = ?", [AppointmentID], (err, appRes) => {
        if (err || appRes.length === 0) return res.status(500).json({ message: "Không tìm thấy lịch hẹn" });
        const realPatientID = appRes[0].PatientID;

        db.query("INSERT INTO MedicalRecords (PatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10) VALUES (?, ?, ?, ?, ?, ?)",
            [realPatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 || null],
            (errInsert, result) => {
                if (errInsert) return res.status(500).json({ message: "Lỗi DB: " + errInsert.message });
                db.query("UPDATE Appointments SET Status = 'Confirmed' WHERE AppointmentID = ?", [AppointmentID]);
                writeAuditLog(req.user.id, 'CREATE', 'MedicalRecords', result.insertId, `Tạo bệnh án ICD10: ${ICD10}`);
                return res.status(201).json({ message: "Tạo bệnh án thành công!", recordId: result.insertId });
            });
    });
});

app.put('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;
    db.query("UPDATE MedicalRecords SET Diagnosis=?, TreatmentPlan=?, Notes=?, ICD10=? WHERE RecordID=?",
        [Diagnosis, TreatmentPlan, Notes, ICD10 || null, req.params.id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            writeAuditLog(req.user.id, 'UPDATE', 'MedicalRecords', req.params.id, 'Cập nhật bệnh án');
            return res.json({ message: "Cập nhật thành công" });
        });
});

app.delete('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    db.query("UPDATE MedicalRecords SET Status = 'Cancelled' WHERE RecordID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        writeAuditLog(req.user.id, 'DELETE', 'MedicalRecords', req.params.id, 'Hủy bệnh án');
        return res.json({ message: "Đã hủy" });
    });
});

// ==========================================
// 5. ĐIỀU DƯỠNG - LIỆU TRÌNH YHCT (QUY TRÌNH 2)
// ==========================================
app.post('/api/treatments', authenticateToken, checkRole(['Doctor', 'Nurse']), (req, res) => {
    const { recordId, TechniqueType, Result, Notes, VitalSigns, StartTime, EndTime } = req.body;
    db.query("INSERT INTO TreatmentSessions (RecordID, NurseID, TechniqueType, SessionDate, Result, Notes, VitalSigns, StartTime, EndTime) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)",
        [recordId, req.user.id, TechniqueType, Result || '', Notes || '', JSON.stringify(VitalSigns || {}), StartTime || null, EndTime || null],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            writeAuditLog(req.user.id, 'CREATE', 'TreatmentSessions', result.insertId, `Thực hiện: ${TechniqueType}`);
            return res.json({ message: "Ghi nhận thành công", sessionId: result.insertId });
        });
});

app.get('/api/treatments/:recordId', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT ts.*, u.Username AS NurseName FROM TreatmentSessions ts JOIN Users u ON ts.NurseID = u.UserID WHERE ts.RecordID = ? ORDER BY ts.SessionDate DESC`,
        [req.params.recordId], (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json(results || []);
        });
});

// Lấy danh sách bệnh nhân cần thực hiện kỹ thuật (cho Điều dưỡng)
app.get('/api/nurse/worklist', authenticateToken, checkRole(['Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT mr.RecordID, a.PatientFullName AS PatientName, mr.TreatmentPlan, a.AppointmentDate, a.InsuranceType
              FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
              WHERE mr.Status != 'Cancelled' AND a.AppointmentDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              ORDER BY a.AppointmentDate DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

// ==========================================
// 6. THUỐC & KÊ ĐƠN
// ==========================================
app.get('/api/medicines', authenticateToken, (req, res) => {
    db.query("SELECT * FROM medicines WHERE StockQuantity > 0 ORDER BY MedicineName ASC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.get('/api/medicines/all', authenticateToken, (req, res) => {
    db.query("SELECT * FROM medicines ORDER BY MedicineName ASC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.get('/api/medicines/low-stock', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    db.query("SELECT * FROM medicines WHERE StockQuantity <= 50 ORDER BY StockQuantity ASC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.post('/api/medicines', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    const { MedicineName, Unit, StockQuantity, Price, Description, BatchNumber, ExpiryDate, IsBHYT } = req.body;
    db.query("INSERT INTO medicines (MedicineName, Unit, StockQuantity, Price, Description, BatchNumber, ExpiryDate, IsBHYT) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [MedicineName, Unit, StockQuantity, Price, Description, BatchNumber || null, ExpiryDate || null, IsBHYT ? 1 : 0],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            writeAuditLog(req.user.id, 'CREATE', 'medicines', result.insertId, `Nhập kho: ${MedicineName} - Lô: ${BatchNumber}`);
            return res.status(201).json({ message: "Nhập thuốc thành công" });
        });
});

app.put('/api/medicines/:id', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    const { MedicineName, Unit, StockQuantity, Price, Description, BatchNumber, ExpiryDate, IsBHYT } = req.body;
    db.query("UPDATE medicines SET MedicineName=?, Unit=?, StockQuantity=?, Price=?, Description=?, BatchNumber=?, ExpiryDate=?, IsBHYT=? WHERE MedicineID=?",
        [MedicineName, Unit, StockQuantity, Price, Description, BatchNumber || null, ExpiryDate || null, IsBHYT ? 1 : 0, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            writeAuditLog(req.user.id, 'UPDATE', 'medicines', req.params.id, `Cập nhật thuốc: ${MedicineName}`);
            return res.json({ message: "Cập nhật thành công" });
        });
});

app.delete('/api/medicines/:id', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    db.query("DELETE FROM medicines WHERE MedicineID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        writeAuditLog(req.user.id, 'DELETE', 'medicines', req.params.id, 'Xóa thuốc');
        return res.json({ message: "Xóa thuốc thành công" });
    });
});

// Kê đơn thuốc - KHÔNG trừ kho ngay, chỉ trừ khi Dược sĩ xác nhận cấp phát
app.post('/api/prescriptions', authenticateToken, checkRole(['Doctor', 'Admin']), async (req, res) => {
    const { recordId, prescriptionList } = req.body;
    if (!prescriptionList || prescriptionList.length === 0) return res.status(400).json({ message: "Đơn thuốc không được trống" });

    try {
        const promises = prescriptionList.map(item => new Promise((resolve, reject) => {
            db.query("INSERT INTO prescription_details (RecordID, MedicineID, Quantity, Dosage, Status) VALUES (?, ?, ?, ?, 'Pending')",
                [recordId, item.medicineId, item.quantity, item.dosage], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
        }));
        await Promise.all(promises);
        writeAuditLog(req.user.id, 'CREATE', 'prescription_details', recordId, `Kê ${prescriptionList.length} loại thuốc`);
        return res.status(201).json({ message: "Kê đơn thành công!" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi DB: " + error.message });
    }
});

app.get('/api/prescriptions/history', authenticateToken, checkRole(['Doctor', 'Pharmacist', 'Admin']), (req, res) => {
    db.query(`SELECT DISTINCT mr.RecordID, mr.Diagnosis, a.PatientFullName AS PatientName, 
              a.AppointmentDate, a.InsuranceType, a.TransferTicket,
              (SELECT pd2.Status FROM prescription_details pd2 WHERE pd2.RecordID = mr.RecordID LIMIT 1) AS PrescriptionStatus
              FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
              JOIN prescription_details pd ON mr.RecordID = pd.RecordID
              ORDER BY a.AppointmentDate DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.get('/api/prescriptions/details/:recordId', authenticateToken, (req, res) => {
    // FEFO: Sắp xếp theo hạn dùng gần nhất trước
    db.query(`SELECT pd.PrescriptionID, pd.Quantity, pd.Dosage, pd.Status,
              m.MedicineID, m.MedicineName, m.Unit, m.Price, m.BatchNumber, m.ExpiryDate, m.IsBHYT
              FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID
              WHERE pd.RecordID = ? ORDER BY m.ExpiryDate ASC`,
        [req.params.recordId], (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json(results);
        });
});

// Dược sĩ xác nhận cấp phát - mới trừ kho (FEFO)
app.post('/api/prescriptions/dispense/:recordId', authenticateToken, checkRole(['Pharmacist', 'Admin']), async (req, res) => {
    const { recordId } = req.params;

    db.query("SELECT pd.MedicineID, pd.Quantity FROM prescription_details pd WHERE pd.RecordID = ? AND pd.Status = 'Dispensed_Ready'",
        [recordId], async (err, items) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            if (items.length === 0) return res.status(400).json({ message: "Không có thuốc chờ cấp phát hoặc chưa thanh toán" });

            try {
                const deductPromises = items.map(item => new Promise((resolve, reject) => {
                    db.query("UPDATE medicines SET StockQuantity = StockQuantity - ? WHERE MedicineID = ? AND StockQuantity >= ?",
                        [item.Quantity, item.MedicineID, item.Quantity], (updErr, updRes) => {
                            if (updErr || updRes.affectedRows === 0) return reject(new Error(`Không đủ tồn kho cho MedicineID ${item.MedicineID}`));
                            resolve();
                        });
                }));
                await Promise.all(deductPromises);
                db.query("UPDATE prescription_details SET Status = 'Dispensed' WHERE RecordID = ?", [recordId]);
                writeAuditLog(req.user.id, 'DISPENSE', 'prescription_details', recordId, 'Xuất kho FEFO - Cấp phát thuốc');
                return res.json({ message: "Xuất kho và cấp phát thành công!" });
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        });
});

// ==========================================
// 7. VIỆN PHÍ & THANH TOÁN (QUY TRÌNH 3)
// ==========================================
app.get('/api/billing/pending', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT mr.RecordID, p.Name AS PatientName, mr.Diagnosis, mr.CreatedAt, a.InsuranceType, a.TransferTicket
              FROM medicalrecords mr JOIN patients p ON mr.PatientID = p.PatientID
              JOIN appointments a ON mr.AppointmentID = a.AppointmentID
              LEFT JOIN invoices i ON mr.RecordID = i.RecordID
              WHERE i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid'
              ORDER BY mr.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.get('/api/billing/preview/:recordId', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId } = req.params;
    const sql = `SELECT m.MedicineName, pd.Quantity, m.Price, (pd.Quantity * m.Price) AS SubTotal,
                 a.InsuranceType, a.TransferTicket, m.IsBHYT, m.BatchNumber, m.ExpiryDate
                 FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID
                 JOIN medicalrecords mr ON pd.RecordID = mr.RecordID
                 JOIN appointments a ON mr.AppointmentID = a.AppointmentID
                 WHERE pd.RecordID = ? AND pd.Status = 'Pending'`;

    db.query(sql, [recordId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });

        const getInsuranceInfo = (cb) => {
            if (results.length > 0) return cb(results[0].InsuranceType, results[0].TransferTicket);
            db.query(`SELECT a.InsuranceType, a.TransferTicket FROM medicalrecords mr JOIN appointments a ON mr.AppointmentID = a.AppointmentID WHERE mr.RecordID = ?`,
                [recordId], (e, r) => cb(r?.[0]?.InsuranceType || 'None', r?.[0]?.TransferTicket || 0));
        };

        getInsuranceInfo((insuranceType, transferTicket) => {
            const isK3Free = insuranceType === 'K3' && transferTicket === 1;
            const medicineTotal = results.reduce((sum, item) => sum + parseFloat(item.SubTotal || 0), 0);
            const examFee = 50000;

            // Tính mức hưởng BHYT
            let bhytRate = 0;
            if (insuranceType === 'K3' && transferTicket === 1) bhytRate = 100;
            else if (insuranceType === 'K2') bhytRate = 80;
            else if (insuranceType === 'K1') bhytRate = 70;

            const bhytCovers = ((examFee + medicineTotal) * bhytRate) / 100;
            const patientPays = isK3Free ? 0 : (examFee + medicineTotal) - bhytCovers;

            return res.json({
                details: results,
                examFee,
                medicineTotal,
                InsuranceType: insuranceType,
                TransferTicket: transferTicket,
                isK3Free,
                bhytRate,
                bhytCovers,
                finalAmount: patientPays
            });
        });
    });
});

app.post('/api/invoices', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId, examFee, medicineTotal, totalAmount, paymentMethod, details } = req.body;

    db.query("SELECT InvoiceID FROM invoices WHERE RecordID = ? AND PaymentStatus = 'Paid'", [recordId], (checkErr, checkRes) => {
        if (checkErr) return res.status(500).json({ message: "Lỗi DB" });
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

                // Đánh dấu đơn thuốc sẵn sàng để Dược sĩ xuất kho
                db.query("UPDATE prescription_details SET Status = 'Dispensed_Ready' WHERE RecordID = ?", [recordId]);
                writeAuditLog(req.user.id, 'CREATE', 'invoices', invoiceId, `Thanh toán ${totalAmount}đ - ${paymentMethod}`);
                return res.status(201).json({ message: "Thanh toán thành công!", invoiceId });
            });
    });
});

app.get('/api/invoices/paid', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT i.*, p.Name AS PatientName, a.InsuranceType, a.TransferTicket
              FROM invoices i JOIN medicalrecords mr ON i.RecordID = mr.RecordID
              JOIN patients p ON mr.PatientID = p.PatientID
              JOIN appointments a ON mr.AppointmentID = a.AppointmentID
              WHERE i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

app.post('/api/invoices/cancel/:id', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { cancelReason } = req.body;
    db.query("SELECT RecordID FROM invoices WHERE InvoiceID = ?", [req.params.id], (err, invRes) => {
        if (err || invRes.length === 0) return res.status(500).json({ message: "Không tìm thấy hóa đơn" });
        const recordId = invRes[0].RecordID;

        db.query("UPDATE invoices SET PaymentStatus = 'Unpaid', CancelReason = ? WHERE InvoiceID = ?", [cancelReason, req.params.id]);
        db.query("UPDATE prescription_details SET Status = 'Pending' WHERE RecordID = ?", [recordId]);
        writeAuditLog(req.user.id, 'CANCEL', 'invoices', req.params.id, `Lý do: ${cancelReason}`);
        return res.json({ message: "Đã hủy hóa đơn!" });
    });
});

// Dành cho Dược sĩ - chỉ lấy đơn đã thanh toán (Dispensed_Ready)
app.get('/api/pharmacy/ready-to-dispense', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    db.query(`SELECT DISTINCT mr.RecordID, mr.Diagnosis, a.PatientFullName AS PatientName,
              a.AppointmentDate, a.InsuranceType, a.TransferTicket, i.InvoiceID, i.TotalAmount
              FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
              JOIN prescription_details pd ON mr.RecordID = pd.RecordID
              JOIN invoices i ON mr.RecordID = i.RecordID
              WHERE pd.Status = 'Dispensed_Ready' AND i.PaymentStatus = 'Paid'
              ORDER BY a.AppointmentDate DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results);
    });
});

// ==========================================
// 8. BỆNH NHÂN XEM HỒ SƠ
// ==========================================
app.get('/api/patient/full-history', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;
    const sqlRecords = `SELECT mr.RecordID, mr.Diagnosis, mr.TreatmentPlan, mr.Notes, mr.Status,
                        a.AppointmentDate, a.DoctorName, a.PatientFullName, a.InsuranceType, a.TransferTicket
                        FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
                        WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;
    const sqlInvoices = `SELECT i.InvoiceID, i.TotalAmount, i.PaymentMethod, i.CreatedAt, mr.Diagnosis, a.PatientFullName
                         FROM invoices i JOIN medicalrecords mr ON i.RecordID = mr.RecordID
                         JOIN Appointments a ON mr.AppointmentID = a.AppointmentID
                         WHERE a.PatientID = ? AND i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`;
    const sqlTreatments = `SELECT ts.TechniqueType, ts.SessionDate, ts.Result, ts.VitalSigns, u.Username AS NurseName
                           FROM TreatmentSessions ts JOIN Appointments a ON ts.RecordID IN
                           (SELECT RecordID FROM MedicalRecords WHERE AppointmentID = a.AppointmentID)
                           JOIN Users u ON ts.NurseID = u.UserID
                           WHERE a.PatientID = ? ORDER BY ts.SessionDate DESC LIMIT 20`;

    db.query(sqlRecords, [userId], (err, records) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query(sqlInvoices, [userId], (err, invoices) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            db.query("SELECT pd.RecordID, m.MedicineName, pd.Quantity, pd.Dosage FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID WHERE pd.RecordID IN (SELECT RecordID FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID WHERE a.PatientID = ?)", [userId], (err, meds) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                const recordsWithMeds = (records || []).map(rec => ({
                    ...rec,
                    prescriptions: (meds || []).filter(m => m.RecordID === rec.RecordID)
                }));
                return res.json({ records: recordsWithMeds, invoices: invoices || [] });
            });
        });
    });
});

app.get('/api/patient/dashboard', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;
    const sqlUpcoming = `SELECT * FROM Appointments WHERE PatientID = ? AND AppointmentDate >= CURDATE() AND Status != 'Cancelled' ORDER BY AppointmentDate ASC`;
    const sqlHistory = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.DoctorName, a.PatientFullName, a.InsuranceType
                        FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;

    db.query(sqlUpcoming, [userId], (err, upcoming) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query(sqlHistory, [userId], (err, history) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json({ upcoming: upcoming || [], history: history || [] });
        });
    });
});

app.get('/api/patient/appointments', authenticateToken, checkRole(['Patient']), (req, res) => {
    db.query(`SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC`, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json(results || []);
    });
});

app.put('/api/patient/appointments/:id', authenticateToken, checkRole(['Patient']), (req, res) => {
    const { patientName, dob, phone, address, guardian, department, appointmentDate, reason } = req.body;
    db.query("UPDATE Appointments SET PatientFullName=?, DOB=?, ContactPhone=?, Address=?, Guardian=?, Department=?, AppointmentDate=?, Reason=? WHERE AppointmentID=? AND PatientID=? AND Status='Pending'",
        [patientName, dob, phone, address, guardian, department, appointmentDate, reason, req.params.id, req.user.id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json({ message: "Cập nhật thành công" });
        });
});

app.delete('/api/patient/appointments/:id', authenticateToken, checkRole(['Patient']), (req, res) => {
    db.query("DELETE FROM Appointments WHERE AppointmentID=? AND PatientID=? AND Status='Pending'", [req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        return res.json({ message: "Đã hủy lịch" });
    });
});

// ==========================================
// 9. BÁO CÁO & THỐNG KÊ
// ==========================================
app.get('/api/reports/chart-revenue', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    db.query(`SELECT DATE_FORMAT(CreatedAt, '%d/%m') as date, SUM(TotalAmount) as revenue FROM invoices WHERE PaymentStatus = 'Paid' GROUP BY DATE(CreatedAt) ORDER BY DATE(CreatedAt) DESC LIMIT 7`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json(results.reverse());
        });
});

app.get('/api/reports/chart-medicines', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    db.query(`SELECT MedicineName, SUM(Quantity) as total_sold FROM invoice_details GROUP BY MedicineName ORDER BY total_sold DESC LIMIT 5`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json(results);
        });
});

app.get('/api/reports/revenue', authenticateToken, checkRole(['Admin', 'Cashier', 'Pharmacist']), (req, res) => {
    db.query("SELECT InvoiceID, TotalAmount, CreatedAt, PaymentMethod FROM invoices WHERE PaymentStatus = 'Paid' ORDER BY CreatedAt DESC",
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            return res.json(results);
        });
});

// ==========================================
// 10. ADMIN - QUẢN LÝ NGƯỜI DÙNG & AUDIT LOG
// ==========================================
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    let apptSql = "SELECT COUNT(*) AS count FROM Appointments";
    let apptParams = [];
    if (req.user.role === 'Patient') { apptSql += " WHERE PatientID = ?"; apptParams.push(req.user.id); }
    else if (req.user.role === 'Doctor') { apptSql += " WHERE DoctorName = (SELECT Username FROM Users WHERE UserID = ?)"; apptParams.push(req.user.id); }

    db.query(apptSql, apptParams, (err, apptRes) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query("SELECT COUNT(*) AS count FROM Users WHERE Role = 'Patient'", (err, patRes) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            db.query("SELECT COUNT(*) AS count FROM Users WHERE Role = 'Doctor'", (err, docRes) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                return res.json({
                    appointments: apptRes[0]?.count || 0,
                    patients: patRes[0]?.count || 0,
                    doctors: docRes[0]?.count || 0
                });
            });
        });
    });
});

app.get('/api/admin/users-count', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("SELECT Role, COUNT(*) as count FROM Users GROUP BY Role", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        let stats = { Patient: 0, Doctor: 0, Nurse: 0, Receptionist: 0, Pharmacist: 0, Cashier: 0, Admin: 0 };
        results.forEach(row => { if (stats[row.Role] !== undefined) stats[row.Role] = row.count; });
        return res.json(stats);
    });
});

app.get('/api/admin/staff', authenticateToken, checkRole(['Admin', 'Nurse']), (req, res) => {
    db.query("SELECT UserID, Username, Role, Room FROM Users WHERE Role IN ('Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Cashier') ORDER BY Role, Username",
        (err, results) => {
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
                writeAuditLog(req.user.id, 'UPDATE', 'Users', req.params.id, `Đổi role -> ${role} + reset mật khẩu`);
                return res.json({ message: "Cập nhật thành công" });
            });
        });
    } else {
        db.query("UPDATE Users SET Role = ? WHERE UserID = ?", [role, req.params.id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            writeAuditLog(req.user.id, 'UPDATE', 'Users', req.params.id, `Đổi role -> ${role}`);
            return res.json({ message: "Cập nhật quyền thành công" });
        });
    }
});

app.delete('/api/admin/users-list/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("DELETE FROM Users WHERE UserID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Không thể xóa do ràng buộc dữ liệu." });
        writeAuditLog(req.user.id, 'DELETE', 'Users', req.params.id, 'Xóa tài khoản');
        return res.json({ message: "Đã xóa User" });
    });
});

// Audit Log - chỉ Admin xem
app.get('/api/admin/audit-logs', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query(`SELECT al.*, u.Username FROM AuditLogs al LEFT JOIN Users u ON al.UserID = u.UserID ORDER BY al.CreatedAt DESC LIMIT 200`,
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB - Cần tạo bảng AuditLogs" });
            return res.json(results);
        });
});

app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));