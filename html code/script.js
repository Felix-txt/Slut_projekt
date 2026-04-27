const userIcon = document.getElementById('userIcon');

if (localStorage.getItem('token')) {
    const img = document.createElement('img');
    img.src = localStorage.getItem('profileImage') || 'default.png';
    img.alt = 'Account';
    userIcon.innerHTML = '';
    userIcon.appendChild(img);
    userIcon.href = '/account';
} else {
    userIcon.href = '/login';
}