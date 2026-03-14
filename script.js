// App State
const state = {
    level: 1,
    exp: 0,
    gold: 0,
    currentScreen: 'home',
    activeQuest: null,
    quests: [
        {
            id: 1,
            rank: 'D',
            title: 'こうえんのそうじ',
            description: 'いつものこうえんをきれいにしよう！ゴミをみつけたらひろってね。',
            reward: '100 G',
            exp: 50,
            location: '近くの公園',
            image: 'assets/quest_park_1771342021521.png'
        },
        {
            id: 2,
            rank: 'C',
            title: 'ぎゅうにゅうはいたつ',
            description: 'むらびとたちにしんせんでおいしいぎゅうにゅうをはいたつするのだ！おとさないように気をつけて。',
            reward: '3000 G + おやつ',
            exp: 1000,
            location: 'はじまりのむら',
            image: 'assets/quest_milk.png'
        },
        {
            id: 3,
            rank: 'A',
            title: 'カフェでおてつだい',
            description: 'おきゃくさんにおいしいコーヒーをもっていくのだ！',
            reward: '500000 G',
            exp: 200000,
            location: 'こーひー あおきどう',
            image: 'assets/quest_cafe.png'
        }
    ],
    adventureLog: [] // Stores completed quests
};

// DOM Elements
const mainContent = document.getElementById('main-content');
const userLevelEl = document.getElementById('user-level');
const userGoldEl = document.getElementById('user-gold');
const navBtns = document.querySelectorAll('.nav-btn');

// Audio Controller (Web Audio API)
class AudioController {
    constructor() {
        this.ctx = null;
        this.bgmOscillators = [];
        this.isPlaying = false;
        this.gainNode = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.ctx.createGain();
            this.gainNode.gain.value = 0.1; // Low volume
            this.gainNode.connect(this.ctx.destination);
        }
    }

    toggleBgm() {
        if (this.isPlaying) {
            this.stopBgm();
        } else {
            this.playBgm();
        }
        return this.isPlaying;
    }

    playBgm() {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isPlaying = true;
        this.scheduleNotes();
    }

    stopBgm() {
        this.isPlaying = false;
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
        });
        this.bgmOscillators = [];
    }

    // Simple procedural loop
    scheduleNotes() {
        if (!this.isPlaying) return;

        const startTime = this.ctx.currentTime;
        const tempo = 0.2; // Seconds per note
        // Simple RPG Town Theme melody (approximate)
        const melody = [
            261.63, 293.66, 329.63, 392.00,
            329.63, 392.00, 523.25, 392.00,
            349.23, 329.63, 293.66, 261.63,
            293.66, 329.63, 293.66, 0
        ]; // C4, D4, E4, G4...

        melody.forEach((freq, index) => {
            if (freq > 0) {
                const osc = this.ctx.createOscillator();
                osc.type = 'square'; // Retro sound
                osc.frequency.value = freq;
                osc.connect(this.gainNode);
                osc.start(startTime + index * tempo);
                osc.stop(startTime + index * tempo + tempo * 0.8);
                this.bgmOscillators.push(osc);
            }
        });

        // Loop
        setTimeout(() => {
            if (this.isPlaying) this.scheduleNotes();
        }, melody.length * tempo * 1000);
    }
}

const audioCtrl = new AudioController();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateHeader();
    // Check if user has seen opening
    if (!localStorage.getItem('localquest_opening_seen')) {
        renderOpening();
    } else {
        renderHome();
    }
    setupNav();
});


function renderOpening() {
    mainContent.innerHTML = '';

    const div = document.createElement('div');
    div.classList.add('fade-in');
    div.style.textAlign = 'center';
    div.style.paddingTop = '2rem';

    div.innerHTML = `
        <div style="background:#000; border:4px double #f59e0b; padding:1rem; border-radius:8px; margin-bottom:1rem; position:relative;">
            <img src="assets/king_avatar_1771386847022.png" style="width:80px; height:80px; border-radius:50%; border:2px solid #fff; position:absolute; top:-40px; left:50%; transform:translateX(-50%); background:#000;">
            <div style="margin-top:40px; font-family:var(--font-main); line-height:1.6; min-height:120px; text-align:left;" id="typewriter-text"></div>
        </div>
        <button class="btn" id="start-adventure-btn" style="opacity:0; transition:opacity 0.5s;">ぼうけんをはじめる</button>
    `;

    mainContent.appendChild(div);

    const text = "ようこそ、わかき ゆうしゃよ！\nこのまちは いま、たくさんの\n「こまりごと」で あふれておる。\nそなたの ちからで\nまちのひとを たすけてくれぬか？";
    const typeWriterEl = document.getElementById('typewriter-text');
    let i = 0;

    function typeWriter() {
        if (i < text.length) {
            typeWriterEl.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        } else {
            document.getElementById('start-adventure-btn').style.opacity = '1';
        }
    }

    // Start typing after a short delay
    setTimeout(typeWriter, 500);

    document.getElementById('start-adventure-btn').onclick = () => {
        // Start BGM on user interaction
        audioCtrl.playBgm();
        updateBgmIcon();

        localStorage.setItem('localquest_opening_seen', 'true');
        navigateTo('home');
    };
}

