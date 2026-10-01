// ===== الثوابت الكونية =====
const UC = {
    PHI: 1.6180339887498948482,
    E: 2.7182818284590452354,
    PI: 3.1415926535897932385,
    SILVER: 2.414213562373095,
    FIB: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987],
    LUCAS: [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123],
    C: 299792458,
    NANO: 1e-9
};

// ===== نظام الحلقات =====
class WilliamRing {
    constructor(index, data, prevHash) {
        this.index = index % 10;
        this.fibIndex = index % UC.FIB.length;
        this.fibValue = UC.FIB[this.fibIndex];
        this.data = data;
        this.prevHash = prevHash;
        this.hash = this.computeHash();
        this.memory = {};
        this.timestamp = Date.now();
    }

    computeHash() {
        const str = JSON.stringify(this.data) + this.prevHash + this.index;
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h = h & h;
        }
        return Math.abs(h).toString(16).padStart(16, '0');
    }

    isNinth() {
        return this.index === 9;
    }
}

// ===== سلسلة الحلقات =====
class WilliamChain {
    constructor() {
        this.rings = [];
        this.load();
    }

    addRing(data) {
        const prevHash = this.rings.length > 0 
            ? this.rings[this.rings.length - 1].hash 
            : '0000000000000000';
        const ring = new WilliamRing(this.rings.length, data, prevHash);
        this.rings.push(ring);
        this.save();
        return ring;
    }

    rebuildMissing(index) {
        if (index < 0 || index >= this.rings.length) return null;
        const prev = index > 0 ? this.rings[index - 1] : null;
        const next = index < this.rings.length - 1 ? this.rings[index + 1] : null;
        const recovered = {
            recovered: true,
            fromPrev: prev ? prev.hash : null,
            fromNext: next ? next.hash : null,
            content: '[استُعيدت من الحلقات المجاورة]'
        };
        return recovered;
    }

    save() {
        try {
            const data = this.rings.map(r => ({
                i: r.index, d: r.data, p: r.prevHash, h: r.hash
            }));
            localStorage.setItem('william_rings', JSON.stringify(data));
        } catch(e) {}
    }

    load() {
        try {
            const saved = localStorage.getItem('william_rings');
            if (saved) {
                const data = JSON.parse(saved);
                this.rings = data.map(d => {
                    const r = new WilliamRing(d.i, d.d, d.p);
                    r.hash = d.h;
                    return r;
                });
            }
        } catch(e) {}
    }

    clear() {
        this.rings = [];
        localStorage.removeItem('william_rings');
    }
}

// ===== نواة William =====
class WilliamCore {
    constructor() {
        this.chain = new WilliamChain();
        this.level = parseFloat(localStorage.getItem('william_level')) || 1.0;
        this.knowledge = JSON.parse(localStorage.getItem('william_knowledge') || '[]');
        this.online = navigator.onLine;
        this.log = [];
    }

    logAdd(msg) {
        const ts = new Date().toLocaleTimeString('ar-EG');
        this.log.push('[' + ts + '] ' + msg);
        if (this.log.length > 100) this.log = this.log.slice(-100);
    }

    async search(query) {
        try {
            const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1';
            const r = await fetch(url);
            const data = await r.json();
            const results = [];
            if (data.AbstractText) {
                results.push({ title: data.Heading || query, text: data.AbstractText });
            }
            if (data.Answer) {
                results.push({ title: 'Answer', text: String(data.Answer) });
            }
            (data.RelatedTopics || []).slice(0, 5).forEach(t => {
                if (t.Text) results.push({ title: 'Related', text: t.Text });
            });
            return results.length > 0 ? results : null;
        } catch(e) {
            return null;
        }
    }
  
    internalSolve(query) {
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            hash = ((hash << 5) - hash) + query.charCodeAt(i);
            hash = hash & hash;
        }
        const v = Math.abs(hash) % 1000000;
        const val = v / 1000000;
        const curve = Math.sin(val * UC.PI) * UC.E;
        return { val, curve };
    }

    async process(query) {
        this.logAdd('استعلام: ' + query);
        const results = await this.search(query);
        
        if (results) {
            this.online = true;
            this.level *= UC.PHI;
            localStorage.setItem('william_level', this.level);
            const text = results.map(r => '• ' + r.title + '\n' + r.text).join('\n\n');
            this.knowledge.push({ q: query, r: text, t: Date.now() });
            localStorage.setItem('william_knowledge', JSON.stringify(this.knowledge));
            this.chain.addRing({ q: query, r: text.substring(0, 100) });
            this.logAdd('✔ نجح: ' + results.length + ' نتيجة');
            return { status: 'online', text: text, level: this.level };
        } else {
            this.online = false;
            this.level *= (1 + 1 / UC.SILVER);
            localStorage.setItem('william_level', this.level);
            const i = this.internalSolve(query);
            const text = '[وضع التكيف الداخلي]\nالقيمة: ' + i.val.toFixed(6) + '\nالانحناء: ' + i.curve.toFixed(6);
            this.knowledge.push({ q: query, r: text, t: Date.now() });
            localStorage.setItem('william_knowledge', JSON.stringify(this.knowledge));
            this.chain.addRing({ q: query, r: '[internal]' });
            this.logAdd('⚠ تكيف داخلي');
            return { status: 'internal', text: text, level: this.level };
        }
    }
}

// ===== الواجهة =====
const william = new WilliamCore();

function switchTab(name, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    const tabEl = document.getElementById('tab-' + name);
    if (tabEl) tabEl.classList.add('active');
    if (name === 'rings') renderRings();
    if (name === 'editor') loadEditor();
}

