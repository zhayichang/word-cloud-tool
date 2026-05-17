// ===== 默认停用词表 (85个) =====
const DEFAULT_STOPWORDS = new Set([
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一个", "一些", "上", "也", "很",
    "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "那", "我们", "来", "他", "她",
    "它", "呢", "吧", "啊", "什么", "这儿", "那儿", "而", "与", "于", "对", "但", "或", "如果", "因为",
    "所以", "而且", "然后", "而是", "不是", "可以", "可能", "通过", "以及", "非常", "还是", "已经", "为了",
    "比如", "其中", "时候", "东西", "地方", "怎么", "就是", "又", "还", "只", "最", "更", "让", "给", "把",
    "被", "从", "向", "跟", "比", "到", "以", "及", "等", "得", "地", "着", "过", "吗", "嘛", "哦", "嗯",
    "这个", "那个", "现在", "那种", "这样", "那样", "这里", "那里", "哪里", "谁", "为什么", "怎样", "如何",
    "之", "为", "其", "所", "即", "便", "虽", "尽管", "即使", "不但", "不仅", "不管", "无论", "只要", "只有"
]);

// ===== 配色主题（扩展至 9~10 色，降低重复感） =====
const THEMES = {
    viridis: ['#440154', '#472878', '#3e4a89', '#31688e', '#26828e', '#21918c', '#35b779', '#90d743', '#fde725'],
    plasma: ['#0d0887', '#41049d', '#6a00a8', '#8f0da4', '#b12a90', '#cc4778', '#e16462', '#f2844b', '#f89540', '#f0f921'],
    cool: ['#6e40aa', '#5c3dbb', '#4c6edb', '#417de0', '#1f9ff4', '#1ac7c2', '#2af1b8', '#a1f93d', '#d8f224'],
    warm: ['#8c2a00', '#bd3700', '#e04f00', '#ff6e00', '#ff9100', '#ffc400', '#ffe135', '#ffeb90', '#fff7cc'],
    ocean: ['#001219', '#003d4a', '#005f73', '#0a9396', '#2ec4b6', '#4cc9b0', '#94d2bd', '#cce3de', '#e9d8a6'],
    random: null
};

// ===== 示例文本 =====
const DEMO_TEXT = `人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器，该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大，可以设想，未来人工智能带来的科技产品，将会是人类智慧的容器。人工智能可以对人的意识、思维的信息过程的模拟。人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。机器学习是人工智能的一个子集，它使用算法和统计模型来分析数据，并从中学习，以便做出预测或决策，而无需明确的编程指令。深度学习是机器学习的一个子领域，它基于人工神经网络，特别是深层神经网络。自然语言处理是人工智能和语言学领域的分支学科，研究人与计算机之间用自然语言进行有效通信的各种理论和方法。`;

const STORAGE_KEY = 'wordcloud_pro_v1';
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

let currentTheme = 'viridis';
let currentBg = '#ffffff';
let cachedWords = [];
let cachedWordList = [];
let cachedFreq = {};
let tooltipEl = null;
let aiAnalysisResult = null;
const AI_MODEL = 'deepseek-v4-flash';

document.addEventListener('DOMContentLoaded', () => {
    initTooltip();
    initEventListeners();
    initFoldablePanels();
    loadState();
    updateTextStats();
});

function initTooltip() {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'wc-tooltip';
    document.body.appendChild(tooltipEl);
}

