// グローバル変数
let historyData = JSON.parse(localStorage.getItem('cookHistory')) || [];

// DOM要素の取得
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const resultSection = document.getElementById('resultSection');
const scoreElement = document.getElementById('score');
const goodPointsElement = document.getElementById('goodPoints');
const improvementsElement = document.getElementById('improvements');
const showHistoryBtn = document.getElementById('showHistory');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadHistory();
});

// イベントリスナーの設定
function initializeEventListeners() {
    // ドラッグ&ドロップ
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // ファイル選択
    imageInput.addEventListener('change', handleFileSelect);
    
    // 履歴ボタン
    showHistoryBtn.addEventListener('click', showHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
}

// ドラッグオーバー処理
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

// ドラッグリーブ処理
function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

// ドロップ処理
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processImage(files[0]);
    }
}

// ファイル選択処理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

// 画像処理
function processImage(file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        evaluateDish(imageData);
    };
    reader.readAsDataURL(file);
}

// 料理評価ロジック
function evaluateDish(imageData) {
    // シミュレーション用の評価ロジック
    // 実際のアプリでは、AI画像認識APIを使用
    
    const score = Math.floor(Math.random() * 40) + 60; // 60-100点のランダムスコア
    const evaluation = generateEvaluation(score);
    
    displayResult(score, evaluation);
    saveToHistory(score, evaluation);
}

// 評価生成
function generateEvaluation(score) {
    const goodPoints = [];
    const improvements = [];
    
    // スコアに基づく評価
    if (score >= 90) {
        goodPoints.push('栄養バランスが非常に良いです');
        goodPoints.push('彩り豊かで見た目も美しいです');
        goodPoints.push('野菜が豊富に含まれています');
        if (Math.random() > 0.5) {
            goodPoints.push('タンパク質の摂取量が適切です');
        }
    } else if (score >= 80) {
        goodPoints.push('全体的にバランスの取れた料理です');
        goodPoints.push('野菜が適度に含まれています');
        if (Math.random() > 0.5) {
            goodPoints.push('カロリーが適切です');
        }
    } else if (score >= 70) {
        goodPoints.push('基本的な栄養素は含まれています');
        if (Math.random() > 0.5) {
            goodPoints.push('見た目が良いです');
        }
    } else {
        goodPoints.push('料理を作った努力は素晴らしいです');
    }
    
    // 改善点の生成
    if (score < 90) {
        const improvementOptions = [
            '野菜をもう少し増やしてみましょう',
            '彩りを豊かにするために色とりどりの野菜を加えてみてください',
            'タンパク質の量を調整してみましょう',
            '油の使用量を控えめにしてみてください',
            '塩分を控えめにしてみましょう',
            '食物繊維を多く含む食材を加えてみてください',
            'ビタミンCを多く含む食材を加えてみてください'
        ];
        
        const numImprovements = Math.min(3, Math.floor((100 - score) / 20) + 1);
        for (let i = 0; i < numImprovements; i++) {
            const randomImprovement = improvementOptions[Math.floor(Math.random() * improvementOptions.length)];
            if (!improvements.includes(randomImprovement)) {
                improvements.push(randomImprovement);
            }
        }
    }
    
    return { goodPoints, improvements };
}

// 結果表示
function displayResult(score, evaluation) {
    scoreElement.textContent = score;
    
    // 良い点の表示
    goodPointsElement.innerHTML = '';
    evaluation.goodPoints.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        goodPointsElement.appendChild(li);
    });
    
    // 改善点の表示
    improvementsElement.innerHTML = '';
    evaluation.improvements.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        improvementsElement.appendChild(li);
    });
    
    // 結果セクションを表示
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 履歴に保存
function saveToHistory(score, evaluation) {
    const historyItem = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ja-JP'),
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        score: score,
        goodPoints: evaluation.goodPoints,
        improvements: evaluation.improvements
    };
    
    historyData.unshift(historyItem); // 最新を先頭に
    
    // 1週間分のみ保持（7日分）
    if (historyData.length > 7) {
        historyData = historyData.slice(0, 7);
    }
    
    localStorage.setItem('cookHistory', JSON.stringify(historyData));
}

// 履歴の読み込み
function loadHistory() {
    historyData = JSON.parse(localStorage.getItem('cookHistory')) || [];
}

// 履歴の表示
function showHistory() {
    if (historyData.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">まだ履歴がありません。料理を評価してみましょう！</p>';
        return;
    }
    
    historyList.innerHTML = '';
    
    historyData.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <span class="history-date">${item.date} ${item.time}</span>
                <span class="history-score">${item.score}点</span>
            </div>
            <div class="history-feedback">
                <div class="history-good">
                    <h4>✅ 良い点</h4>
                    <ul>
                        ${item.goodPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
                <div class="history-improve">
                    <h4>💡 改善点</h4>
                    <ul>
                        ${item.improvements.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// 履歴のクリア
function clearHistory() {
    if (confirm('履歴をすべて削除しますか？')) {
        historyData = [];
        localStorage.removeItem('cookHistory');
        historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">履歴がクリアされました。</p>';
    }
}
