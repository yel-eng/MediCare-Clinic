// تكوين Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
    authDomain: "mydoctor-clinic.firebaseapp.com",
    projectId: "mydoctor-clinic",
    storageBucket: "mydoctor-clinic.appspot.com",
    messagingSenderId: "996532645974",
    appId: "1:996532645974:web:bfc3e6a61bdc7f04a24bf7"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

let allAvailableSlots = [];

function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ==========================================
// وظائف صفحة الحجز (المحسنة)
// ==========================================

function loadBookingDays() {
    const daySelect = document.getElementById("daySelect");
    if (!daySelect) return;

    let today = getLocalDateString(new Date());

    // الاستماع للمواعيد غير المحجوزة فقط ومن تاريخ اليوم وصاعداً
    db.collection("slots")
      .where("date", ">=", today)
      .where("booked", "==", false)
      .onSnapshot(snap => {
        allAvailableSlots = [];
        let daysMap = new Map(); // استخدام Map لترتيب الأيام بشكل أفضل
        
        if (snap.empty) {
            daySelect.innerHTML = '<option value="">لا توجد مواعيد متاحة حالياً</option>';
            return;
        }

        snap.forEach(doc => {
            let s = doc.data();
            allAvailableSlots.push({id: doc.id, ...s});
            daysMap.set(s.date, s.date);
        });

        daySelect.innerHTML = '<option value="">اختر اليوم المناسب...</option>';
        
        // ترتيب الأيام زمنياً
        let sortedDates = Array.from(daysMap.keys()).sort();
        
        sortedDates.forEach(date => {
            let dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            daySelect.innerHTML += `<option value="${date}">${dayName} (${date})</option>`;
        });
    }, error => {
        console.error("Error fetching slots:", error);
        daySelect.innerHTML = '<option value="">خطأ في تحميل البيانات</option>';
    });
}

function updateAvailableTimes() {
    const selectedDate = document.getElementById("daySelect").value;
    const slotsSelect = document.getElementById("slotsSelect");
    const timeGroup = document.getElementById("timeSlotGroup");

    if (!selectedDate) {
        timeGroup.style.display = "none";
        return;
    }

    // فلترة المواعيد بناءً على اليوم المختار وترتيبها بالساعة
    let filtered = allAvailableSlots
        .filter(s => s.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time));

    slotsSelect.innerHTML = '<option value="">اختر الساعة...</option>';
    
    if (filtered.length === 0) {
        slotsSelect.innerHTML = '<option value="">عفواً، اكتملت حجوزات هذا اليوم</option>';
    } else {
        filtered.forEach(slot => {
            slotsSelect.innerHTML += `<option value="${slot.id}">${slot.time}</option>`;
        });
    }

    timeGroup.style.display = "block";
}

async function book() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) {
        return alert("يرجى التأكد من كتابة الاسم ورقم الهاتف واختيار الموعد");
    }

    // تعطيل الزر لمنع الضغط المتكرر
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "جاري التأكيد...";

    try {
        await db.collection("slots").doc(slotId).update({
            booked: true,
            status: "pending",
            patient: {
                name: name,
                phone: phone,
                note: "حجز عبر الموقع"
            }
        });
        
        alert(`تم الحجز بنجاح يا ${name}!\nسنقوم بالتواصل معك عبر رقم: ${phone}`);
        location.reload();
    } catch (e) {
        console.error("Booking error:", e);
        alert("حدث خطأ، ربما سبقك شخص آخر لحجز هذا الموعد. حاول اختيار وقت آخر.");
        btn.disabled = false;
        btn.innerText = "تأكيد الحجز المسبق ⚡";
    }
}

// ==========================================
// وظائف لوحة التحكم (تأكدي من وجودها)
// ==========================================

function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startDateInput = document.getElementById("startDatePicker");
    let start = (startDateInput && startDateInput.value) ? new Date(startDateInput.value) : new Date();
    
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        let dateStr = getLocalDateString(current);
        let dayName = current.toLocaleDateString('ar-EG', { weekday: 'long' });
        
        grid.innerHTML += `
            <div class="day-setup-row card" data-date="${dateStr}">
                <b>${dayName}</b><br><small>${dateStr}</small>
                <div style="margin-top:10px; display:flex; flex-direction:column; gap:5px;">
                    <input type="time" class="start-t" title="من">
                    <input type="time" class="end-t" title="إلى">
                </div>
            </div>`;
    }
}

// استدعاء الوظائف عند التحميل
window.onload = () => {
    if (document.getElementById("daySelect")) {
        loadBookingDays();
    } 
    if (document.getElementById("slotsContainer")) {
        setupWeekUI();
        loadAdminSlots(); // تأكدي أن دالة loadAdminSlots موجودة تحت في ملفك
    }
};

// ... (باقي دوال الإدارة loadAdminSlots و deleteDay وغيرها كما هي في كودك الأصلي)
