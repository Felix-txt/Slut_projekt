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