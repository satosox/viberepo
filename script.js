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
async function evaluateDish(imageData) {
    try {
        // ローディング状態を表示
        showLoadingState();
        
        // Hugging Faceの無料APIを使用して画像認識
        const aiAnalysis = await analyzeImageWithAI(imageData);
        
        // AI分析結果に基づいて評価を生成
        const score = calculateNutritionScore(aiAnalysis);
        const evaluation = generateAIEvaluation(aiAnalysis, score);
        
        displayResult(score, evaluation, aiAnalysis);
        saveToHistory(score, evaluation);
        
    } catch (error) {
        console.error('AI分析エラー:', error);
        // エラー時はフォールバック評価を使用
        const score = Math.floor(Math.random() * 40) + 60;
        const evaluation = generateEvaluation(score);
        displayResult(score, evaluation);
        saveToHistory(score, evaluation);
        showErrorMessage('AI分析に失敗しました。フォールバック評価を表示しています。');
    }
}

// AI画像分析（無料の画像認識API使用）
async function analyzeImageWithAI(imageData) {
    try {
        // Base64データをBlobに変換
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Hugging Faceの無料API（トークン不要）
        const formData = new FormData();
        formData.append('image', blob);
        
        const apiResponse = await fetch('https://api-inference.huggingface.co/models/nateraw/food-image-classification', {
            method: 'POST',
            body: formData
        });
        
        if (!apiResponse.ok) {
            // APIが利用できない場合は、画像の色分析による代替実装
            return await analyzeImageColors(imageData);
        }
        
        const result = await apiResponse.json();
        
        // エラーレスポンスの場合は代替実装を使用
        if (result.error) {
            return await analyzeImageColors(imageData);
        }
        
        return result;
        
    } catch (error) {
        console.log('API呼び出し失敗、代替分析を使用:', error);
        return await analyzeImageColors(imageData);
    }
}

// 画像の色分析による代替実装
async function analyzeImageColors(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 色分析による食材推定
            const analysis = analyzeColors(data);
            resolve(analysis);
        };
        img.src = imageData;
    });
}

// 色分析による食材推定
function analyzeColors(data) {
    let greenCount = 0;
    let redCount = 0;
    let brownCount = 0;
    let yellowCount = 0;
    let totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 緑色（野菜）の検出
        if (g > r && g > b && g > 100) {
            greenCount++;
        }
        // 赤色（肉、トマトなど）の検出
        else if (r > g && r > b && r > 100) {
            redCount++;
        }
        // 茶色（肉、パンなど）の検出
        else if (r > 80 && g > 60 && b < 80 && r > g && r > b) {
            brownCount++;
        }
        // 黄色（卵、チーズなど）の検出
        else if (r > 150 && g > 150 && b < 100) {
            yellowCount++;
        }
    }
    
    const results = [];
    
    // 緑色が多い場合
    if (greenCount / totalPixels > 0.1) {
        results.push({ label: 'vegetables', score: greenCount / totalPixels });
    }
    
    // 赤色が多い場合
    if (redCount / totalPixels > 0.1) {
        results.push({ label: 'meat_or_tomato', score: redCount / totalPixels });
    }
    
    // 茶色が多い場合
    if (brownCount / totalPixels > 0.1) {
        results.push({ label: 'bread_or_meat', score: brownCount / totalPixels });
    }
    
    // 黄色が多い場合
    if (yellowCount / totalPixels > 0.1) {
        results.push({ label: 'egg_or_cheese', score: yellowCount / totalPixels });
    }
    
    // デフォルトの結果
    if (results.length === 0) {
        results.push({ label: 'mixed_dish', score: 0.5 });
    }
    
    return results;
}