// Init logic modified above, removing old listener
// ... (Keeping rest of file)

// Helper to update BGM icon in header
function updateBgmIcon() {
    const bgmBtn = document.getElementById('bgm-toggle');
    if (bgmBtn) {
        bgmBtn.textContent = audioCtrl.isPlaying ? '🔊' : '🔇';
    }
}


// Navigation Setup
function setupNav() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            // Prevent leaving active quest via nav (simple guard)
            if (state.activeQuest && target !== 'home') {
                if (!confirm('クエスト中です。中断しますか？')) return;
                state.activeQuest = null;
            }

            navigateTo(target);
        });
    });
}

function navigateTo(screenName) {
    state.currentScreen = screenName;

    // Update Nav UI
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === screenName);
    });

    // Render Screen
    mainContent.innerHTML = '';
    mainContent.className = 'fade-in';

    switch (screenName) {
        case 'home': renderHome(); break;
        case 'report': renderReport(); break;
        case 'profile': renderProfile(); break;
    }
}

// Global Update Helpers
function updateHeader() {
    userLevelEl.textContent = state.level;
    userGoldEl.textContent = state.gold;

    // BGM Toggle Listener (once)
    const bgmBtn = document.getElementById('bgm-toggle');
    if (bgmBtn && !bgmBtn.onclick) {
        bgmBtn.onclick = () => {
            audioCtrl.toggleBgm();
            updateBgmIcon();
        };
    }
}

/* ---------------- SCREEN RENDERERS ---------------- */

function renderHome() {
    // Determine title based on active quest
    if (state.activeQuest) {
        renderActiveQuest();
        return;
    }

    const container = document.createElement('div');
    container.innerHTML = `<h2 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:0.5rem;">クエスト・ボード</h2>`;

    const list = document.createElement('div');
    const template = document.getElementById('quest-item-template');

    state.quests.forEach(quest => {
        const clone = template.content.cloneNode(true);

        // Thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.className = 'quest-thumbnail';
        thumbnail.src = quest.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23334155"/><text x="50" y="50" font-family="monospace" font-size="20" fill="%2364748b" text-anchor="middle" dy=".3em">NO IMAGE</text></svg>';

        const questItem = clone.querySelector('.quest-item');
        questItem.prepend(thumbnail);

        // Content wrapper
        const content = document.createElement('div');
        content.className = 'quest-content';

        const rank = clone.querySelector('.quest-rank');
        const info = clone.querySelector('.quest-info');
        const btn = clone.querySelector('.accept-btn');
        btn.classList.add('btn'); // Add base button class

        // Move elements into content wrapper
        content.appendChild(rank);
        content.appendChild(info);

        // Re-structure
        questItem.appendChild(content);
        questItem.appendChild(btn);

        rank.textContent = quest.rank;
        info.querySelector('.quest-title').textContent = quest.title;
        info.querySelector('.quest-reward').textContent = `報酬: ${quest.reward}`;

        btn.onclick = () => renderQuestDetail(quest);

        list.appendChild(clone);
    });

    container.appendChild(list);
    mainContent.appendChild(container);
}

function renderQuestDetail(quest) {
    mainContent.innerHTML = '';

    const div = document.createElement('div');
    div.classList.add('fade-in');

    const imageSrc = quest.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23334155"/><text x="50" y="50" font-family="monospace" font-size="20" fill="%2364748b" text-anchor="middle" dy=".3em">NO IMAGE</text></svg>';

    div.innerHTML = `
        <div class="quest-detail-header">
            <img src="${imageSrc}" class="quest-detail-image">
            <div class="quest-rank" style="margin: 0 auto 1rem; width:60px; height:60px; font-size:1.5rem;">${quest.rank}</div>
            <h2>${quest.title}</h2>
            <p>${quest.description}</p>
        </div>

        <div class="role-assignment">
            <h3 style="margin-top:0;">パーティ編成</h3>
            <div class="role-row">
                <div class="role-info">
                    <img src="assets/hero_avatar_1771341663666.png" class="role-avatar">
                    <span>ゆうしゃ (リーダー)</span>
                </div>
                <span class="role-name">お子様</span>
            </div>
            <div class="role-row">
                <div class="role-info">
                    <img src="assets/support_avatar_1771341814666.png" class="role-avatar">
                    <span>サポート (荷物持ち)</span>
                </div>
                <span class="role-name">保護者 A</span>
            </div>
            <div style="font-size:0.8rem; color:#94a3b8; margin-top:0.5rem;">
                ※ サポート役はクエスト中、リーダーの指示に従ってください。
            </div>
        </div>

        <button class="btn" id="start-quest-btn">クエスト開始！</button>
        <button class="btn btn-secondary" style="margin-top:1rem;" id="back-btn">もどる</button>
    `;

    mainContent.appendChild(div);

    document.getElementById('start-quest-btn').onclick = () => {
        state.activeQuest = { ...quest, startTime: new Date() };
        navigateTo('home'); // Home handles active quest view
    };

    document.getElementById('back-btn').onclick = () => navigateTo('home');
}

