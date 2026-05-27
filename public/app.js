/**
 * Peta Tutur - Frontend Logic
 * Strictly Vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
    initAuthModal();
    initProfileData();
    initLogout();
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

    // Reset selection and clear fields on modal close
    modal.addEventListener('close', () => {
        document.getElementById('authForm')?.reset();
        tabTuris?.click();
    });

    // Tab Switching
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

    // Form Submission (Mock)
    document.getElementById('authForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const inputName = document.getElementById('userName').value;
        const inputEmail = document.getElementById('userEmail').value;

        if (authMode.value === 'register' && !inputName) {
            alert('Silakan masukkan nama lengkap Anda.');
            return;
        }

        const userData = {
            name: inputName || (authMode.value === 'login' ? (localStorage.getItem('userName') || 'Returning User') : 'Guest User'),
            email: inputEmail,
            role: userRole.value,
            agency: document.getElementById('userAgency').value || null
        };

        // If Login mode and default admin
        if (authMode.value === 'login' && userData.email === 'admin@petatutur.com') {
            userData.name = 'Super Admin';
            userData.role = 'Superadmin';
        }

        localStorage.setItem('userName', userData.name);
        localStorage.setItem('pt_user', JSON.stringify(userData));
        alert(authMode.value === 'login' ? 'Login Successful!' : 'Registration Successful!');
        window.location.href = 'dashboard.html';
    });
}

/**
 * Profile Population Logic (profile.html)
 */
function initProfileData() {
    const profileName = document.getElementById('profile-name');
    if (!profileName) return;

    const user = JSON.parse(localStorage.getItem('pt_user'));
    const fetchedName = localStorage.getItem('userName');

    if (!user || !fetchedName) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('profile-name').textContent = fetchedName;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-role').textContent = user.role;
    
    if (user.role === 'Penyedia Jasa' && user.agency) {
        const agencyRow = document.getElementById('agencyRow');
        const profileAgency = document.getElementById('profile-agency');
        if (agencyRow && profileAgency) {
            agencyRow.style.display = 'flex';
            profileAgency.textContent = user.agency;
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
    });
}

/**
 * Basic Auth Enforcement & Workspace Logic Append
 */
document.addEventListener('DOMContentLoaded', () => {
    const protectedPages = ['dashboard.html', 'profile.html', 'catalog.html', 'workspace.html', 'history.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (!localStorage.getItem('userName')) {
            window.location.href = 'index.html';
        }
    }
});
