const API = "http://100.126.153.254:5000/api";
const SLIDES = [
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-39-24.png",
        label: "Gold Gold Gold!",
        title: "Rare drop showcase"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-37-20.png",
        label: "Settings",
        title: "Many diffrent settings to customize your experience"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-36-43.png",
        label: "TradeUps",
        title: "Take a chance to get something better with trade-ups"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-35-42.png",
        label: "Inventory",
        title: "Collection highlights"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-34-31.png",
        label: "Achivements",
        title: "To help you progress faster and track progress"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-34-14.png",
        label: "Uppgrades",
        title: "Various upgrades to boost your clicker power and efficiency"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-33-58.png",
        label: "Store with many diffrent cases",
        title: "A wide variety of cases to choose from, each with its own unique items and themes"
    },
    {
        src: "../assets/slideshow/Recovered_ScreenClip_2026-05-11_11-33-20.png",
        label: "Click!",
        title: "Time to click to earn!"
    }
];

let activeSlideIndex = 0;
let slideInterval = null;

function renderSlideshow() {
    const track = document.getElementById("slideTrack");
    const dots = document.getElementById("slideDots");

    if (!track || !dots || !SLIDES.length) return;

    track.innerHTML = SLIDES.map((slide, index) => `
        <figure class="slide${index === 0 ? " active" : ""}">
            <img src="${slide.src}" alt="${slide.title}">
            <figcaption class="slide-overlay">
                <div class="slide-caption">
                    <span class="slide-label">${slide.label}</span>
                    <span class="slide-title">${slide.title}</span>
                </div>
                <span class="slide-counter">${index + 1}/${SLIDES.length}</span>
            </figcaption>
        </figure>
    `).join("");

    dots.innerHTML = SLIDES.map((slide, index) => `
        <button class="slide-dot${index === 0 ? " active" : ""}" aria-label="Go to slide ${index + 1}" data-index="${index}"></button>
    `).join("");

    dots.querySelectorAll(".slide-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
            showSlide(Number(dot.dataset.index));
            restartSlideshow();
        });
    });
}

function showSlide(index) {
    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".slide-dot");

    if (!slides.length) return;

    activeSlideIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === activeSlideIndex);
    });
    dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === activeSlideIndex);
    });
}

function getStoredSessionUser() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const fallbackUser = {
        token,
        isAdmin: false,
        username: localStorage.getItem("username") || "",
        email: localStorage.getItem("email") || "",
        accountId: localStorage.getItem("accountId") || ""
    };

    const storedAdmin = localStorage.getItem("isAdmin");
    if (storedAdmin === "true" || storedAdmin === "false") {
        return {
            ...fallbackUser,
            isAdmin: storedAdmin === "true"
        };
    }

    try {
        const payload = token.split(".")[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(atob(base64).split("").map((char) => {
            return `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`;
        }).join(""));
        const parsed = JSON.parse(json);
        const isAdmin = parsed.is_admin === true;

        localStorage.setItem("isAdmin", isAdmin ? "true" : "false");

        return {
            ...fallbackUser,
            isAdmin,
            accountId: fallbackUser.accountId || parsed.accountId || parsed.userID || ""
        };
    } catch (error) {
        return fallbackUser;
    }
}

function renderBurgerMenu(user) {
    const menu = document.getElementById("menu");
    if (!menu) return;

    const links = [
        `<a href="game/patch-download.html">Patch & Download</a>`,
        `<a href="game/gameinf.html">Game info</a>`,
        `<a href="leaderboard.html">Leaderboard</a>`
    ];

    if (user) {
        const accountHref = user.accountId ? `account.html?id=${encodeURIComponent(user.accountId)}` : "account.html";
        links.unshift(`<a href="${accountHref}">Account</a>`);
    } else {
        links.unshift(`<a href="login-signin.html#login">Login</a>`);
        links.unshift(`<a href="login-signin.html#signup">Sign up</a>`);
    }

    if (user?.isAdmin) {
        links.push(`<a href="../../admin/html/panel.html" id="adminLink">Admin Panel</a>`);
    }

    menu.innerHTML = links.join("");
}

function startSlideshow() {
    if (slideInterval || SLIDES.length < 2) return;
    slideInterval = window.setInterval(() => {
        showSlide(activeSlideIndex + 1);
    }, 4200);
}

function restartSlideshow() {
    if (slideInterval) {
        window.clearInterval(slideInterval);
        slideInterval = null;
    }
    startSlideshow();
}

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

function checkAuth(){ // kollar om anvÃ¤ndaren Ã¤r logged in eller inte och om den Ã¤r admin eller inte
    const user = getStoredSessionUser();
    renderBurgerMenu(user);

    if (!user) {
        document.getElementById("authButtons").style.display = "flex";
        document.getElementById("accountChip").style.display = "none";
        return;
    }

    document.getElementById("authButtons").style.display = "none";
    document.getElementById("accountChip").style.display = "flex";
    document.getElementById("accountName").textContent = user.username || user.email || "Logged in";
}

function clearSessionUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("accountId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("isAdmin");
}

function logout() {
    clearSessionUser();
    renderBurgerMenu(null);
    document.getElementById("authButtons").style.display = "flex";
    document.getElementById("accountChip").style.display = "none";
    window.location.href = "login-signin.html#login";
}

function goAccount() {
    const accountId = localStorage.getItem("accountId");
    window.location.href = accountId ? `account.html?id=${encodeURIComponent(accountId)}` : "account.html";
}

function goLogin() { // om man klickar pÃ¥ login gÃ¥r den till login sidan direkt
    window.location.href = "login-signin.html#login"; 
};

function goSignup() { // om man klickar pÃ¥ signup gÃ¥r den till signup siddan direkt
    window.location.href = "login-signin.html#signup";
};

function downloadLatestClient() {
    // TODO: ErsÃ¤tt med faktisk filepath nÃ¤r den finns
    // Exempel: const filePath = "../downloads/LuCS-Clicker-latest.exe";
    const filePath = "../downloads/LuCS-Clicker-latest.exe";
    window.location.href = filePath;
};

function goPatchdownload() {
    window.location.href = "game/patch-download.html";
};

function goGameInfo() {
    window.location.href = "game/gameinf.html";
};

renderSlideshow();
document.getElementById("slidePrev").addEventListener("click", function() {
    showSlide(activeSlideIndex - 1);
    restartSlideshow();
});
document.getElementById("slideNext").addEventListener("click", function() {
    showSlide(activeSlideIndex + 1);
    restartSlideshow();
});
startSlideshow();
checkAuth();// kÃ¶r auth status nÃ¤r sidan laddas

