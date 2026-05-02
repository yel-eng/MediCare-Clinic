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