function initEventListeners() {
    $('gen-btn').addEventListener('click', generateWordCloud);
    $('clear-btn').addEventListener('click', clearAll);
    $('download-btn').addEventListener('click', downloadImage);
    $('download-json-btn').addEventListener('click', downloadJSON);
    $('download-csv-btn').addEventListener('click', downloadCSV);
    $('demo-btn').addEventListener('click', loadDemo);
    $('regen-btn').addEventListener('click', () => generateWordCloud());

    const demoEmpty = $('demo-btn-empty');
    if (demoEmpty) demoEmpty.addEventListener('click', loadDemo);

    const jsonBtn2 = $('download-json-btn-2');
    if (jsonBtn2) jsonBtn2.addEventListener('click', downloadJSON);

    $('text-input').addEventListener('input', updateTextStats);
    const apiKeyInput = $('api-key');
    if (apiKeyInput) apiKeyInput.addEventListener('change', saveStateDebounced);
    const aiAnalyzeBtn = $('ai-analyze-btn');
    if (aiAnalyzeBtn) aiAnalyzeBtn.addEventListener('click', analyzeWithAI);
    const aiClearBtn = $('ai-clear-api-btn');
    if (aiClearBtn) aiClearBtn.addEventListener('click', () => {
        if ($('api-key')) $('api-key').value = '';
        saveStateDebounced();
        showToast('已清除 DeepSeek API Key', 'success');
    });
    const aiAcceptBtn = $('ai-accept-btn');
    if (aiAcceptBtn) aiAcceptBtn.addEventListener('click', openAIReviewDialog);
    const aiIgnoreBtn = $('ai-ignore-btn');
    if (aiIgnoreBtn) aiIgnoreBtn.addEventListener('click', () => {
        hideAIAnalysisPanel();
        generateWordCloud();
    });
    const aiReviewClose = $('ai-review-close');
    if (aiReviewClose) aiReviewClose.addEventListener('click', closeAIReviewDialog);
    const aiCancelSelectionBtn = $('ai-cancel-selection-btn');
    if (aiCancelSelectionBtn) aiCancelSelectionBtn.addEventListener('click', closeAIReviewDialog);
    const aiApplySelectionBtn = $('ai-apply-selection-btn');
    if (aiApplySelectionBtn) aiApplySelectionBtn.addEventListener('click', applySelectedAIReviewAndGenerate);

    const dropZone = $('drop-zone');
    dropZone.addEventListener('click', () => $('file-input').click());
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', handleFileDrop);
    $('file-input').addEventListener('change', handleFileSelect);

    $$('.preset-sizes .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $$('.preset-sizes .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            $('width').value = chip.dataset.w;
            $('height').value = chip.dataset.h;
            saveStateDebounced();
        });
    });
    ['width', 'height'].forEach(id => {
        $(id).addEventListener('change', () => {
            syncPresetState();
            saveStateDebounced();
        });
    });

    $$('.color-card').forEach(card => {
        card.addEventListener('click', () => {
            $$('.color-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentTheme = card.dataset.theme;
            saveStateDebounced();
        });
    });

    $$('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.bg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBg = btn.dataset.bg;
            if (currentBg !== 'transparent') {
                $('custom-bg').value = currentBg === '#0f172a' ? '#0f172a' : '#ffffff';
            }
            saveStateDebounced();
        });
    });
    $('custom-bg').addEventListener('input', e => {
        currentBg = e.target.value;
        $$('.bg-btn').forEach(b => b.classList.remove('active'));
        saveStateDebounced();
    });

    $('rotate-ratio').addEventListener('input', e => {
        $('rotate-val').textContent = e.target.value + '%';
    });

    // 绑定设置自动保存
    const saveTriggerIds = ['text-input', 'custom-stopwords', 'custom-fullwords', 'custom-mergegroups', 'width', 'height', 'use-default-stopwords', 'api-key'];
    saveTriggerIds.forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('change', saveStateDebounced);
    });
    ['rotate-ratio'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('change', saveStateDebounced);
    });

    // 键盘快捷键
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            generateWordCloud();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if ($('canvas-wrapper').style.display !== 'none') {
                downloadImage();
            }
        }
    });
}

function initFoldablePanels() {
    $$('.foldable').forEach(panel => {
        const header = panel.querySelector('.foldable-header');
        header.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            saveStateDebounced();
        });
    });
}

function syncPresetState() {
    const w = $('width').value;
    const h = $('height').value;
    $$('.preset-sizes .chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.w === w && chip.dataset.h === h);
    });
}

function updateTextStats() {
    const text = $('text-input').value;
    const len = text.length;
    const lines = text.split('\n').length;
    const chars = text.replace(/\s/g, '').length;
    const zhChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const warn = len > 50000 ? ' <span style="color:var(--warning)">（文本较长，生成可能需要更长时间）</span>' : '';
    $('text-stats').innerHTML = len > 0
        ? `${chars} 字符 · ${zhChars} 中文 · ${len} 字 · ${lines} 行${warn}`
        : '';
    saveStateDebounced();
}

