function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  if (!name || !phone || !date || !time) {
    alert("املأ البيانات");
    return;
  }

  localStorage.setItem("name", name);
  localStorage.setItem("phone", phone);
  localStorage.setItem("date", date);
  localStorage.setItem("time", time);

  let msg = `حجز موعد:\n${name}\n${phone}\n${date}\n${time}`;

  window.open("https://wa.me/201227630041?text=" + encodeURIComponent(msg));

  window.location.href = "confirm.html";
}

/******** REVIEWS ********/

let selectedRating = 0;

function rate(n) {
  selectedRating = n;

  document.querySelectorAll(".stars span").forEach((s, i) => {
    s.style.color = i < n ? "gold" : "gray";
  });
}

function saveReview() {
  let name = document.getElementById("rName").value;
  let text = document.getElementById("rText").value;

  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  reviews.push({
    name,
    text,
    rating: selectedRating
  });

  localStorage.setItem("reviews", JSON.stringify(reviews));

  alert("تم الإرسال");
}
