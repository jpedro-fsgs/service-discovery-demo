document.addEventListener('DOMContentLoaded', () => {
    let userId = localStorage.getItem('emoji_userId');
    if (!userId) {
        userId = 'user-' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('emoji_userId', userId);
    }
    
    let jwt = localStorage.getItem('emoji_jwt');
    let isAuthenticated = !!jwt;

    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    const feedContainer = document.getElementById('feed-container');
    const toastContainer = document.getElementById('toast-container');
    const nameInput = document.getElementById('username-input');
    const nameBtn = document.getElementById('change-name-btn');
    const liveReloadCb = document.getElementById('live-reload-cb');
    const reloadFeedBtn = document.getElementById('reload-feed-btn');

    nameInput.value = userId;

    async function changeName() {
        const newName = nameInput.value.trim();
        if (!newName || newName === userId) return;
        
        showStatus('loading', 'Trocando nome...');
        try {
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: newName })
            });
            
            if (response.ok) {
                const data = await response.json();
                userId = newName;
                localStorage.setItem('emoji_userId', userId);
                jwt = data.token;
                localStorage.setItem('emoji_jwt', jwt);
                showStatus('connected');
                showToast(`Nome alterado para ${userId}`);
            } else { throw new Error('Falha'); }
        } catch (error) {
            showToast('Não foi possível trocar de nome: Serviço de Autenticação indisponível');
            nameInput.value = userId;
            if (jwt) showStatus('auth-offline', 'Auth offline (você continua logado)');
        }
    }
    nameBtn.addEventListener('click', changeName);

    reloadFeedBtn.addEventListener('click', () => {
        reloadFeedBtn.style.opacity = '0.5';
        fetchFeed().finally(() => reloadFeedBtn.style.opacity = '1');
    });

    function showStatus(status, customText = null) {
        statusBar.className = 'status-bar ' + status;
        switch (status) {
            case 'connected': statusText.textContent = customText || 'Conectado'; break;
            case 'auth-offline': statusText.textContent = customText || 'Auth offline - você ainda está logado'; break;
            case 'error': statusText.textContent = customText || 'Serviço indisponível'; break;
            case 'loading': default: statusText.textContent = customText || 'Conectando...'; break;
        }
    }

    function showToast(msg) {
        toastContainer.textContent = msg;
        toastContainer.classList.add('show');
        setTimeout(() => { toastContainer.classList.remove('show'); }, 3000);
    }

    async function authenticate() {
        try {
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (response.ok) {
                const data = await response.json();
                jwt = data.token;
                localStorage.setItem('emoji_jwt', jwt);
                isAuthenticated = true;
                showStatus('connected');
                fetchFeed();
            } else { throw new Error('Falha na autenticação'); }
        } catch (error) {
            console.error('Erro de autenticação:', error);
            if (jwt) { showStatus('auth-offline'); } else { showStatus('error', 'Falha ao autenticar'); isAuthenticated = false; }
        }
    }

    function animateEmoji(emoji, buttonEl) {
        const rect = buttonEl.getBoundingClientRect();
        const clone = document.createElement('div');
        clone.textContent = emoji; clone.className = 'floating-emoji';
        clone.style.left = `${rect.left + rect.width / 2 - 16}px`; clone.style.top = `${rect.top}px`;
        document.body.appendChild(clone);
        setTimeout(() => { clone.remove(); }, 1000);
    }

    async function sendEmoji(emoji, buttonEl) {
        if (!jwt) { showToast('Aguarde a autenticação'); return; }
        try {
            animateEmoji(emoji, buttonEl);
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
                body: JSON.stringify({ emoji })
            });
            if (response.status === 401) {
                jwt = null; localStorage.removeItem('emoji_jwt'); isAuthenticated = false;
                await authenticate(); return;
            }
            if (!response.ok) { throw new Error('Falha ao enviar emoji'); }
            fetchFeed();
        } catch (error) {
            console.error('Erro ao enviar:', error); showToast('Erro ao enviar emoji');
        }
    }

    function getRelativeTime(isoString) {
        const diffSecs = Math.floor((new Date() - new Date(isoString)) / 1000);
        if (diffSecs < 30) return 'agora';
        if (diffSecs < 60) return `${diffSecs}s`;
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) return `${diffMins}min`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h`;
        return `${Math.floor(diffHrs / 24)}d`;
    }

    function renderFeed(feedData) {
        const feedItems = Array.isArray(feedData) ? feedData : (feedData && feedData.feed) ? feedData.feed : [];
        if (!feedItems || feedItems.length === 0) {
            feedContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhum emoji ainda. Seja o primeiro!</div>';
            return;
        }
        feedContainer.innerHTML = '';
        feedItems.forEach(item => {
            const div = document.createElement('div'); div.className = 'feed-item';
            const shortUser = item.userId.length > 8 ? item.userId.substring(0, 8) + '...' : item.userId;
            const timeStr = getRelativeTime(item.timestamp);
            div.innerHTML = `<div class="feed-emoji">${item.emoji}</div><div class="feed-info"><div class="feed-user">${shortUser}</div><div class="feed-time">${timeStr}</div></div>`;
            feedContainer.appendChild(div);
        });
    }

    async function fetchFeed() {
        if (!jwt) return;
        try {
            const response = await fetch('/api/feed', { headers: { 'Authorization': `Bearer ${jwt}` } });
            if (response.status === 401) {
                jwt = null; localStorage.removeItem('emoji_jwt'); isAuthenticated = false;
                await authenticate(); return;
            }
            if (response.ok) {
                const data = await response.json(); renderFeed(data);
                if (statusBar.classList.contains('auth-offline') || statusBar.classList.contains('error')) { showStatus('connected'); }
            }
        } catch (error) { console.error('Erro ao buscar feed:', error); }
    }

    showStatus('loading'); authenticate();
    document.querySelectorAll('.emoji-btn').forEach(btn => { btn.addEventListener('click', (e) => { sendEmoji(e.target.getAttribute('data-emoji'), e.target); }); });
    setInterval(() => {
        if (liveReloadCb.checked) {
            fetchFeed();
        }
    }, 2000);
});