function handleFileDrop(e) {
    e.preventDefault();
    $('drop-zone').classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) readFile(files[0]);
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) readFile(files[0]);
}

function readFile(file) {
    if (!file.type.match('text.*') && !file.name.endsWith('.txt') && !file.name.endsWith('.md') && !file.name.endsWith('.csv')) {
        showToast('请上传文本文件 (.txt, .md, .csv)', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        $('text-input').value = e.target.result;
        updateTextStats();
        showToast(`已加载: ${file.name}`, 'success');
    };
    reader.onerror = () => {
        showToast('文件读取失败，请检查文件是否损坏', 'error');
    };
    reader.readAsText(file);
}

async function callDeepSeekAPI(prompt, apiKey, model = AI_MODEL) {
    const url = 'https://api.deepseek.com/v1/chat/completions';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    const body = {
        model,
        messages: [
            { role: 'system', content: '你是一个中文文本分析助手。用户要求你以 JSON 格式输出分析结果，不要输出任何其他文字、markdown 代码块或解释，只输出纯 JSON 字符串。' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
    };
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `API 请求失败 (${response.status})`;
        try {
            const errJson = JSON.parse(errorText);
            errMsg += `: ${errJson.error?.message || errJson.message || errorText}`;
        } catch {
            errMsg += `: ${errorText}`;
        }
        throw new Error(errMsg);
    }
    const data = await response.json();
    const respContent = data.choices?.[0]?.message?.content || '';
    if (!respContent) {
        throw new Error('API 返回内容为空，请检查模型名称和 API Key 是否正确');
    }
    let jsonStr = respContent.trim();
    // 尝试从 markdown 代码块中提取
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    // 如果内容不以 { 开头，尝试查找第一个 {
    if (!jsonStr.startsWith('{')) {
        const firstBrace = jsonStr.indexOf('{');
        if (firstBrace !== -1) jsonStr = jsonStr.slice(firstBrace);
    }
    try {
        return JSON.parse(jsonStr);
    } catch (parseErr) {
        throw new Error(`JSON 解析失败: ${parseErr.message}。原始内容: ${respContent.slice(0, 200)}`);
    }
}

function buildDeepSeekPrompt(text) {
    return `请对以下中文文本进行智能分析，并以 JSON 格式输出结果。不要输出任何其他文字、解释或 markdown 代码块，只输出纯 JSON 字符串。

输出必须包含以下字段：
- mergeGroups: 二维数组，每组第一个是代表词，后面是近义词
- stopwords: 字符串数组，建议新增的停用词
- fullwords: 字符串数组，建议作为完整词保护的词组
- summary: 字符串，简要分析说明

示例格式：
{"mergeGroups":[["人工智能","AI","人工智慧"]],"stopwords":["非常","确实"],"fullwords":["深度学习"],"summary":"分析完成"}

待分析文本：
${text}`;
}

async function analyzeWithAI() {
    const apiKey = $('api-key')?.value.trim();
    const text = $('text-input')?.value.trim();
    if (!text) {
        showToast('请先输入文本后再进行 AI 分析', 'warning');
        return;
    }
    if (!apiKey) {
        showToast('请输入 DeepSeek API Key', 'warning');
        return;
    }
    const btn = $('ai-analyze-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '正在分析...';
    }
    try {
        const prompt = buildDeepSeekPrompt(text);
        const result = await callDeepSeekAPI(prompt, apiKey);
        aiAnalysisResult = {
            mergeGroups: Array.isArray(result.mergeGroups) ? result.mergeGroups : [],
            stopwords: Array.isArray(result.stopwords) ? result.stopwords : [],
            fullwords: Array.isArray(result.fullwords) ? result.fullwords : [],
            summary: result.summary || 'AI 分析已完成，请检查建议。'
        };
        renderAIAnalysis(aiAnalysisResult);
        showToast('AI 分析完成，可选择采纳结果', 'success');
        openAIReviewDialog();
    } catch (error) {
        console.error(error);
        const hint = error.message?.includes('model') || error.message?.includes('404')
            ? '（提示：请确认模型名称正确，当前使用 deepseek-v4-pro）'
            : '';
        showToast((error.message || 'AI 分析失败，请检查 API Key 或网络') + hint, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍 AI 分析文本';
        }
    }
}

function renderAIAnalysis(analysis) {
    renderAIModalContent(analysis);
}

function renderAIModalContent(analysis) {
    $('ai-review-summary').textContent = analysis.summary || 'AI 分析已完成。';
    const renderCheckboxItems = (containerId, items, prefix = '') => {
        const container = $(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-tip">无可供选择的建议。</div>';
            return;
        }
        items.forEach(item => {
            const entry = document.createElement('label');
            entry.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.value = typeof item === 'string' ? item : JSON.stringify(item);
            const text = document.createElement('span');
            text.textContent = prefix + (typeof item === 'string' ? item : item.join(' / '));
            entry.appendChild(checkbox);
            entry.appendChild(text);
            container.appendChild(entry);
        });
    };
    renderCheckboxItems('ai-review-merge-list', analysis.mergeGroups || []);
    renderCheckboxItems('ai-review-stopwords-list', analysis.stopwords || [], '停用词：');
    renderCheckboxItems('ai-review-fullwords-list', analysis.fullwords || [], '完整词：');
}

function hideAIAnalysisPanel() {
    const modal = $('ai-review-modal');
    if (modal) modal.style.display = 'none';
}

function appendUniqueWordsToField(fieldId, words) {
    if (!Array.isArray(words) || words.length === 0) return;
    const field = $(fieldId);
    if (!field) return;
    const existing = new Set(field.value.split(/[\s,，]+/).filter(Boolean));
    words.forEach(word => {
        if (typeof word === 'string' && word.trim()) existing.add(word.trim());
    });
    field.value = Array.from(existing).join(' ');
}

function mergeWordGroups(wordList, mergeGroups) {
    if (!Array.isArray(mergeGroups) || mergeGroups.length === 0) return wordList;
    const mapping = {};
    mergeGroups.forEach(group => {
        if (!Array.isArray(group) || group.length === 0) return;
        const representative = group[0];
        group.forEach(word => {
            if (word) mapping[word] = representative;
        });
    });
    const merged = {};
    wordList.forEach(([word, count]) => {
        const key = mapping[word] || word;
        merged[key] = (merged[key] || 0) + count;
    });
    return Object.entries(merged).sort((a, b) => b[1] - a[1]);
}

function openAIReviewDialog() {
    if (!aiAnalysisResult) {
        showToast('请先执行 AI 分析', 'warning');
        return;
    }
    renderAIModalContent(aiAnalysisResult);
    const modal = $('ai-review-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAIReviewDialog() {
    const modal = $('ai-review-modal');
    if (modal) modal.style.display = 'none';
}

function applySelectedAIReviewAndGenerate() {
    if (!aiAnalysisResult) {
        showToast('请先执行 AI 分析', 'warning');
        return;
    }

    const selectedMergeGroups = Array.from(document.querySelectorAll('#ai-review-merge-list input[type="checkbox"]:checked'))
        .map(el => JSON.parse(el.dataset.value));
    const selectedStopwords = Array.from(document.querySelectorAll('#ai-review-stopwords-list input[type="checkbox"]:checked'))
        .map(el => el.dataset.value);
    const selectedFullwords = Array.from(document.querySelectorAll('#ai-review-fullwords-list input[type="checkbox"]:checked'))
        .map(el => el.dataset.value);

    appendUniqueWordsToField('custom-stopwords', selectedStopwords);
    appendUniqueWordsToField('custom-fullwords', selectedFullwords);

    // 把 AI 建议的合并词组写入设置面板，用户可手动修改
    if (selectedMergeGroups.length > 0) {
        const existing = getMergeGroups();
        const existingKeys = new Set(existing.map(g => g[0]));
        const newGroups = selectedMergeGroups.filter(g => !existingKeys.has(g[0]));
        if (newGroups.length > 0) {
            const lines = newGroups.map(g => g.join(' '));
            const current = $('custom-mergegroups').value.trim();
            $('custom-mergegroups').value = current ? current + '\n' + lines.join('\n') : lines.join('\n');
        }
    }

    saveStateDebounced();
    closeAIReviewDialog();
    hideAIAnalysisPanel();

    showToast('已采纳 AI 建议，请调整设置后点击「生成词云」', 'success');
}

function getStopwords() {
    const stopwords = new Set();
    if ($('use-default-stopwords').checked) {
        DEFAULT_STOPWORDS.forEach(w => stopwords.add(w));
    }
    const custom = $('custom-stopwords').value.trim();
    if (custom) {
        custom.split(/[\s,，]+/).filter(w => w.length > 0).forEach(w => stopwords.add(w));
    }
    return stopwords;
}

function getFullWords() {
    const input = $('custom-fullwords').value.trim();
    if (!input) return [];
    return input.split(/[\s,，]+/).filter(w => w.length > 0).sort((a, b) => b.length - a.length);
}

function getMergeGroups() {
    const input = $('custom-mergegroups').value.trim();
    if (!input) return [];
    return input.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.split(/[\s,，|]+/).filter(w => w.length > 0))
        .filter(group => group.length >= 2);
}

function segmentDefault(text, stopwords, minLength) {
    // 优先使用 Intl.Segmenter（现代浏览器原生支持）
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
            const segments = Array.from(segmenter.segment(text));
            const words = [];
            for (const seg of segments) {
                const word = seg.segment.trim();
                if (word.length >= minLength &&
                    !stopwords.has(word) &&
                    !/^\d+$/.test(word) &&
                    !/^[\p{P}\p{S}\s]+$/u.test(word) &&
                    !/^[a-zA-Z]$/.test(word)) {
                    words.push(word);
                }
            }
            return words;
        } catch (e) {
            console.warn('Intl.Segmenter failed, falling back', e);
        }
    }
    // Fallback：兼容旧版浏览器（Firefox < 125, Safari < 16.4 等）
    return fallbackSegment(text, stopwords, minLength);
}

