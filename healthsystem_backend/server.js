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
    
    const sqlAppt = "INSERT INTO Appointments (PatientID, DoctorName, PatientFullName, DOB, ContactPhone, Address, Guardian, Department, AppointmentDate, Reason, Status, InsuranceType, TransferTicket) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)";
    
    db.query(sqlAppt, [userId, doctorName, patientName, dob, phone, address, guardian, department, appointmentDate, reason, insuranceType || 'None', transferTicket ? 1 : 0], (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi CSDL khi tạo lịch hẹn: ' + err.message });
        
        db.query("SELECT * FROM Patients WHERE UserID = ? AND Name = ?", [userId, patientName], (err2, patRes) => {
            if (!err2 && patRes.length === 0) {
                db.query("INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian, HealthInsuranceID) VALUES (?, ?, ?, ?, ?, ?, ?)", [patientName, dob, phone, address, userId, guardian || null, healthInsuranceID || null]);
            } else if (!err2 && patRes.length > 0) {
                db.query("UPDATE Patients SET DOB=?, Phone=?, Address=?, Guardian=?, HealthInsuranceID=? WHERE UserID=? AND Name=?", [dob, phone, address, guardian || null, healthInsuranceID || null, userId, patientName]);
            }
        });
        return res.status(201).json({ message: 'Đặt lịch thành công!', appointmentId: result.insertId });
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

app.put('/api/appointments/:id/status', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Appointments SET Status = ? WHERE AppointmentID = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Thành công!" });
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
// 3. API QUẢN LÝ BỆNH NHÂN
// ==========================================
app.get('/api/patients', authenticateToken, checkRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), (req, res) => {
    const syncQuery = `INSERT INTO Patients (Name, DOB, Phone, Address, UserID, Guardian) SELECT A.PatientFullName, MAX(A.DOB), MAX(A.ContactPhone), MAX(A.Address), A.PatientID, MAX(A.Guardian) FROM Appointments A WHERE A.PatientFullName IS NOT NULL AND A.PatientFullName != '' AND NOT EXISTS (SELECT 1 FROM Patients P WHERE P.UserID = A.PatientID AND P.Name = A.PatientFullName) GROUP BY A.PatientID, A.PatientFullName`;
    db.query(syncQuery, (syncErr) => {
        const fetchQuery = `SELECT p.*, (SELECT Reason FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS Reason, (SELECT Department FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS Department, (SELECT DoctorName FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS DoctorName, (SELECT AppointmentDate FROM Appointments a WHERE a.PatientFullName = p.Name AND a.PatientID = p.UserID ORDER BY AppointmentDate DESC LIMIT 1) AS AppointmentDate FROM Patients p ORDER BY p.CreatedAt DESC`;
        db.query(fetchQuery, (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            return res.json(results);
        });
    });
});

app.post('/api/patients', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("INSERT INTO Patients (Name, DOB, Address, Phone, HealthInsuranceID, Guardian, UserID, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())", [req.body.Name, req.body.DOB, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.user.id], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.status(201).json({ message: "Thêm thành công", PatientID: result.insertId });
    });
});

app.put('/api/patients/:id', authenticateToken, checkRole(['Receptionist', 'Admin']), (req, res) => {
    db.query("UPDATE Patients SET Name=?, DOB=?, Address=?, Phone=?, HealthInsuranceID=?, Guardian=? WHERE PatientID=?", [req.body.Name, req.body.DOB, req.body.Address, req.body.Phone, req.body.HealthInsuranceID, req.body.Guardian, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Cập nhật thành công" });
    });
});

app.delete('/api/patients/:id', authenticateToken, checkRole(['Admin']), (req, res) => {
    db.query("DELETE FROM Patients WHERE PatientID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Xóa thành công" });
    });
});