// 栄養スコア計算
function calculateNutritionScore(aiAnalysis) {
    let score = 50; // ベーススコア
    
    // AI分析結果に基づくスコア調整
    if (aiAnalysis && aiAnalysis.length > 0) {
        aiAnalysis.forEach(prediction => {
            const label = prediction.label.toLowerCase();
            const confidence = prediction.score;
            
            // 健康的な食材の検出
            if (label.includes('vegetables') || label.includes('vegetable')) {
                score += 20 * confidence;
            } else if (label.includes('meat_or_tomato') || label.includes('fish') || label.includes('chicken')) {
                score += 15 * confidence;
            } else if (label.includes('bread_or_meat') || label.includes('pasta') || label.includes('rice')) {
                score += 10 * confidence;
            } else if (label.includes('egg_or_cheese')) {
                score += 12 * confidence;
            } else if (label.includes('pizza') || label.includes('burger') || label.includes('fried')) {
                score -= 10 * confidence;
            }
        });
    }
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

// AI分析結果に基づく評価生成
function generateAIEvaluation(aiAnalysis, score) {
    const goodPoints = [];
    const improvements = [];
    
    if (aiAnalysis && aiAnalysis.length > 0) {
        const detectedItems = aiAnalysis.map(p => p.label.toLowerCase());
        
        // 検出された食材に基づく評価
        if (detectedItems.some(item => item.includes('vegetables') || item.includes('vegetable'))) {
            goodPoints.push('野菜が豊富に含まれています');
            goodPoints.push('ビタミンとミネラルが豊富です');
        }
        
        if (detectedItems.some(item => item.includes('meat_or_tomato') || item.includes('fish') || item.includes('chicken'))) {
            goodPoints.push('良質なタンパク質が含まれています');
        }
        
        if (detectedItems.some(item => item.includes('egg_or_cheese'))) {
            goodPoints.push('タンパク質とカルシウムが豊富です');
        }
        
        if (detectedItems.some(item => item.includes('bread_or_meat'))) {
            goodPoints.push('炭水化物が適度に含まれています');
        }
        
        // 改善点の提案
        if (!detectedItems.some(item => item.includes('vegetables') || item.includes('vegetable'))) {
            improvements.push('野菜をもう少し加えてみましょう');
        }
        
        if (detectedItems.some(item => item.includes('pizza') || item.includes('burger'))) {
            improvements.push('油分を控えめにした料理に挑戦してみてください');
        }
        
        // 色の多様性に基づく評価
        if (detectedItems.length >= 3) {
            goodPoints.push('彩り豊かで栄養バランスが良いです');
        } else if (detectedItems.length === 1) {
            improvements.push('他の食材も加えて栄養バランスを整えましょう');
        }
    }
    
    // スコアに基づく一般的な評価
    if (score >= 90) {
        goodPoints.push('栄養バランスが非常に良いです');
        goodPoints.push('健康的な料理です');
    } else if (score >= 80) {
        goodPoints.push('全体的にバランスの取れた料理です');
    } else if (score >= 70) {
        goodPoints.push('基本的な栄養素は含まれています');
    } else {
        goodPoints.push('料理を作った努力は素晴らしいです');
    }
    
    // 改善点の追加
    if (score < 90) {
        const improvementOptions = [
            '野菜をもう少し増やしてみましょう',
            '彩りを豊かにするために色とりどりの野菜を加えてみてください',
            'タンパク質の量を調整してみましょう',
            '油の使用量を控えめにしてみてください',
            '塩分を控えめにしてみましょう',
            '食物繊維を多く含む食材を加えてみてください'
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

// ローディング状態の表示
function showLoadingState() {
    resultSection.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>AIが料理を分析中...</p>
        </div>
    `;
    resultSection.style.display = 'block';
}

// エラーメッセージの表示
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <strong>⚠️ ${message}</strong>
        </div>
    `;
    resultSection.appendChild(errorDiv);
}

// 評価生成（フォールバック用）
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

// 結果表示（アニメーション付き）
async function displayResult(score, evaluation, aiAnalysis = null) {
    // 結果セクションのHTMLを再構築
    resultSection.innerHTML = `
        <div class="score-display">
            <div class="score-circle">
                <span class="score" id="animatedScore">0</span>
                <span class="score-label">点</span>
            </div>
        </div>
        
        <div id="aiAnalysisContainer" style="display: none;"></div>
        
        <div class="feedback">
            <div class="good-points">
                <h3>✅ 良い点</h3>
                <ul id="goodPoints"></ul>
            </div>
            <div class="improvements">
                <h3>💡 改善点</h3>
                <ul id="improvements"></ul>
            </div>
        </div>
    `;
    
    // 結果セクションを表示
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
    
    // スコアを徐々にカウントアップ
    await animateScore(score);
    
    // 少し待ってからAI分析結果を表示
    await new Promise(resolve => setTimeout(resolve, 300));
    if (aiAnalysis) {
        await displayAIAnalysis(aiAnalysis);
    }
    
    // 少し待ってから良い点を表示
    await new Promise(resolve => setTimeout(resolve, 300));
    await displayGoodPoints(evaluation.goodPoints);
    
    // 最後に改善点を表示
    await new Promise(resolve => setTimeout(resolve, 300));
    await displayImprovements(evaluation.improvements);
}

// スコアをアニメーション
function animateScore(targetScore) {
    return new Promise(resolve => {
        const scoreElement = document.getElementById('animatedScore');
        let currentScore = 0;
        const increment = targetScore / 30; // 30フレームでカウントアップ
        const duration = 1000; // 1秒
        
        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                scoreElement.textContent = targetScore;
                clearInterval(timer);
                // 最終スコア到達時のパルス効果
                scoreElement.classList.add('score-animating');
                setTimeout(() => {
                    scoreElement.classList.remove('score-animating');
                }, 300);
                resolve();
            } else {
                scoreElement.textContent = Math.floor(currentScore);
            }
        }, duration / 30);
    });
}

// AI分析結果をアニメーション付きで表示
function displayAIAnalysis(aiAnalysis) {
    return new Promise(resolve => {
        const container = document.getElementById('aiAnalysisContainer');
        container.innerHTML = createAIAnalysisInfo(aiAnalysis);
        container.style.display = 'block';
        
        // フェードイン効果
        container.style.opacity = '0';
        const fadeIn = setInterval(() => {
            const currentOpacity = parseFloat(container.style.opacity);
            if (currentOpacity < 1) {
                container.style.opacity = (currentOpacity + 0.1).toString();
            } else {
                clearInterval(fadeIn);
                resolve();
            }
        }, 30);
    });
}

// 良い点をアニメーション付きで表示
function displayGoodPoints(goodPoints) {
    return new Promise(async (resolve) => {
        const goodPointsElement = document.getElementById('goodPoints');
        goodPointsElement.innerHTML = '';
        
        for (let i = 0; i < goodPoints.length; i++) {
            const point = goodPoints[i];
            const li = document.createElement('li');
            li.textContent = '';
            li.style.opacity = '0';
            goodPointsElement.appendChild(li);
            
            await typeWriter(li, point, 30);
            
            // フェードイン効果
            const fadeIn = setInterval(() => {
                const currentOpacity = parseFloat(li.style.opacity);
                if (currentOpacity < 1) {
                    li.style.opacity = (currentOpacity + 0.2).toString();
                } else {
                    clearInterval(fadeIn);
                }
            }, 20);
            
            // 次のポイントまで少し待つ
            await new Promise(r => setTimeout(r, 200));
        }
        
        resolve();
    });
}

// 改善点をアニメーション付きで表示
function displayImprovements(improvements) {
    return new Promise(async (resolve) => {
        const improvementsElement = document.getElementById('improvements');
        improvementsElement.innerHTML = '';
        
        for (let i = 0; i < improvements.length; i++) {
            const point = improvements[i];
            const li = document.createElement('li');
            li.textContent = '';
            li.style.opacity = '0';
            improvementsElement.appendChild(li);
            
            await typeWriter(li, point, 30);
            
            // フェードイン効果
            const fadeIn = setInterval(() => {
                const currentOpacity = parseFloat(li.style.opacity);
                if (currentOpacity < 1) {
                    li.style.opacity = (currentOpacity + 0.2).toString();
                } else {
                    clearInterval(fadeIn);
                }
            }, 20);
            
            // 次のポイントまで少し待つ
            await new Promise(r => setTimeout(r, 200));
        }
        
        resolve();
    });
}

// タイプライター効果
function typeWriter(element, text, speed) {
    return new Promise((resolve) => {
        let index = 0;
        const cursor = '<span class="typing-cursor">|</span>';
        
        const timer = setInterval(() => {
            if (index < text.length) {
                element.innerHTML = text.substring(0, index + 1) + cursor;
                index++;
            } else {
                element.textContent = text; // カーソルを削除
                clearInterval(timer);
                resolve();
            }
        }, speed);
    });
}

// AI分析結果の表示用HTML生成
function createAIAnalysisInfo(aiAnalysis) {
    if (!aiAnalysis || aiAnalysis.length === 0) return '';
    
    const topItems = aiAnalysis.slice(0, 3).map((item, index) => ({
        label: item.label,
        confidence: Math.round(item.score * 100),
        delay: index * 150
    }));
    
    return `
        <div class="ai-analysis-info">
            <h4>🤖 AIが検出した食材</h4>
            <div class="ai-detected-items">
                ${topItems.map(item => `
                    <span class="ai-detected-item" style="animation-delay: ${item.delay}ms;">
                        ${item.label} (${item.confidence}%)
                    </span>
                `).join('')}
            </div>
        </div>
    `;
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