async function ask() {
    const input = document.getElementById('query-input');
    const q = input.value.trim();
    if (!q) return;
    document.getElementById('output').textContent = '⏳ جاري المعالجة...';
    input.value = '';
    const result = await william.process(q);
    document.getElementById('output').textContent = 
        '[سؤال]: ' + q + '\n[الحالة]: ' + 
        (result.status === 'online' ? 'متصل ✓' : 'تكيف داخلي ⚠') + 
        '\n[المستوى]: ' + result.level.toFixed(4) + 
        '\n\n' + result.text;
    updateStats();
}

function updateStats() {
    document.getElementById('level').textContent = william.level.toFixed(4);
    document.getElementById('ring-count').textContent = william.chain.rings.length;
    document.getElementById('knowledge-count').textContent = william.knowledge.length;
}

function renderRings() {
    const view = document.getElementById('rings-view');
    if (william.chain.rings.length === 0) {
        view.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">لا توجد حلقات بعد. اطرح سؤالاً.</div>';
        return;
    }
    view.innerHTML = william.chain.rings.map((r, i) => 
        '<div class="ring ' + (r.isNinth() ? 'ring-9' : '') + '">' +
        '<div><span class="ring-index">حلقة ' + r.index + '</span>' +
        '<span style="font-size:10px;color:#888;margin-right:8px;">fib: ' + r.fibValue + '</span></div>' +
        '<div class="ring-hash">' + r.hash.substring(0, 12) + '...</div>' +
        '</div>'
    ).join('');
}

function loadEditor() {
    const el = document.getElementById('code-editor');
    const saved = localStorage.getItem('william_code') || '';
    el.value = saved || '// محرر الكود - اكتب هنا\n// مثال:\n// console.log("Hello William");\n';
}

function saveCode() {
    const code = document.getElementById('code-editor').value;
    localStorage.setItem('william_code', code);
    alert('✅ تم حفظ الكود');
}

function resetCode() {
    if (confirm('هل تريد استعادة الكود الافتراضي؟')) {
        localStorage.removeItem('william_code');
        location.reload();
    }
}

function runCode() {
    const code = document.getElementById('code-editor').value;
    try {
        eval(code);
        alert('✅ تم تنفيذ الكود بنجاح');
    } catch(e) {
        alert('❌ خطأ: ' + e.message);
    }
}

function exportData() {
    const data = {
        level: william.level,
        rings: william.chain.rings.map(r => ({ i: r.index, d: r.data, h: r.hash })),
        knowledge: william.knowledge
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'william-backup.json';
    a.click();
}

function clearData() {
    if (confirm('⚠️ سيتم حذف كل البيانات. متأكد؟')) {
        localStorage.clear();
        location.reload();
    }
}

// ===== تشغيل التطبيق =====
window.addEventListener('online', function() {
    const el = document.getElementById('status');
    if (el) el.style.color = '#00ff88';
    if (typeof william !== 'undefined') william.logAdd('متصل بالإنترنت');
});

window.addEventListener('offline', function() {
    const el = document.getElementById('status');
    if (el) el.style.color = '#ff6666';
    if (typeof william !== 'undefined') william.logAdd('غير متصل - وضع التكيف');
});

// تحديث دوري للإحصائيات
setInterval(function() {
    if (typeof updateStats === 'function') updateStats();
}, 3000);

// التهيئة الأولى
document.addEventListener('DOMContentLoaded', function() {
    if (typeof updateStats === 'function') updateStats();
    if (typeof william !== 'undefined') {
        william.logAdd('◆ William استيقظ');
        william.logAdd('◆ الثوابت: φ, e, π, فضية, فيبوناتشي, لوكاس');
        william.logAdd('◆ الحلقات: جاهزة');
    }
    console.log('⚛️ William Universal Physics AI - Ready');
});

// تحديث الإحصائيات فوراً
if (typeof updateStats === 'function') updateStats();

// ===== نظام التحديث الذاتي =====
function selfUpdate() {
    const editor = document.getElementById('code-editor');
    if (!editor) {
        alert('المحرر غير موجود');
        return;
    }
    
    const newCode = editor.value.trim();
    if (!newCode) {
        alert('اكتب الكود أولاً في المحرر');
        return;
    }
    
if (!confirm('🚀 هل تريد تحديث الكيان بهذا الكود؟\n\nسيُحفظ الكود الجديد ويُشغّل فوراً.')) {
    return;
}

try {
    new Function(newCode);
    localStorage.setItem('william_custom_code', newCode);
    eval(newCode);
    
    if (typeof william !== 'undefined') {
        william.logAdd('🚀 تم التحديث الذاتي بنجاح');
    }
            
        alert('✅ تم التحديث!\nالكود الجديد يعمل الآن.');
        updateStats();
        
    } catch(e) {
        alert('❌ خطأ في الكود:\n' + e.message);
    }
}

// ===== تشغيل الكود المخصص عند البدء =====
window.addEventListener('load', function() {
    const saved = localStorage.getItem('william_custom_code');
    if (saved) {
        try {
            eval(saved);
            console.log('✅ تم تحميل التحديث الذاتي');
        } catch(e) {
            console.error('❌ خطأ في التحديث:', e);
        }
    }
});

// ===== إصلاح البحث المضمون =====
(function() {
    var _origSearch = WilliamCore.prototype.search;
    WilliamCore.prototype.search = async function(query) {

        try {
    const url = 'https://ar.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query);
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.extract) {
        return [{ title: data.title || query, text: data.extract }];
    }

                } catch(e) {}
        return _origSearch ? _origSearch.call(this, query) : null;
    };
    console.log('✅ Wikipedia search override activated');
})();

