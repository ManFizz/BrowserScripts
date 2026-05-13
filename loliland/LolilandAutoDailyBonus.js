// ==UserScript==
// @name         Loliland Auto Daily Bonus
// @version      1.6
// @author       ManFis
// @namespace    https://loliland.ru
// @description  Автоматически забирает ежедневный бонус с умным таймером
// @downloadUrl  https://raw.githubusercontent.com/ManFizz/BrowserScripts/refs/heads/master/loliland/LolilandAutoDailyBonus.js
// @updateUrl    https://raw.githubusercontent.com/ManFizz/BrowserScripts/refs/heads/master/loliland/LolilandAutoDailyBonus.js
// @match        https://loliland.ru/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
    let ACCESS_ID = null;
    let ACCESS_TOKEN = null;
    let timer = null;

    console.log('%cLoliland Auto Bonus v1.6 — запущен', 'color:#00cc66; font-size:14px');

    const origFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        if (typeof url === 'string' && url.includes('/apiv2/')) {
            if (options?.headers) {
                const h = new Headers(options.headers);
                const id = h.get('Access-Id') || h.get('access-id');
                const token = h.get('Access-Token') || h.get('access-token') ||
                    (h.get('Authorization') && h.get('Authorization').replace('Bearer ', ''));

                if (id) ACCESS_ID = id;
                if (token && token.length > 20) ACCESS_TOKEN = token;
            }
        }
        return origFetch(url, options);
    };

    async function apiRequest(endpoint, isPost = false) {
        if (!ACCESS_ID || !ACCESS_TOKEN) {
            console.warn('Access-Id или Access-Token не найден');
            return null;
        }

        const headers = {
            'Access-Id': ACCESS_ID,
            'Access-Token': ACCESS_TOKEN,
            'Content-Type': 'application/json'
        };

        try {
            const res = await fetch(`https://loliland.ru/apiv2/bonus/${endpoint}`, {
                method: isPost ? 'POST' : 'GET',
                headers,
                credentials: 'include',
                body: isPost ? JSON.stringify({}) : undefined
            });
            return await res.json();
        } catch (e) {
            console.error('Ошибка запроса к', endpoint, e);
            return null;
        }
    }

    async function scheduleNextClaim() {
        if (timer) clearTimeout(timer);

        const status = await apiRequest('status');
        if (!status || status.error) {
            timer = setTimeout(scheduleNextClaim, 30 * 60 * 1000);
            return;
        }

        const remaining = status.interval || 0;

        if (remaining <= 180000) {
            console.log('%c🎁 Бонус доступен — забираем...', 'color:lime');
            const result = await apiRequest('give', true);

            if (result?.payout?.coinAmount) {
                console.log(`%c✅ Получено +${result.payout.coinAmount} монет`, 'color:lime; font-weight:bold');
            }
            setTimeout(scheduleNextClaim, 12000);
        } else {
            const margin = 45000 + Math.random() * 90000;
            const delay = remaining + margin;

            timer = setTimeout(async () => {
                await apiRequest('give', true);
                setTimeout(scheduleNextClaim, 15000);
            }, delay);
        }
    }

    setTimeout(scheduleNextClaim, 7000);

    window.claimBonusNow = () => apiRequest('give', true);
    window.checkBonus = () => apiRequest('status');

})();