function fallbackSegment(text, stopwords, minLength) {
    const words = [];
    // 提取中文连续片段（>=2字）和英文单词（>=2字母）
    const regex = /[\u4e00-\u9fff]{2,}|[a-zA-Z]{2,}|\d+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const str = match[0];
        if (/^[\u4e00-\u9fff]+$/.test(str)) {
            const maxLen = Math.min(4, str.length);
            const startLen = Math.max(minLength, 2);
            for (let l = startLen; l <= maxLen; l++) {
                for (let i = 0; i <= str.length - l; i++) {
                    const w = str.slice(i, i + l);
                    if (!stopwords.has(w)) words.push(w);
                }
            }
        } else if (/^[a-zA-Z]+$/.test(str) && str.length >= minLength && !stopwords.has(str)) {
            words.push(str.toLowerCase());
        }
    }
    return words;
}

function segment(text, stopwords, fullWords, minLength) {
    if (fullWords.length === 0) {
        return segmentDefault(text, stopwords, minLength);
    }
    const matches = [];
    const used = new Array(text.length).fill(false);
    for (const fw of fullWords) {
        if (stopwords.has(fw)) continue;
        let pos = 0;
        while ((pos = text.indexOf(fw, pos)) !== -1) {
            let overlap = false;
            for (let i = pos; i < pos + fw.length; i++) {
                if (used[i]) { overlap = true; break; }
            }
            if (!overlap) {
                matches.push({ start: pos, end: pos + fw.length, word: fw });
                for (let i = pos; i < pos + fw.length; i++) used[i] = true;
            }
            pos += 1;
        }
    }
    matches.sort((a, b) => a.start - b.start);
    const remainingParts = [];
    let lastEnd = 0;
    for (const m of matches) {
        if (m.start > lastEnd) {
            remainingParts.push(text.slice(lastEnd, m.start));
        }
        lastEnd = Math.max(lastEnd, m.end);
    }
    if (lastEnd < text.length) {
        remainingParts.push(text.slice(lastEnd));
    }
    // 用空格拼接剩余片段，避免边界字符粘连产生无意义词
    const remainingText = remainingParts.join(' ');
    const segmentWords = segmentDefault(remainingText, stopwords, minLength);
    const fullWordResults = matches.map(m => m.word);
    return [...segmentWords, ...fullWordResults];
}

