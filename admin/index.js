document.getElementById("burger").addEventListener("click", function() {
    document.getElementById("menu").classList.toggle("show");
});

document.addEventListener('click', function(event) {
    const menu = document.getElementById("menu")
    const burger = document.getElementById("burger")

    if (!menu.contains(event.target) && !burger.contains(event.target)){
        menu.classList.remove('show');
    }
});


// Valfri enkel sökfunktion (koppla till befintlig JS-fil)
const search = document.getElementById("userSearch");
const rows = [...document.querySelectorAll(".user-row")];

search.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? "flex" : "none";
  });
});