function renderActiveQuest() {
    const quest = state.activeQuest;
    mainContent.innerHTML = '';

    const div = document.createElement('div');
    div.classList.add('fade-in');
    div.innerHTML = `
        <div style="text-align:center; margin-bottom:1rem;">
            <div style="color:#f59e0b; font-size:0.9rem;">QUEST IN PROGRESS</div>
            <h2>${quest.title}</h2>
        </div>

        <div class="camera-mock">
            <div style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;" id="camera-preview"></div>
            <div style="z-index:1; text-align:center;">
                <p>📷 カメラ起動中...</p>
                <small>(シミュレーション)</small>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-bottom:1rem;">
            <button class="btn btn-secondary" onclick="alert('パシャ！(写真を記録しました)')">📷 記録写真</button>
            <button class="btn btn-secondary" onclick="alert('「ここはこうなってるんだね！」(気づきを録音しました)')">🎙 気づきメモ</button>
        </div>

        <button class="btn" id="finish-quest-btn">クエスト完了報告</button>
    `;

    mainContent.appendChild(div);

    document.getElementById('finish-quest-btn').onclick = () => {
        completeQuest(quest);
    };
}

function completeQuest(quest) {
    // 1. Generate Report
    const report = {
        questId: quest.id,
        title: quest.title,
        date: new Date().toLocaleString(),
        content: `【AI自動生成日報】\n本日のクエスト「${quest.title}」において、勇者は素晴らしい活躍を見せました。特に${quest.location}での行動は迅速でした。\n獲得経験値: ${quest.exp}\n報酬: ${quest.reward}`
    };
    state.adventureLog.unshift(report);

    // 2. Update Stats
    state.exp += quest.exp;
    state.gold += 100; // Simplified
    state.activeQuest = null;

    // 3. Level Up Logic (Simple)
    if (state.exp >= state.level * 100) {
        state.level++;
        state.exp = 0; // Reset for demo
        showLevelUpModal();
    } else {
        alert('クエスト完了！おつかれさまでした！');
        navigateTo('report');
    }

    updateHeader();
}

function renderReport() {
    mainContent.innerHTML = '<h2 style="margin-top:0;">ぼうけんのしょ</h2>';

    if (state.adventureLog.length === 0) {
        mainContent.innerHTML += '<p style="text-align:center; color:#64748b; margin-top:2rem;">まだ記録はありません。</p>';
        return;
    }

    state.adventureLog.forEach(log => {
        const div = document.createElement('div');
        div.style.backgroundColor = '#1e293b';
        div.style.padding = '1rem';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '1rem';
        div.style.border = '1px solid #334155';

        div.innerHTML = `
            <div style="color:#f59e0b; font-size:0.8rem; margin-bottom:0.5rem;">${log.date}</div>
            <h3 style="margin:0 0 0.5rem 0;">${log.title}</h3>
            <p style="white-space:pre-wrap; font-size:0.9rem; line-height:1.5; color:#cbd5e1;">${log.content}</p>
        `;
        mainContent.appendChild(div);
    });
}

function renderProfile() {
    mainContent.innerHTML = `
        <h2 style="margin-top:0;">ステータス</h2>
        <div style="text-align:center; margin-bottom:2rem;">
            <img src="assets/hero_avatar_1771341663666.png" style="width:100px; height:100px; border-radius:50%; border:4px solid #f59e0b; margin-bottom:1rem;">
            <h3>勇者 (Lv.${state.level})</h3>
        </div>
        
        <div style="background:#1e293b; padding:1rem; border-radius:8px;">
            <p><strong>現在の経験値:</strong> ${state.exp} / ${state.level * 100}</p>
            <p><strong>所持金:</strong> ${state.gold} G</p>
            <p><strong>クリアしたクエスト:</strong> ${state.adventureLog.length}</p>
        </div>
    `;
}

function showLevelUpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="level-up-text">LEVEL UP!</div>
            <div style="font-size:3rem; margin:1rem 0;">🆙</div>
            <p>勇者のレベルが <strong>${state.level}</strong> になった！</p>
            <p>あたらしくできることがふえたかも？</p>
            <button class="btn" id="close-modal">やったね！</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-modal').onclick = () => {
        modal.remove();
        navigateTo('report');
    };
}
