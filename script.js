function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  localStorage.setItem("name", name);
  localStorage.setItem("phone", phone);
  localStorage.setItem("date", date);
  localStorage.setItem("time", time);

  // WhatsApp Auto Message
  let msg = `مرحبا، أريد حجز موعد:\nالاسم: ${name}\nالهاتف: ${phone}\nالتاريخ: ${date}\nالوقت: ${time}`;

  window.open(`https://wa.me/201227630041?text=${encodeURIComponent(msg)}`);

  window.location.href = "confirm.html";
}
function openReviewForm() {
  document.getElementById("reviewBox").style.display = "flex";
}

function closeReviewForm() {
  document.getElementById("reviewBox").style.display = "none";
}

function saveReview() {
  let name = document.getElementById("rName").value;
  let text = document.getElementById("rText").value;

  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  reviews.push({ name, text, rating: selectedRating });

  localStorage.setItem("reviews", JSON.stringify(reviews));

  displayReviews();
  closeReviewForm();
}
function displayReviews() {
  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  let container = document.getElementById("reviewsList");

  container.innerHTML = "";

  reviews.forEach(r => {
    container.innerHTML += `
      <div class="testi-card">
        <p>"${r.text}"</p>
        <h4>- ${r.name}</h4>
      </div>
    `;
  });
}

window.onload = function() {
  displayReviews();
}

let selectedRating = 0;

function rate(num) {
  selectedRating = num;

  let stars = document.querySelectorAll(".stars span");

  stars.forEach((s, i) => {
    s.style.color = i < num ? "gold" : "gray";
  });
}
function loadDashboard(){

  document.body.innerHTML += `
    <h3>إضافة فيديو</h3>
    <input id="videoUrl" placeholder="Video URL">
    <input id="videoText" placeholder="وصف">
    <button onclick="addVideo()">إضافة</button>

    <h3>إضافة مقال</h3>
    <input id="blogTitle" placeholder="العنوان">
    <textarea id="blogText"></textarea>
    <button onclick="addBlog()">إضافة</button>

    <h3>الحجوزات</h3>
    <div id="bookings"></div>

    <h3>الآراء</h3>
    <div id="reviews"></div>
  `;

  // تحميل البيانات
  db.collection("bookings").get().then(snap=>{
    snap.forEach(doc=>{
      document.getElementById("bookings").innerHTML += `
        <p>${doc.data().name} - ${doc.data().phone}</p>
      `;
    });
  });

  db.collection("reviews").get().then(snap=>{
    snap.forEach(doc=>{
      document.getElementById("reviews").innerHTML += `
        <p>${doc.data().name} ⭐${doc.data().rating}</p>
      `;
    });
  });
}
function addVideo(){
  db.collection("videos").add({
    url: videoUrl.value,
    text: videoText.value
  });
}
function addBlog(){
  db.collection("blogs").add({
    title: blogTitle.value,
    text: blogText.value
  });
}
db.collection("bookings").add({
  name: name,
  phone: phone,
  date: date,
  time: time
});

db.collection("reviews").add({
  name: name,
  text: text,
  rating: selectedRating
});

db.collection("videos").get().then(snap=>{
  snap.forEach(doc=>{
    document.getElementById("videosSection").innerHTML += `
      <div>
        <iframe src="${doc.data().url}"></iframe>
        <p>${doc.data().text}</p>
      </div>
    `;
  });
});

db.collection("blogs").get().then(snap=>{
  snap.forEach(doc=>{
    document.getElementById("blogSection").innerHTML += `
      <div>
        <h3>${doc.data().title}</h3>
        <p>${doc.data().text}</p>
      </div>
    `;
  });
});