// ==========================================
// 4. API CHUYÊN MÔN BÁC SĨ & LIỆU TRÌNH
// ==========================================
app.get('/api/appointments/pending', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    let sql = "SELECT AppointmentID, PatientID, PatientFullName AS PatientName, AppointmentDate, Reason FROM Appointments WHERE Status = 'Pending'";
    let params = [];
    if (req.user.role === 'Doctor') {
        sql += " AND DoctorName = (SELECT Username FROM Users WHERE UserID = ?)";
        params.push(req.user.id);
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT mr.*, a.PatientFullName AS PatientName, a.AppointmentDate, a.DoctorName FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID ORDER BY mr.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.post('/api/medical-records', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { PatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;
    db.query("SELECT PatientID FROM Appointments WHERE AppointmentID = ?", [AppointmentID], (err, appRes) => {
        if (err || appRes.length === 0) return res.status(500).json({ message: "Lỗi tìm lịch hẹn: " + (err ? err.message : '') });
        const realPatientID = appRes[0].PatientID;
        
        db.query("INSERT INTO MedicalRecords (PatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10) VALUES (?, ?, ?, ?, ?, ?)", [realPatientID, AppointmentID, Diagnosis, TreatmentPlan, Notes, ICD10 || null], (errInsert, result) => {
            if (errInsert) return res.status(500).json({ message: "Lỗi DB: " + errInsert.message });
            
            db.query("UPDATE Appointments SET Status = 'Confirmed' WHERE AppointmentID = ?", [AppointmentID]);
            return res.status(201).json({ message: "Tạo bệnh án thành công!", recordId: result.insertId });
        });
    });
});

app.put('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    const { Diagnosis, TreatmentPlan, Notes, ICD10 } = req.body;
    db.query("UPDATE MedicalRecords SET Diagnosis=?, TreatmentPlan=?, Notes=?, ICD10=? WHERE RecordID=?", [Diagnosis, TreatmentPlan, Notes, ICD10 || null, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Cập nhật thành công" });
    });
});

app.delete('/api/medical-records/:id', authenticateToken, checkRole(['Doctor', 'Admin']), (req, res) => {
    db.query("UPDATE MedicalRecords SET Status = 'Cancelled' WHERE RecordID = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã hủy" });
    });
});

app.post('/api/treatments', authenticateToken, checkRole(['Doctor', 'Nurse']), (req, res) => {
    const { recordId, TechniqueType, Result, Notes } = req.body;
    db.query("INSERT INTO TreatmentSessions (RecordID, NurseID, TechniqueType, SessionDate, Result, Notes) VALUES (?, ?, ?, NOW(), ?, ?)", [recordId, req.user.id, TechniqueType, Result, Notes], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Ghi nhận thành công" });
    });
});

app.get('/api/treatments/:recordId', authenticateToken, checkRole(['Doctor', 'Nurse', 'Admin']), (req, res) => {
    db.query(`SELECT ts.*, u.Username AS NurseName FROM TreatmentSessions ts JOIN Users u ON ts.NurseID = u.UserID WHERE ts.RecordID = ? ORDER BY ts.SessionDate DESC`, [req.params.recordId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results || []);
    });
});

// ==========================================
// 5. API QUẢN LÝ THUỐC & KÊ ĐƠN
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
    db.query("INSERT INTO medicines (MedicineName, Unit, StockQuantity, Price, Description) VALUES (?, ?, ?, ?, ?)", [MedicineName, Unit, StockQuantity, Price, Description], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.status(201).json({ message: "Nhập thuốc thành công" });
    });
});

app.put('/api/medicines/:id', authenticateToken, checkRole(['Pharmacist', 'Admin']), (req, res) => {
    const { MedicineName, Unit, StockQuantity, Price, Description } = req.body;
    db.query("UPDATE medicines SET MedicineName=?, Unit=?, StockQuantity=?, Price=?, Description=? WHERE MedicineID=?", [MedicineName, Unit, StockQuantity, Price, Description, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Cập nhật thành công" });
    });
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
                db.query("INSERT INTO prescription_details (RecordID, MedicineID, Quantity, Dosage, Status) VALUES (?, ?, ?, ?, 'Pending')", [recordId, item.medicineId, item.quantity, item.dosage], (err) => {
                    if (err) return reject(err);
                    db.query("UPDATE medicines SET StockQuantity = StockQuantity - ? WHERE MedicineID = ?", [item.quantity, item.medicineId], (updErr) => {
                        if (updErr) return reject(updErr);
                        resolve();
                    });
                });
            });
        });
        await Promise.all(promises);
        return res.status(201).json({ message: "Kê đơn thành công!" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi DB: " + (error.message || "Không thể kê đơn") });
    }
});