// ===== 生成词云 =====
function generateWordCloud(options = {}) {
    if ($('gen-btn').disabled) return; // 防止重复触发

    if (typeof WordCloud === 'undefined') {
        showToast('词云库加载失败，请刷新页面重试', 'error');
        return;
    }

    const text = $('text-input').value.trim();
    if (!text) {
        showToast('请先输入或导入文本', 'warning');
        $('text-input').focus();
        return;
    }

    const aiAnalysis = options.aiAnalysis || null;
    const width = parseInt($('width').value) || 1200;
    const height = parseInt($('height').value) || 800;
    const maxWords = 60;
    const minLength = 2;
    const minSize = 10;
    const gridSize = 6;
    const rotateRatio = parseInt($('rotate-ratio').value) / 100;
    const shrinkToFit = true;
    const fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif';

    const stopwords = getStopwords();
    const fullWords = getFullWords();

    const btn = $('gen-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span>生成中...';

    $('loading-overlay').style.display = 'flex';
    $('empty-state').style.display = 'none';
    $('canvas-wrapper').style.display = 'none';
    $('results-panel').style.display = 'none';

    // 使用 setTimeout 让 UI 先渲染 loading 状态
    setTimeout(() => {
        let canvas = null;
        let cloudTimeout = null;
        let onWordCloudStop = null;
        let onWordCloudAbort = null;

        try {
            const words = segment(text, stopwords, fullWords, minLength);
            if (words.length === 0) {
                showToast('未提取到有效词语，请检查设置', 'warning');
                resetUI(btn);
                return;
            }

            let freq = {};
            words.forEach(w => freq[w] = (freq[w] || 0) + 1);

            let wordList = Object.entries(freq)
                .map(([word, count]) => [word, count])
                .sort((a, b) => b[1] - a[1]);

            const mergeGroups = getMergeGroups();
            if (mergeGroups.length > 0) {
                wordList = mergeWordGroups(wordList, mergeGroups);
                const mergedFreq = Object.fromEntries(wordList);
                freq = mergedFreq;
            }

            wordList = wordList.slice(0, maxWords);
            cachedWords = words;
            cachedFreq = freq;
            cachedWordList = wordList;

            canvas = $('wordcloud-canvas');
            canvas.width = width;
            canvas.height = height;

            const maxCount = wordList[0][1];
            const minCount = wordList[wordList.length - 1][1];
            const minDim = Math.min(width, height);

            // 优化字号映射：让大画布和少词数时自动放大词语，避免中央小云块
            const weightFactor = size => {
                if (maxCount === minCount) return Math.max(minSize, Math.round(minDim * 0.12));
                const normalized = size / maxCount;
                // More aggressive: power 0.45 for wider range, larger coefficient for bigger words
                const adjusted = Math.pow(normalized, 0.45);
                // Larger coefficient (0.42) to push words toward edges
                return Math.max(minSize, Math.round(adjusted * minDim * 0.42));
            };

            const theme = THEMES[currentTheme];
            let completeCalled = false;

            onWordCloudStop = () => completeWordCloud();
            onWordCloudAbort = () => {
                completeWordCloud();
                showToast('词云生成已中止，显示当前结果。', 'warning');
            };
            canvas.addEventListener('wordcloudstop', onWordCloudStop);
            canvas.addEventListener('wordcloudabort', onWordCloudAbort);

            WordCloud(canvas, {
                list: wordList,
                gridSize: Math.max(1, gridSize),
                weightFactor: weightFactor,
                fontFamily: fontFamily,
                color: theme ? () => theme[Math.floor(Math.random() * theme.length)] : 'random-dark',
                rotateRatio: rotateRatio,
                rotationSteps: 2,
                backgroundColor: currentBg === 'transparent' ? 'rgba(0,0,0,0)' : currentBg,
                drawOutOfBound: false,
                shrinkToFit: shrinkToFit,
                shape: 'square',
                clearCanvas: true,
                wait: 5,
                abortThreshold: 0, // 禁用超时，确保尽量填满画布
                minSize: 6,
                hover: (item, dimension, event) => {
                    if (item) {
                        showTooltip(item[0], item[1], event);
                        canvas.style.cursor = 'pointer';
                    } else {
                        hideTooltip();
                        canvas.style.cursor = 'default';
                    }
                },
                click: (item) => {
                    if (item) {
                        copyToClipboard(item[0]);
                        showToast(`已复制 "${item[0]}"`, 'success');
                    }
                }
            });

            cloudTimeout = setTimeout(() => {
                if (!completeCalled) {
                    console.warn('WordCloud generation timeout: no completion event fired');
                    canvas.removeEventListener('wordcloudstop', onWordCloudStop);
                    canvas.removeEventListener('wordcloudabort', onWordCloudAbort);
                    $('loading-overlay').style.display = 'none';
                    btn.disabled = false;
                    btn.innerHTML = '<span class="btn-icon">✨</span>生成词云';
                    showToast('生成超时，可能文本过大或浏览器性能不足，请尝试缩短文本或降低词数', 'warning');
                }
            }, 15000);

            function completeWordCloud() {
                if (completeCalled) return;
                completeCalled = true;
                clearTimeout(cloudTimeout);
                canvas.removeEventListener('wordcloudstop', onWordCloudStop);
                canvas.removeEventListener('wordcloudabort', onWordCloudAbort);
                $('canvas-wrapper').style.display = 'block';
                $('results-panel').style.display = 'block';
                $('stat-total').textContent = words.length.toLocaleString();
                $('stat-unique').textContent = wordList.length.toLocaleString();
                $('stat-stopwords').textContent = stopwords.size.toLocaleString();
                $('stat-fullwords').textContent = fullWords.length.toLocaleString();
                renderWordList(wordList);
                resetUI(btn);
                showToast('词云生成完成！', 'success');
            }

        } catch (e) {
            console.error(e);
            showToast('生成失败: ' + e.message, 'error');
            $('empty-state').style.display = 'block';
            if (typeof cloudTimeout === 'number') {
                clearTimeout(cloudTimeout);
            }
            if (canvas) {
                if (onWordCloudStop) canvas.removeEventListener('wordcloudstop', onWordCloudStop);
                if (onWordCloudAbort) canvas.removeEventListener('wordcloudabort', onWordCloudAbort);
            }
            resetUI(btn);
        }
    }, 50);
}

function resetUI(btn) {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span>生成词云';
    $('loading-overlay').style.display = 'none';
}

function renderWordList(wordList) {
    const container = $('word-list');
    container.innerHTML = '';
    wordList.slice(0, 30).forEach(([word, count], index) => {
        const tag = document.createElement('span');
        tag.className = 'word-tag';
        tag.style.animationDelay = `${index * 0.03}s`;
        const rank = index < 3
            ? ['🥇', '🥈', '🥉'][index]
            : `<span class="rank-num">${index + 1}</span>`;
        const displayCount = Number.isFinite(count) ? Math.round(count) : count;
        tag.innerHTML = `<span class="rank">${rank}</span>${word}<span class="freq">${displayCount}</span>`;
        tag.title = '点击复制词语';
        tag.style.cursor = 'pointer';
        tag.addEventListener('click', () => {
            copyToClipboard(word);
            showToast(`已复制 "${word}"`, 'success');
        });
        container.appendChild(tag);
    });
}

function showTooltip(word, count, event) {
    const freqValue = cachedFreq[word] || count;
    const freq = Number.isFinite(freqValue) ? Math.round(freqValue) : freqValue;
    tooltipEl.textContent = `${word} · 出现 ${freq} 次`;
    tooltipEl.style.left = (event.clientX + 16) + 'px';
    tooltipEl.style.top = (event.clientY + 16) + 'px';
    tooltipEl.classList.add('visible');
}

function hideTooltip() {
    tooltipEl.classList.remove('visible');
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function downloadImage() {
    const canvas = $('wordcloud-canvas');
    if (!canvas || canvas.width === 0) {
        showToast('请先生成词云', 'warning');
        return;
    }
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `wordcloud_${canvas.width}x${canvas.height}_${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('图片下载已开始', 'success');
}

function downloadJSON() {
    if (!cachedWordList.length) {
        showToast('请先生成词云', 'warning');
        return;
    }
    const data = {
        generatedAt: new Date().toISOString(),
        totalWords: cachedWords.length,
        uniqueWords: cachedWordList.length,
        stopwordsCount: getStopwords().size,
        fullWordsCount: getFullWords().length,
        wordFrequency: cachedWordList.map(([word, count]) => ({ word, count: Number.isFinite(count) ? Math.round(count) : count }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `wordcloud_data_${timestamp}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('词频数据已导出', 'success');
}

function downloadCSV() {
    if (!cachedWordList.length) {
        showToast('请先生成词云', 'warning');
        return;
    }
    const rows = [['排名', '词语', '频次']];
    cachedWordList.forEach(([word, count], i) => {
        const displayCount = Number.isFinite(count) ? Math.round(count) : count;
        rows.push([i + 1, word, displayCount]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `wordcloud_freq_${timestamp}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('词频 CSV 已导出', 'success');
}

function clearAll() {
    const hasContent = $('text-input').value.trim() ||
        $('custom-stopwords').value.trim() ||
        $('custom-fullwords').value.trim();
    if (hasContent && !confirm('确定要清空所有内容和设置吗？')) return;
    $('text-input').value = '';
    $('custom-stopwords').value = '';
    $('custom-fullwords').value = '';
    $('custom-mergegroups').value = '';
    $('empty-state').style.display = 'block';
    $('canvas-wrapper').style.display = 'none';
    $('results-panel').style.display = 'none';
    updateTextStats();
    saveStateDebounced();
    showToast('已清空所有内容', 'success');
}

function loadDemo() {
    $('text-input').value = DEMO_TEXT;
    updateTextStats();
    showToast('已加载示例文本，点击「生成词云」查看效果', 'success');
    setTimeout(() => {
        $('gen-btn').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function showToast(message, type = 'info') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = { success: '✅ ', error: '❌ ', warning: '⚠️ ', info: 'ℹ️ ' }[type] || '';
    toast.textContent = icon + message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== 状态保存与恢复 =====
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

const saveStateDebounced = debounce(() => {
    const state = {
        text: $('text-input').value,
        customStopwords: $('custom-stopwords').value,
        customFullwords: $('custom-fullwords').value,
        customMergegroups: $('custom-mergegroups').value,
        settings: {
            width: $('width').value,
            height: $('height').value,
            rotateRatio: $('rotate-ratio').value,
            theme: currentTheme,
            bg: currentBg,
            useDefaultStopwords: $('use-default-stopwords').checked
        }
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { }
}, 600);

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const state = JSON.parse(raw);
        if (state.text !== undefined) $('text-input').value = state.text;
        if (state.customStopwords !== undefined) $('custom-stopwords').value = state.customStopwords;
        if (state.customFullwords !== undefined) $('custom-fullwords').value = state.customFullwords;
        if (state.customMergegroups !== undefined) $('custom-mergegroups').value = state.customMergegroups;
        const s = state.settings || {};
        if (s.width !== undefined) $('width').value = s.width;
        if (s.height !== undefined) $('height').value = s.height;
        if (s.rotateRatio !== undefined) {
            $('rotate-ratio').value = s.rotateRatio;
            $('rotate-val').textContent = s.rotateRatio + '%';
        }
        if (s.theme) {
            currentTheme = s.theme;
            $$('.color-card').forEach(c => c.classList.toggle('active', c.dataset.theme === s.theme));
        }
        if (s.bg !== undefined) {
            currentBg = s.bg;
            const bgBtn = document.querySelector(`.bg-btn[data-bg="${s.bg}"]`);
            if (bgBtn) {
                $$('.bg-btn').forEach(b => b.classList.remove('active'));
                bgBtn.classList.add('active');
            } else if (s.bg !== 'transparent') {
                $('custom-bg').value = s.bg;
                $$('.bg-btn').forEach(b => b.classList.remove('active'));
            }
        }
        if (s.useDefaultStopwords !== undefined) $('use-default-stopwords').checked = s.useDefaultStopwords;

        syncPresetState();
        return true;
    } catch (e) {
        console.error('Load state failed', e);
        return false;
    }
}