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

  reviews.push({ name, text });

  localStorage.setItem("reviews", JSON.stringify(reviews));

  alert("شكراً لرأيك ❤️");

  closeReviewForm();
}