app.get('/api/prescriptions/history', authenticateToken, checkRole(['Doctor', 'Pharmacist', 'Admin']), (req, res) => {
    db.query(`SELECT DISTINCT mr.RecordID, mr.Diagnosis, a.PatientFullName AS PatientName, a.AppointmentDate FROM MedicalRecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID JOIN prescription_details pd ON mr.RecordID = pd.RecordID ORDER BY a.AppointmentDate DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/prescriptions/details/:recordId', authenticateToken, (req, res) => {
    db.query(`SELECT pd.Quantity, pd.Dosage, m.MedicineName, m.Unit FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID WHERE pd.RecordID = ?`, [req.params.recordId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

// ==========================================
// 6. API VIỆN PHÍ & THANH TOÁN
// ==========================================
app.get('/api/billing/pending', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT mr.RecordID, p.Name AS PatientName, mr.Diagnosis, mr.CreatedAt FROM medicalrecords mr JOIN patients p ON mr.PatientID = p.PatientID LEFT JOIN invoices i ON mr.RecordID = i.RecordID WHERE i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid' ORDER BY mr.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.get('/api/billing/preview/:recordId', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId } = req.params;
    const sqlCalculate = `SELECT m.MedicineName, pd.Quantity, m.Price, (pd.Quantity * m.Price) AS SubTotal, a.InsuranceType, a.TransferTicket 
                          FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID 
                          JOIN medicalrecords mr ON pd.RecordID = mr.RecordID
                          JOIN appointments a ON mr.AppointmentID = a.AppointmentID
                          WHERE pd.RecordID = ? AND pd.Status = 'Pending'`;
                          
    db.query(sqlCalculate, [recordId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        
        if (results.length === 0) {
            db.query(`SELECT a.InsuranceType, a.TransferTicket FROM medicalrecords mr JOIN appointments a ON mr.AppointmentID = a.AppointmentID WHERE mr.RecordID = ?`, [recordId], (err2, res2) => {
                 if (err2 || res2.length === 0) {
                     return res.json({ details: [], examFee: 50000, medicineTotal: 0, InsuranceType: 'None', TransferTicket: 0 });
                 }
                 return res.json({ details: [], examFee: 50000, medicineTotal: 0, InsuranceType: res2[0].InsuranceType, TransferTicket: res2[0].TransferTicket });
            });
            return; 
        }

        const medicineTotal = results.reduce((sum, item) => sum + parseFloat(item.SubTotal || 0), 0);
        return res.json({ details: results, examFee: 50000, medicineTotal: medicineTotal, InsuranceType: results[0].InsuranceType, TransferTicket: results[0].TransferTicket });
    });
});

app.post('/api/invoices', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { recordId, examFee, medicineTotal, totalAmount, paymentMethod, details } = req.body;
    
    db.query("SELECT InvoiceID FROM invoices WHERE RecordID = ? AND PaymentStatus = 'Paid'", [recordId], (checkErr, checkRes) => {
        if (checkErr) return res.status(500).json({ message: "Lỗi DB: " + checkErr.message });
        if (checkRes.length > 0) return res.status(400).json({ message: "Bệnh án này đã được thanh toán" });
        
        const sqlInsert = "INSERT INTO invoices (RecordID, ExamFee, MedicineTotal, TotalAmount, PaymentMethod, PaymentStatus) VALUES (?, ?, ?, ?, ?, 'Paid')";
        db.query(sqlInsert, [recordId, examFee, medicineTotal, totalAmount, paymentMethod], (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
            const invoiceId = result.insertId;

            if (details && details.length > 0) {
                details.forEach(item => {
                    db.query("INSERT INTO invoice_details (InvoiceID, MedicineName, Quantity, PriceAtTime, SubTotal) VALUES (?, ?, ?, ?, ?)", [invoiceId, item.MedicineName, item.Quantity, item.Price, item.SubTotal]);
                });
            }

            db.query("UPDATE prescription_details SET Status = 'Dispensed' WHERE RecordID = ?", [recordId]);
            return res.status(201).json({ message: "Thanh toán thành công!", invoiceId });
        });
    });
});

app.get('/api/invoices/paid', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    db.query(`SELECT i.*, p.Name AS PatientName FROM invoices i JOIN medicalrecords mr ON i.RecordID = mr.RecordID JOIN patients p ON mr.PatientID = p.PatientID WHERE i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`, (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json(results);
    });
});

app.post('/api/invoices/cancel/:id', authenticateToken, checkRole(['Cashier', 'Admin']), (req, res) => {
    const { cancelReason } = req.body;
    db.query("SELECT RecordID FROM invoices WHERE InvoiceID = ?", [req.params.id], (err, invRes) => {
        if (err || invRes.length === 0) return res.status(500).json({ message: "Lỗi tìm hóa đơn: " + (err ? err.message : '') });
        const recordId = invRes[0].RecordID;

        db.query("UPDATE invoices SET PaymentStatus = 'Unpaid', CancelReason = ? WHERE InvoiceID = ?", [cancelReason, req.params.id]);

        db.query("SELECT MedicineID, Quantity FROM prescription_details WHERE RecordID = ?", [recordId], (err, meds) => {
            if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });

            const restockPromises = meds.map(med => {
                return new Promise((resolve) => {
                    db.query("UPDATE medicines SET StockQuantity = StockQuantity + ? WHERE MedicineID = ?", [med.Quantity, med.MedicineID], () => resolve());
                });
            });

            Promise.all(restockPromises).then(() => {
                db.query("UPDATE prescription_details SET Status = 'Cancelled' WHERE RecordID = ?", [recordId]);
                return res.json({ message: "Đã hủy hóa đơn và hoàn lại thuốc vào kho!" });
            });
        });
    });
});

// ==========================================
// 7. API BỆNH NHÂN XEM HỒ SƠ VÀ QUẢN LÝ LỊCH
// ==========================================
app.get('/api/patient/full-history', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;

    const sqlDebt = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.DoctorName, a.PatientFullName FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID LEFT JOIN invoices i ON mr.RecordID = i.RecordID WHERE a.PatientID = ? AND (i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid') ORDER BY a.AppointmentDate DESC`;
    const sqlRecords = `SELECT mr.RecordID, mr.Diagnosis, mr.TreatmentPlan, mr.Notes, mr.Status, a.AppointmentDate, a.DoctorName, a.PatientFullName FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;
    const sqlInvoices = `SELECT i.InvoiceID, i.TotalAmount, i.PaymentMethod, i.CreatedAt, mr.Diagnosis, a.PatientFullName FROM invoices i JOIN medicalrecords mr ON i.RecordID = mr.RecordID JOIN Appointments a ON mr.AppointmentID = a.AppointmentID WHERE a.PatientID = ? AND i.PaymentStatus = 'Paid' ORDER BY i.CreatedAt DESC`;
    const sqlAppointments = `SELECT * FROM Appointments WHERE PatientID = ? ORDER BY AppointmentDate DESC`;

    db.query(sqlDebt, [userId], (err, debts) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        db.query(sqlRecords, [userId], (err, records) => {
            if (err) return res.status(500).json({ message: "Lỗi DB" });
            db.query(sqlInvoices, [userId], (err, invoices) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                db.query(sqlAppointments, [userId], (err, appointments) => {
                    if (err) return res.status(500).json({ message: "Lỗi DB" });
                    db.query("SELECT pd.RecordID, m.MedicineName, pd.Quantity, pd.Dosage FROM prescription_details pd JOIN medicines m ON pd.MedicineID = m.MedicineID", (err, meds) => {
                        if (err) return res.status(500).json({ message: "Lỗi DB" });
                        
                        const safeRecords = records || [];
                        const safeMeds = meds || [];

                        const recordsWithMeds = safeRecords.map(rec => ({
                            ...rec,
                            prescriptions: safeMeds.filter(m => m.RecordID === rec.RecordID)
                        }));
                        
                        return res.json({ 
                            debts: debts || [], 
                            records: recordsWithMeds, 
                            invoices: invoices || [],
                            appointments: appointments || [] 
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/patient/dashboard', authenticateToken, checkRole(['Patient']), (req, res) => {
    const userId = req.user.id;
    const sqlDebt = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.PatientFullName FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID LEFT JOIN invoices i ON mr.RecordID = i.RecordID WHERE a.PatientID = ? AND (i.InvoiceID IS NULL OR i.PaymentStatus = 'Unpaid') ORDER BY a.AppointmentDate DESC`;
    const sqlUpcoming = `SELECT * FROM Appointments WHERE PatientID = ? AND AppointmentDate >= CURDATE() AND Status != 'Cancelled' ORDER BY AppointmentDate ASC`;
    const sqlHistory = `SELECT mr.RecordID, mr.Diagnosis, a.AppointmentDate, a.DoctorName, a.PatientFullName FROM medicalrecords mr JOIN Appointments a ON mr.AppointmentID = a.AppointmentID WHERE a.PatientID = ? ORDER BY a.AppointmentDate DESC`;

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
    [patientName, dob, phone, address, guardian, department, appointmentDate, reason, req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Cập nhật thành công" });
    });
});

app.delete('/api/patient/appointments/:id', authenticateToken, checkRole(['Patient']), (req, res) => {
    db.query("DELETE FROM Appointments WHERE AppointmentID=? AND PatientID=? AND Status='Pending'", [req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi DB: " + err.message });
        return res.json({ message: "Đã hủy lịch" });
    });
});

// ==========================================
// 8. API DASHBOARD BIỂU ĐỒ (ADVANCED REPORT)
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
// 9. API ADMIN DASHBOARD & QUẢN LÝ USER
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
    const { username, password, role } = req.body;
    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ message: "Lỗi mã hóa" });
            db.query("UPDATE Users SET Role = ?, Password = ? WHERE UserID = ?", [role, hash, req.params.id], (err) => {
                if (err) return res.status(500).json({ message: "Lỗi DB" });
                return res.json({ message: "Cập nhật full thành công" });
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