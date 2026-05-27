/**
 * Peta Tutur - Frontend Logic
 * Strictly Vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
    initAuthModal();
    initProfileData();
    initLogout();
    initNavActiveState();
});

/**
 * Auth Modal Logic (index.html)
 */
function initAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    const openLogin = document.getElementById('openLogin');
    const openRegister = document.getElementById('openRegister');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');
    const nameGroup = document.getElementById('nameGroup');
    const authMode = document.getElementById('authMode');
    
    const tabTuris = document.getElementById('tabTuris');
    const tabPenyedia = document.getElementById('tabPenyedia');
    const agencyGroup = document.getElementById('agencyGroup');
    const userRole = document.getElementById('userRole');

    const switchMode = (mode) => {
        if (mode === 'login') {
            modalTitle.textContent = 'Masuk Ke Akun';
            submitBtn.textContent = 'Masuk Sekarang';
            nameGroup.style.display = 'none';
            authMode.value = 'login';
        } else {
            modalTitle.textContent = 'Daftar Akun';
            submitBtn.textContent = 'Daftar Sekarang';
            nameGroup.style.display = 'flex';
            authMode.value = 'register';
        }
    };

    openLogin?.addEventListener('click', () => {
        switchMode('login');
        modal.showModal();
    });

    openRegister?.addEventListener('click', () => {
        switchMode('register');
        modal.showModal();
    });

    modal.addEventListener('close', () => {
        document.getElementById('authForm')?.reset();
        tabTuris?.click();
    });

    tabTuris?.addEventListener('click', () => {
        tabTuris.classList.add('active');
        tabPenyedia.classList.remove('active');
        agencyGroup.style.display = 'none';
        userRole.value = 'Turis';
    });

    tabPenyedia?.addEventListener('click', () => {
        tabPenyedia.classList.add('active');
        tabTuris.classList.remove('active');
        agencyGroup.style.display = 'flex';
        userRole.value = 'Penyedia Jasa';
    });

    // Real API Auth Submission
    document.getElementById('authForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const role = userRole.value;
        const specific_data = role === 'Penyedia Jasa' ? { agency: document.getElementById('userAgency').value } : {};

        const mode = authMode.value;
        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const body = mode === 'register' 
            ? { name, email, password, role, specific_data } 
            : { email, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (response.ok) {
                if (mode === 'login') {
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('pt_user', JSON.stringify(result.user));
                    alert('Login Berhasil!');
                    window.location.href = 'dashboard.html';
                } else {
                    alert(result.message);
                    switchMode('login');
                }
            } else {
                alert(result.message || 'Terjadi kesalahan.');
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Gagal terhubung ke server.');
        }
    });
}

/**
 * Profile Population Logic (profile.html)
 */
function initProfileData() {
    const profileName = document.getElementById('profile-name');
    if (!profileName) return;

    const user = JSON.parse(localStorage.getItem('pt_user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-role').textContent = user.role;
    
    if (user.role === 'Penyedia Jasa' && user.specific_data?.agency) {
        const agencyRow = document.getElementById('agencyRow');
        const profileAgency = document.getElementById('profile-agency');
        if (agencyRow && profileAgency) {
            agencyRow.style.display = 'flex';
            profileAgency.textContent = user.specific_data.agency;
        }
    }
}

/**
 * Logout Logic
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', (e) => {
        localStorage.removeItem('pt_user');
        localStorage.removeItem('userName');
    });
}

/**
 * Navigation Active State
 */
function initNavActiveState() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('href') === currentPage) {
            item.classList.add('active');
        } else if (item.classList.contains('dropdown')) {
            const subLinks = item.querySelectorAll('.dropdown-menu a');
            subLinks.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    item.classList.add('active');
                }
            });
        }
    });

    const protectedPages = ['dashboard.html', 'profile.html', 'catalog.html', 'workspace.html', 'history.html'];
    if (protectedPages.includes(currentPage) && !localStorage.getItem('pt_user')) {
        window.location.href = 'index.html';
    }
}

/**
 * Interactive Modal Logic (Catalog & History) - Merged for dynamically loaded elements
 */
document.addEventListener('DOMContentLoaded', () => {
    // Shared Modal Closure
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.custom-modal');
        modals.forEach(m => {
            if (e.target === m) m.style.display = 'none';
        });
    });
});
