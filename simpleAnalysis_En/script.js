// Google Apps ScriptのWebアプリのURL
const GAS_API_URL = CONFIG.API_URL;

// ユーザーの回答を保存するオブジェクト
const userAnswers = {};
// グローバル変数
let currentStep = 1;

let finalColorType = '';

// 基本的なパーソナルカラーの選択
let currentColorTest = 1;
let colorChoices = {
    undertone: '',      // 'warm' or 'cool'
    q2: '',            // 保存用変数
    q3: '',            // 保存用変数
    q4: '',            // 保存用変数 
    q5: ''             // 保存用変数
};


//=============================================================================
// 骨格タイプの事前宣言
//=============================================================================
// グローバル変数の宣言
let selectedRating = 0;
let selectedFeedbackOption = '';
let selectedFeedbackOptionCode = ''; 
let currentBodyQuestionId = 1;
let bodyTypeScores = {
    straight: 0,
    wave: 0,
    natural: 0
};

// 骨格診断質問リスト（各質問がどのタイプに加点するかを明示）
const bodyTypeQuestions = [
    { id: 1, name: 'V-neck T-shirt', points: { straight: 2, wave: -1, natural: 0 } },
    { id: 2, name: 'Structured blazer or jacket', points: { straight: 3, wave: -1, natural: 0 } },
    { id: 3, name: 'High-neck or turtleneck tops', points: { straight: 0, wave: 2, natural: 0 } },
    { id: 4, name: 'Skinny jeans or tight pants', points: { straight: 0, wave: 2, natural: 0 } },
    { id: 5, name: 'Chunky oversized knit sweater', points: { straight: 0, wave: 0, natural: 2 } },
    { id: 6, name: 'Bold patterns instead of solid colors', points: { straight: 0, wave: 0, natural: 3 } },
    { id: 7, name: 'Tucked-in looks or high-waisted styles', points: { straight: 0, wave: 2, natural: 0 } },
    { id: 8, name: 'Straight lines vs. curved silhouettes', points: { straight: 2, wave: -1, natural: 0 } },
    { id: 9, name: 'Fitted turtleneck', points: { straight: 2, wave: -2, natural: 0 } },
    { id: 10, name: 'Fitted turtleneck', points: { straight: 0, wave: -2, natural: 2 } },
    { id: 11, name: 'Fitted turtleneck', points: { straight: -1, wave: 2, natural: -1 } },
];

// 骨格診断の分岐パターン
const bodyTypeBranches = {
    startQuestion: 1,
    branches: {
        1: { // Q1: V-neck tee vibes 👕
            comfortable: { nextQuestion: 2 }, // Go to Q2
            uncomfortable: { nextQuestion: 3 } // Go to Q3
        },
        2: { // Q2: Rocking that power blazer 💼
            comfortable: { nextQuestion: 'result' }, // Straight to results!
            uncomfortable: { nextQuestion: 5 } // Check out Q5
        },
        3: { // Q3: Feeling that turtleneck life 🧣
            comfortable: { nextQuestion: 4 }, // Move to Q4
            uncomfortable: { nextQuestion: 5 } // Skip to Q5
        },
        4: { // Q4: Skinny jeans situation 👖
            comfortable: { nextQuestion: 'result' }, // You're done!
            uncomfortable: { nextQuestion: 5 } // Try Q5
        },
        5: { // Q5: That chunky sweater mood 🧶
            comfortable: { nextQuestion: 6 }, // On to Q6
            uncomfortable: { nextQuestion: 8 } // Jump to Q8
        },
        6: { // Q6: Bold pattern energy 🌈
            comfortable: { nextQuestion: 'result' }, // Results time!
            uncomfortable: { nextQuestion: 10 } // Check Q10
        },
        7: { // Q7: Tucked-in shirt realness ✨
            comfortable: { nextQuestion: 'result' }, // Finish line!
            uncomfortable: { nextQuestion: 'result' } // Also done!
        },
        8: { // Q8: Angular vs. curvy style 📐
            comfortable: { nextQuestion: 11 }, // Head to Q11
            uncomfortable: { nextQuestion: 7 } // Go to Q7
        },
        9: { // Q9: Tight turtleneck test (straight type) 👌
            comfortable: { nextQuestion: 'result' }, // Results!
            uncomfortable: { nextQuestion: 'result' } // Also results!
        },
        10: { // Q10: Tight turtleneck test (natural type) 🌿
            comfortable: { nextQuestion: 'result' }, // Finished!
            uncomfortable: { nextQuestion: 7 } // Try Q7
        },
        11: { // Q11: Tight turtleneck test (wave type) 🌊
            comfortable: { nextQuestion: 'result' }, // Complete!
            uncomfortable: { nextQuestion: 7 } // Last stop Q7  
        }
    }
};


//=============================================================================
// 共通・診断前関数
//=============================================================================


// セクション切り替え関数
function switchSection(fromSectionId, toSectionId) {
    const fromSection = document.getElementById(fromSectionId);
    const toSection = document.getElementById(toSectionId);
    
    if (fromSection && toSection) {
        // display プロパティも明示的に設定
        fromSection.style.display = 'none';
        fromSection.classList.add('hidden');
        
        toSection.classList.remove('hidden');
        toSection.style.display = 'block';
    } else {
        // console.error('セクションが見つかりません');
    }
}

// ユーザーIDを生成する関数
function generateUserId() {
    return 'user_' + Math.floor(Math.random() * 1000000);
}

// ユーザーIDを生成してローカルストレージに保存
const userId = generateUserId();
localStorage.setItem('user_id', userId);

// 診断セクションの初期化
function initDiagnosisSection() {
    // 進捗バーの初期化
    updateProgress(10);
    
    // 骨格診断の初期化
    initBodyTypeQuestion();
    
    // カラー診断の初期化
    initColorComparison();
    
    // ローカルストレージからメールアドレスを確認
    const email = getUserEmail();
    const userId = localStorage.getItem('user_id');
    
    if (!email) {
        // console.warn('メールアドレスが見つかりません。診断結果の保存ができない可能性があります。');
    } else {
        // console.log('ユーザー情報を検出しました:', userId);
    }
}

// プログレスバーの更新
function updateProgress(percent) {
    const progressElement = document.getElementById('progress');
    if (progressElement) {
        progressElement.style.width = percent + '%';
    }
}

// オプション選択
function selectOption(element, questionKey, value) {
    // 同じ質問の他の選択肢から選択状態を解除
    const parentOptions = element.parentElement;
    const options = parentOptions.getElementsByClassName('option');
    for (let i = 0; i < options.length; i++) {
        options[i].classList.remove('selected');
    }
    
    // 選択した要素に選択状態のクラスを追加
    element.classList.add('selected');
    
    // 回答を保存
    userAnswers[questionKey] = value;
    
    // 性別質問の場合は次へボタンを有効化
    if (questionKey === 'gender') {
        document.querySelector('#step1 .btn').classList.add('active');
    }
}
// 次のステップへ進む
function nextStep(currentStep, nextStep) {
    // 数値でない場合はそのままID指定
    if (typeof currentStep === 'string') {
        document.getElementById(currentStep).classList.add('hidden');
        document.getElementById(nextStep).classList.remove('hidden');
        return;
    }
    
    // 数値の場合はstep + 数値のID指定
    const currentElement = document.getElementById('step' + currentStep);
    const nextElement = document.getElementById('step' + nextStep);
    
    // プログレスバーの更新
    updateProgress(nextStep * 25);
    
    // 現在のステップを隠して次のステップを表示
    currentElement.classList.add('hidden');
    nextElement.classList.remove('hidden');
    
    // 特定のステップに対する初期化処理
    if (nextStep === 3) {
        // カラー診断ステップの初期化
        initColorComparison();
    } else if (nextStep === 4) {
        // 骨格診断ステップの初期化
        initBodyTypeQuestion();
    }
}

// 前のステップに戻る
function prevStep(currentStep, prevStep) {
    // console.log(`prevStep called with currentStep: ${currentStep}, prevStep: ${prevStep}`);
    // 数値の場合はstep + 数値のID指定
    const currentElement = document.getElementById('step' + currentStep);
    const prevElement = document.getElementById('step' + prevStep);
    
    // プログレスバーの更新
    updateProgress(prevStep * 25);
    
    // 現在のステップを隠して前のステップを表示
    currentElement.classList.add('hidden');
    prevElement.classList.remove('hidden');
}

// 写真プレビュー
function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const previewImg = document.getElementById('photo-preview');
            previewImg.src = e.target.result;
            
            // アップロード領域を非表示にし、プレビュー領域を表示
            document.getElementById('upload-area').style.display = 'none';
            document.getElementById('photo-preview-container').style.display = 'block';
            
            // カラー診断用の画像も設定 - 背景画像として設定（すべての写真プレビューに適用）
            const photoElements = document.querySelectorAll('.photo-preview');
            photoElements.forEach(element => {
                element.style.backgroundImage = `url('${e.target.result}')`;
            });
            
            // 次へボタンを表示
            document.getElementById('upload-next-btn').style.display = 'block';
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}

//=============================================================================
// パーソナルカラー設定
//=============================================================================

// パーソナルカラータイプの定数
const SEASON_TYPES = {
    SPRING_CLEAR: '鮮やかなスプリング',
    SPRING_BRIGHT: '明るいスプリング',
    SPRING_YELLOW: '黄みのスプリング',
    SUMMER_MUTED: 'くすみサマー',
    SUMMER_BRIGHT: '明るいサマー',
    SUMMER_BLUE: '青みサマー',
    AUTUMN_MUTED: 'くすみオータム',
    AUTUMN_DARK: '暗いオータム',
    AUTUMN_YELLOW: '黄みのオータム',
    WINTER_CLEAR: '鮮やかなウィンター',
    WINTER_DARK: '暗いウィンター',
    WINTER_BLUE: '青みウィンター'
};

// 新しいカラー定義
const COLOR_PALETTES = {
    // イエベ (Warm) の色
    warm: {
        peach: '#ff7e76',      // 明るいクリアピーチ
        orange: '#e46700',     // クリアオレンジ
        greige: '#ddaa94',     // グレージュ
        brick: '#9f3709',      // 煉瓦色
        beige: '#e6cc89',      // くすみ明るいベージュ
        brown: '#70613c',      // くすみ暗いブラウン
        yellowGreen: '#8ee442', // 黄緑
        matcha: '#6fa858'      // 抹茶
    },
    // ブルベ (Cool) の色
    cool: {
        mutedBlue: '#B0C4DE',  // 明るいくすんだブルー
        clearBlue: '#87CEFA',  // 明るいクリアブルー
        purple: '#9859ff',     // 鮮やかな紫
        mutedPurple: '#947cbb', // くすんだ紫
        midBlue: '#2a59ff',    // 中間クリアブルー
        darkBlue: '#101474',   // 暗いブルー
        pink: '#e1aacf',       // 淡いピンク
        burgundy: '#822248'    // 暗いくすみ赤
    }
};

// チャートの色定義
const CHART_COLORS = {
    warm: {
        base: '#dfd56e',      // イエベ基本色
        bright: '#f7d547',    // 明るい色
        dark: '#b89b45',      // 暗い色
        clear: '#ffe566',     // クリア
        muted: '#c4b15c'      // くすみ
    },
    cool: {
        base: '#6da2df',      // ブルベ基本色
        bright: '#47a7f7',    // 明るい色
        dark: '#456bb8',      // 暗い色
        clear: '#66b5ff',     // クリア
        muted: '#5c87c4'      // くすみ
    }
};

// ルート選択
const UNDERTONE_OPTIONS = {
    WARM: 'warm',    // イエベ (Gold)
    COOL: 'cool'     // ブルベ (Silver)
};

// ブランド選択のデータを保存するオブジェクト
let brandData = {
    hasPurchased: null,
    storeName: ''
};

/**
 * シンプル化したカラータイプ判定ロジック
 * @param {Object} selections - ユーザーの選択肢
 * @returns {String} パーソナルカラータイプ
 */
function determineColorType() {
    if (colorChoices.undertone === 'warm') {
        // Q2: peach VS greige
        if (colorChoices.q2 === COLOR_PALETTES.warm.peach) {
            // Q3: orange VS brick
            if (colorChoices.q3 === COLOR_PALETTES.warm.orange) {
                // SPRING_CLEAR
                finalColorType = SEASON_TYPES.SPRING_CLEAR;
            } else if (colorChoices.q3 === COLOR_PALETTES.warm.brick) {
                // Q4: beige VS brown
                if (colorChoices.q4 === COLOR_PALETTES.warm.beige) {
                    // SPRING_BRIGHT
                    finalColorType = SEASON_TYPES.SPRING_BRIGHT;
                } else {
                    // AUTUMN_DARK
                    finalColorType = SEASON_TYPES.AUTUMN_DARK;
                }
            }
        } else { // greige
            // Q3: orange VS brick
            if (colorChoices.q3 === COLOR_PALETTES.warm.orange) {
                // Q4: yellowGreen VS matcha
                if (colorChoices.q4 === COLOR_PALETTES.warm.yellowGreen) {
                    // SPRING_YELLOW
                    finalColorType = SEASON_TYPES.SPRING_YELLOW;
                } else {
                    // AUTUMN_MUTED
                    finalColorType = SEASON_TYPES.AUTUMN_MUTED;
                }
            } else {
                // AUTUMN_YELLOW
                finalColorType = SEASON_TYPES.AUTUMN_YELLOW;
            }
        }
    } else { // cool
        // Q2: clearBlue VS mutedBlue
        if (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue) {
            // Q3: purple VS mutedPurple
            if (colorChoices.q3 === COLOR_PALETTES.cool.purple) {
                // WINTER_CLEAR
                finalColorType = SEASON_TYPES.WINTER_CLEAR;
            } else if (colorChoices.q3 === COLOR_PALETTES.cool.mutedPurple) {
                // Q4: pink VS burgundy
                if (colorChoices.q4 === COLOR_PALETTES.cool.pink) {
                    // SUMMER_BRIGHT
                    finalColorType = SEASON_TYPES.SUMMER_BRIGHT;
                } else {
                    // WINTER_BLUE
                    finalColorType = SEASON_TYPES.WINTER_BLUE;
                }
            }
        } else { // mutedBlue
            // Q3: purple VS mutedPurple
            if (colorChoices.q3 === COLOR_PALETTES.cool.purple) {
                // Q4: midBlue VS darkBlue
                if (colorChoices.q4 === COLOR_PALETTES.cool.midBlue) {
                    // SUMMER_BLUE
                    finalColorType = SEASON_TYPES.SUMMER_BLUE;
                } else {
                    // WINTER_DARK
                    finalColorType = SEASON_TYPES.WINTER_DARK;
                }
            } else {
                // SUMMER_MUTED
                finalColorType = SEASON_TYPES.SUMMER_MUTED;
            }
        }
    }
}

// レガシーコードからのフロー制御用シンプルインターフェース
function getNextQuestion(currentQuestion, selectedOption) {
    // Undertone (Q1) の選択後
    if (currentQuestion === 1) {  // Q1: イエベ vs ブルベ
        return 2; // Q2へ進む
    }
    
    // Q2の選択後
    if (currentQuestion === 2) {
        return 3; // Q3へ進む
    }
    
    // Q3の選択後
    if (currentQuestion === 3) {
        const undertone = selectedOption.undertone;
        const q2 = selectedOption.q2;
        const q3 = selectedOption.q3;
        
        // ブルベの場合
        if (undertone === UNDERTONE_OPTIONS.COOL) {
            // クリアブルー + パープル = WINTER_CLEAR → 結果へ
            if (q2 === COLOR_PALETTES.cool.clearBlue && q3 === COLOR_PALETTES.cool.purple) {
                return 'result';
            }
            // パウダーブルー + ダスティパープル = SUMMER_MUTED → 結果へ
            else if (q2 === COLOR_PALETTES.cool.mutedBlue && q3 === COLOR_PALETTES.cool.mutedPurple) {
                return 'result';
            }
            // クリアブルー + ダスティパープル → Q4へ
            else if (q2 === COLOR_PALETTES.cool.clearBlue && q3 === COLOR_PALETTES.cool.mutedPurple) {
                return 4;
            }
            // パウダーブルー + パープル → Q5へ
            else {
                return 5;
            }
        } 
        // イエベの場合
        else {
            // クリアピーチ + クリアオレンジ = SPRING_CLEAR → 結果へ
            if (q2 === COLOR_PALETTES.warm.peach && q3 === COLOR_PALETTES.warm.orange) {
                return 'result';
            }
            // グレージュ + 煉瓦色 = AUTUMN_YELLOW → 結果へ
            else if (q2 === COLOR_PALETTES.warm.greige && q3 === COLOR_PALETTES.warm.brick) {
                return 'result';
            }
            // クリアピーチ + 煉瓦色 → Q4へ
            else if (q2 === COLOR_PALETTES.warm.peach && q3 === COLOR_PALETTES.warm.brick) {
                return 4;
            }
            // グレージュ + クリアオレンジ → Q5へ
            else {
                return 5;
            }
        }
    }
    
    // Q4の選択後は必ず結果へ
    if (currentQuestion === 4) {
        return 'result';
    }
    
    // Q5の選択後は必ず結果へ
    if (currentQuestion === 5) {
        return 'result';
    }
    
    // デフォルトは次の質問
    return currentQuestion + 1;
}

// エクスポート
module.exports = {
    SEASON_TYPES,
    COLOR_PALETTES,
    UNDERTONE_OPTIONS,
    determineColorType,
    getNextQuestion,
    testAllPaths
};

// カラー比較の初期化
function initColorComparison() {
    // カラー選択の初期化
    colorChoices = {
        undertone: '',
        q2: '',
        q3: '',
        q4: '',
        q5: ''
    };
    
    // 最初のカラーテストを表示
    showColorTest(1);
}

// 特定のカラーテストを表示
function showColorTest(testNumber) {
    // すべてのテストを非表示
    document.querySelectorAll('.color-comparison').forEach(test => {
        test.classList.add('hidden');
    });
    
    // 指定されたテストの要素を取得
    const currentTestElement = document.getElementById(`color-test-${testNumber}`);
    
    // 要素が存在するか確認
    if (!currentTestElement) {
        // console.error(`テスト #${testNumber} の要素が見つかりません`);
        return; // 処理を中止
    }
    
    currentTestElement.classList.remove('hidden');
    
    // ドットの状態を更新
    document.querySelectorAll('.color-pagination .dot').forEach((dot, index) => {
        if (index === testNumber - 1) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // テスト2: 明るいクリアピーチ VS グレージュ (warmの場合) または 明るいクリアブルー VS 明るいくすんだブルー (coolの場合)
    if (testNumber === 2) {
        if (colorChoices.undertone === 'warm') {
            document.getElementById('light-clear-color-box').style.backgroundColor = COLOR_PALETTES.warm.peach; // 明るいクリアピーチ
            document.getElementById('light-muted-color-box').style.backgroundColor = COLOR_PALETTES.warm.greige; // グレージュ
        } else {
            document.getElementById('light-clear-color-box').style.backgroundColor = COLOR_PALETTES.cool.clearBlue; // 明るいクリアブルー
            document.getElementById('light-muted-color-box').style.backgroundColor = COLOR_PALETTES.cool.mutedBlue; // 明るいくすんだブルー
        }
    }
    
    // テスト3: クリアオレンジ vs 煉瓦色 (warmの場合) または 鮮やかな紫 vs くすんだ紫 (coolの場合)
    if (testNumber === 3) {
        if (colorChoices.undertone === 'warm') {
            document.getElementById('clear-light-color-box').style.backgroundColor = COLOR_PALETTES.warm.orange; // クリアオレンジ
            document.getElementById('muted-light-color-box').style.backgroundColor = COLOR_PALETTES.warm.brick; // 煉瓦色
        } else {
            document.getElementById('clear-light-color-box').style.backgroundColor = COLOR_PALETTES.cool.purple; // 鮮やかな紫
            document.getElementById('muted-light-color-box').style.backgroundColor = COLOR_PALETTES.cool.mutedPurple; // くすんだ紫
        }
    }
    
    // テスト4と5の条件分岐を更新
    if (testNumber === 4) {
        if (colorChoices.undertone === 'warm') {
            if (colorChoices.q2 === COLOR_PALETTES.warm.peach && colorChoices.q3 === COLOR_PALETTES.warm.brick) {
                document.getElementById('high-contrast-color-box').style.backgroundColor = COLOR_PALETTES.warm.beige; // くすみ明るいベージュ
                document.getElementById('low-contrast-color-box').style.backgroundColor = COLOR_PALETTES.warm.brown; // くすみ暗いブラウン
            } else if (colorChoices.q2 === COLOR_PALETTES.warm.greige && colorChoices.q3 === COLOR_PALETTES.warm.orange) {
                document.getElementById('high-contrast-color-box').style.backgroundColor = COLOR_PALETTES.warm.yellowGreen; // 黄緑
                document.getElementById('low-contrast-color-box').style.backgroundColor = COLOR_PALETTES.warm.matcha; // 抹茶
            }
        } else { // cool
            if (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue && colorChoices.q3 === COLOR_PALETTES.cool.mutedPurple) {
                document.getElementById('high-contrast-color-box').style.backgroundColor = COLOR_PALETTES.cool.pink; // 淡いピンク
                document.getElementById('low-contrast-color-box').style.backgroundColor = COLOR_PALETTES.cool.burgundy; // 暗いくすみ赤
            } else if (colorChoices.q2 === COLOR_PALETTES.cool.mutedBlue && colorChoices.q3 === COLOR_PALETTES.cool.purple) {
                document.getElementById('high-contrast-color-box').style.backgroundColor = COLOR_PALETTES.cool.midBlue; // 中間クリアブルー
                document.getElementById('low-contrast-color-box').style.backgroundColor = COLOR_PALETTES.cool.darkBlue; // 暗いブルー
            }
        }
    }
    
    // 現在のテスト番号を更新
    currentColorTest = testNumber;
}

// カラーオプション選択
function selectColorOption(element, colorType) {
    // 現在のテストの全ての選択肢から選択状態を解除
    const currentTest = document.getElementById(`color-test-${currentColorTest}`);
    const options = currentTest.getElementsByClassName('color-set');
    Array.from(options).forEach(opt => opt.classList.remove('selected'));
    
    // 選択された要素に選択状態のクラスを追加
    element.classList.add('selected');
    
    // 回答を保存
    if (currentColorTest === 1) {
        // イエベ/ブルベ判定 (Q1)
        colorChoices.undertone = (colorType === 'warm') ? 'warm' : 'cool';
        setTimeout(() => showColorTest(2), 500);
    } else if (currentColorTest === 2) {
        // 明るいピーチ vs グレージュ または 明るいクリアブルー vs 明るいくすんだブルー (Q2)
        if (colorType === 'light') {
            colorChoices.q2 = colorChoices.undertone === 'warm' ? 
                COLOR_PALETTES.warm.peach : COLOR_PALETTES.cool.clearBlue;
        } else { // dark
            colorChoices.q2 = colorChoices.undertone === 'warm' ? 
                COLOR_PALETTES.warm.greige : COLOR_PALETTES.cool.mutedBlue;
        }
        setTimeout(() => showColorTest(3), 500);
    } else if (currentColorTest === 3) {
        // クリアオレンジ vs 煉瓦色 または 鮮やかな紫 vs くすんだ紫 (Q3)
        if (colorType === 'clear') {
            colorChoices.q3 = colorChoices.undertone === 'warm' ? 
                COLOR_PALETTES.warm.orange : COLOR_PALETTES.cool.purple;
        } else { // muted
            colorChoices.q3 = colorChoices.undertone === 'warm' ? 
                COLOR_PALETTES.warm.brick : COLOR_PALETTES.cool.mutedPurple;
        }
        
        // 結果がすぐに確定するケース
        if (colorChoices.undertone === 'warm') {
            if (colorChoices.q2 === COLOR_PALETTES.warm.peach && colorChoices.q3 === COLOR_PALETTES.warm.orange) {
                finalColorType = SEASON_TYPES.SPRING_CLEAR;
                // 結果ページに直接遷移
                nextStep(3, 4);
                return;
            } else if (colorChoices.q2 === COLOR_PALETTES.warm.greige && colorChoices.q3 === COLOR_PALETTES.warm.brick) {
                finalColorType = SEASON_TYPES.AUTUMN_YELLOW;
                // 結果ページに直接遷移
                nextStep(3, 4);
                return;
            }
        } else { // cool
            if (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue && colorChoices.q3 === COLOR_PALETTES.cool.purple) {
                finalColorType = SEASON_TYPES.WINTER_CLEAR;
                // 結果ページに直接遷移
                nextStep(3, 4);
                return;
            } else if (colorChoices.q2 === COLOR_PALETTES.cool.mutedBlue && colorChoices.q3 === COLOR_PALETTES.cool.mutedPurple) {
                finalColorType = SEASON_TYPES.SUMMER_MUTED;
                // 結果ページに直接遷移
                nextStep(3, 4);
                return;
            }
        }
        
        // 4問目が必要なケース
        setTimeout(() => showColorTest(4), 500);
    } else if (currentColorTest === 4) {
        // Q4の選択に基づいた結果の決定
        if (colorType === 'high') {
            colorChoices.q4 = colorChoices.undertone === 'warm' ? 
                (colorChoices.q2 === COLOR_PALETTES.warm.peach ? COLOR_PALETTES.warm.beige : COLOR_PALETTES.warm.yellowGreen) :
                (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue ? COLOR_PALETTES.cool.pink : COLOR_PALETTES.cool.midBlue);
        } else { // low
            colorChoices.q4 = colorChoices.undertone === 'warm' ? 
                (colorChoices.q2 === COLOR_PALETTES.warm.peach ? COLOR_PALETTES.warm.brown : COLOR_PALETTES.warm.matcha) :
                (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue ? COLOR_PALETTES.cool.burgundy : COLOR_PALETTES.cool.darkBlue);
        }
        
        // 結果を確定
        if (colorChoices.undertone === 'warm') {
            if (colorChoices.q2 === COLOR_PALETTES.warm.peach && colorChoices.q3 === COLOR_PALETTES.warm.brick) {
                if (colorChoices.q4 === COLOR_PALETTES.warm.beige) {
                    finalColorType = SEASON_TYPES.SPRING_BRIGHT;
                } else { // COLOR_PALETTES.warm.brown
                    finalColorType = SEASON_TYPES.AUTUMN_DARK;
                }
            } else if (colorChoices.q2 === COLOR_PALETTES.warm.greige && colorChoices.q3 === COLOR_PALETTES.warm.orange) {
                if (colorChoices.q4 === COLOR_PALETTES.warm.yellowGreen) {
                    finalColorType = SEASON_TYPES.SPRING_YELLOW;
                } else { // COLOR_PALETTES.warm.matcha
                    finalColorType = SEASON_TYPES.AUTUMN_MUTED;
                }
            }
        } else { // cool
            if (colorChoices.q2 === COLOR_PALETTES.cool.clearBlue && colorChoices.q3 === COLOR_PALETTES.cool.mutedPurple) {
                if (colorChoices.q4 === COLOR_PALETTES.cool.pink) {
                    finalColorType = SEASON_TYPES.SUMMER_BRIGHT;
                } else { // COLOR_PALETTES.cool.burgundy
                    finalColorType = SEASON_TYPES.WINTER_BLUE;
                }
            } else if (colorChoices.q2 === COLOR_PALETTES.cool.mutedBlue && colorChoices.q3 === COLOR_PALETTES.cool.purple) {
                if (colorChoices.q4 === COLOR_PALETTES.cool.midBlue) {
                    finalColorType = SEASON_TYPES.SUMMER_BLUE;
                } else { // COLOR_PALETTES.cool.darkBlue
                    finalColorType = SEASON_TYPES.WINTER_DARK;
                }
            }
        }
        
        // 骨格診断ステップに移動
        setTimeout(() => {
            nextStep(3, 4);
        }, 800);
    }
}

// パーソナルカラー診断の結果に基づいてチャートデータを生成する関数
function getColorChartData(finalColorType) {
    let scores = [];
    let labels = [];
    let backgroundColor = [];

    switch (finalColorType) {
        // Spring (Warm Spring) Type
        case SEASON_TYPES.SPRING_CLEAR:
            scores = [50, 40, 10];
            labels = ['Clarity', 'Warmth Level', 'Brightness'];
            backgroundColor = [CHART_COLORS.warm.clear, CHART_COLORS.warm.base, CHART_COLORS.warm.bright];
            break;
        case SEASON_TYPES.SPRING_BRIGHT:
            scores = [50, 25, 25];
            labels = ['Brightness', 'Warmth Level', 'Clarity'];
            backgroundColor = [CHART_COLORS.warm.bright, CHART_COLORS.warm.base, CHART_COLORS.warm.clear];
            break;
        case SEASON_TYPES.SPRING_YELLOW:
            scores = [50, 25, 25];
            labels = ['Warmth Level', 'Clarity', 'Brightness'];
            backgroundColor = [CHART_COLORS.warm.base, CHART_COLORS.warm.clear, CHART_COLORS.warm.bright];
            break;
            
        // Summer (Cool Summer) Type
        case SEASON_TYPES.SUMMER_MUTED:
            scores = [50, 30, 20];
            labels = ['Softness', 'Brightness', 'Coolness'];
            backgroundColor = [CHART_COLORS.cool.muted, CHART_COLORS.cool.bright, CHART_COLORS.cool.base];
            break;
        case SEASON_TYPES.SUMMER_BRIGHT:
            scores = [50, 25, 25];
            labels = ['Brightness', 'Softness', 'Coolness'];
            backgroundColor = [CHART_COLORS.cool.bright, CHART_COLORS.cool.muted, CHART_COLORS.cool.base];
            break;
        case SEASON_TYPES.SUMMER_BLUE:
            scores = [50, 30, 20];
            labels = ['Coolness', 'Softness', 'Brightness'];
            backgroundColor = [CHART_COLORS.cool.base, CHART_COLORS.cool.muted, CHART_COLORS.cool.bright];
            break;
            
        // Autumn (Warm Autumn) Type
        case SEASON_TYPES.AUTUMN_YELLOW:
            scores = [60, 20, 20];
            labels = ['Warmth Level', 'Depth', 'Clarity'];
            backgroundColor = [CHART_COLORS.warm.base, CHART_COLORS.warm.dark, CHART_COLORS.warm.clear];
            break;
        case SEASON_TYPES.AUTUMN_MUTED:
            scores = [50, 30, 10, 10];
            labels = ['Softness', 'Warmth Level', 'Brightness', 'Depth'];
            backgroundColor = [CHART_COLORS.warm.muted, CHART_COLORS.warm.base, CHART_COLORS.warm.bright, CHART_COLORS.warm.dark];
            break;
        case SEASON_TYPES.AUTUMN_DARK:
            scores = [50, 30, 20];
            labels = ['Depth', 'Warmth Level', 'Softness'];
            backgroundColor = [CHART_COLORS.warm.dark, CHART_COLORS.warm.base, CHART_COLORS.warm.muted];
            break;
            
        // Winter (Cool Winter) Type
        case SEASON_TYPES.WINTER_CLEAR:
            scores = [50, 40, 10];
            labels = ['Clarity', 'Coolness', 'Depth'];
            backgroundColor = [CHART_COLORS.cool.clear, CHART_COLORS.cool.base, CHART_COLORS.cool.dark];
            break;
        case SEASON_TYPES.WINTER_BLUE:
            scores = [50, 25, 25];
            labels = ['Coolness', 'Clarity', 'Depth'];
            backgroundColor = [CHART_COLORS.cool.base, CHART_COLORS.cool.clear, CHART_COLORS.cool.dark];
            break;
        case SEASON_TYPES.WINTER_DARK:
            scores = [50, 30, 20];
            labels = ['Depth', 'Coolness', 'Vibrancy'];
            backgroundColor = [CHART_COLORS.cool.dark, CHART_COLORS.cool.base, CHART_COLORS.cool.clear];
            break;
            
        // Default case
        default:
            scores = [33, 33, 34];
            labels = ['Type', 'Brightness', 'Feature'];
            backgroundColor = [
                CHART_COLORS.warm.base,  // or appropriate default color
                CHART_COLORS.warm.bright, 
                CHART_COLORS.warm.clear
            ];
            break;
    }

    return {
        scores: scores,
        labels: labels,
        backgroundColor: backgroundColor
    };
}

// パーソナルカラーの円グラフを描画する関数
function drawColorChart(scores, labels, backgroundColor) {
    const ctx = document.getElementById('colorChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: scores,
                backgroundColor: backgroundColor,
                borderWidth: 0,
                cutout: '50%'  // Making the chart thicker by reducing cutout value
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// パーソナルカラーのアドバイスを提供する関数
function getColorAdvice(finalColorType) {
    let advice = '';
    if (finalColorType.includes('Spring')) {
        advice = 'Your color season is Spring! 🍋 Ivory is a safe bet, but yellow-greens and oranges are totally your jam! 🍊 Give them a try!';
    } else if (finalColorType.includes('Summer')) {
        advice = 'Your color season is Summer! 🦭 Do you find yourself reaching for grays a lot? Cool, refreshing colors 🍋‍🟩 would be a great addition to your wardrobe!';
    } else if (finalColorType.includes('Autumn')) {
        advice = 'Your color season is Autumn! 🍁 Do you tend to pick black? Browns and other rich, earthy tones 🍂 would be your best bet - give them a shot!';
    } else if (finalColorType.includes('Winter')) {
        advice = 'Your color season is Winter! ❄️ Is your closet full of black? 🐧 Try incorporating some cool-toned primary colors to expand your style horizons! 💎';
    }
    return advice;
}

function calculateColorTypeResult() {
    // Execute personal color determination
    determineColorType();
    
    // Get chart data
    const chartData = getColorChartData(finalColorType);
    
    // Draw the chart
    drawColorChart(chartData.scores, chartData.labels, chartData.backgroundColor);
    
    // Get and display advice
    const advice = getColorAdvice(finalColorType);
    document.getElementById('result-advice').textContent = advice;
    
    // Return result object
    return {
        colorType: finalColorType,
        isWarm: colorChoices.undertone === 'warm'
    };
}

//=============================================================================
// 骨格タイプ診断
//=============================================================================

// 骨格診断の初期化
function initBodyTypeQuestion() {
    // 骨格診断スコアの初期化
    bodyTypeScores = {
        straight: 0,
        wave: 0,
        natural: 0
    };
    
    // 最初の質問を表示
    showBodyTypeQuestion(1);
}

// 骨格診断質問を表示
function showBodyTypeQuestion(questionId) {
    // すべての質問を非表示にする
    const questions = document.querySelectorAll('.body-type-question');
    questions.forEach(q => q.classList.add('hidden'));
    
    // 指定された質問を表示
    const targetQuestion = document.getElementById(`body-question-${questionId}`);
    if (targetQuestion) {
        targetQuestion.classList.remove('hidden');
        
        // フェードイン効果を追加
        targetQuestion.style.opacity = '0';
        setTimeout(() => {
            targetQuestion.style.opacity = '1';
            targetQuestion.style.transition = 'opacity 0.3s ease-in-out';
        }, 50);
    }
    
    // 次へボタンを非表示にする（選択するまで）
    const nextBtn = document.getElementById('next-body-btn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
    }
    
    // 質問カウンターを更新
    const counterElement = document.getElementById('body-question-counter');
    if (counterElement) {
        counterElement.textContent = questionId;
    }
    
    // 現在の質問IDを更新
    currentBodyQuestionId = questionId;
}

// 骨格タイプ質問のスコアリングを設定
function selectBodyTypeOption(element, questionId, answer) {
    // 選択肢のスタイルを更新
    const options = document.querySelectorAll(`#body-question-${questionId} .option`);
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    
    // 回答を保存
    userAnswers[`question${questionId}`] = answer;
    
    // 回答を処理
    processBodyTypeAnswer(questionId, answer);
    
    // 次の質問に自動遷移
    const nextQuestionId = bodyTypeBranches.branches[questionId][answer].nextQuestion;
    // console.log(`Current Question ID: ${questionId}`);
    // console.log(`Selected Answer: ${answer}`);
    // console.log(`Current Scores:`, bodyTypeScores);
    // console.log(`Next Question: ${nextQuestionId}`);

    // フェードアウト効果を追加
    const currentQuestion = document.getElementById(`body-question-${questionId}`);
    if (currentQuestion) {
        currentQuestion.style.opacity = '0';
        currentQuestion.style.transition = 'opacity 0.3s ease-out';
    }
    
    // 少し待ってから次の質問に遷移
    setTimeout(() => {
        if (nextQuestionId === 'result') {
            // console.log('Navigating to result page');
            showResult();
        } else {
            showBodyTypeQuestion(nextQuestionId);
        }
    }, 300);
}

// 同点をチェックする関数
function checkForTie() {
    const scores = [
        bodyTypeScores.straight,
        bodyTypeScores.wave,
        bodyTypeScores.natural
    ];
    
    // 最大スコアを取得
    const maxScore = Math.max(...scores);
    
    // 最大スコアの出現回数をカウント
    let maxCount = 0;
    scores.forEach(score => {
        if (score === maxScore) {
            maxCount++;
        }
    });
    
    // 最大スコアが複数（同点）ある場合はtrueを返す
    return maxCount > 1;
}



// 骨格タイプの回答を処理
function processBodyTypeAnswer(questionId, answer) {
    const question = bodyTypeQuestions.find(q => q.id === questionId);
    if (!question) return;

    // comfortable の場合のみポイントを加算
    if (answer === 'comfortable') {
        bodyTypeScores.straight += question.points.straight;
        bodyTypeScores.wave += question.points.wave;
        bodyTypeScores.natural += question.points.natural;
    }
    
    // console.log(`Updated scores after Q${questionId}:`, bodyTypeScores);
    
    // 次の質問に進む前に、同点チェックが必要かどうかを確認
    const nextQuestionId = bodyTypeBranches.branches[questionId][answer].nextQuestion;
    
    // 結果ページに移動する場合のみ同点チェックを実行
    if (nextQuestionId === 'result') {
        // 同点チェック
        const hasTie = checkForTie();
        
        if (hasTie) {
            // 同点がある場合は質問12へ誘導
            // console.log('同点を検出: 質問12へリダイレクト');
            
            // bodyTypeBranches の nextQuestion を更新
            bodyTypeBranches.branches[questionId][answer].nextQuestion = 12;
        }
    }
}

// 質問12の選択肢のためのイベントハンドラを追加
function selectBodyTypeFinal(type) {
    // 対応するタイプを最終結果として設定
    if (type === 'straight') {
        bodyTypeScores.straight += 4; // 大きな値を加点して確実に最大にする
    } else if (type === 'wave') {
        bodyTypeScores.wave += 4;
    } else if (type === 'natural') {
        bodyTypeScores.natural += 4;
    }
    
    // 結果ページへ遷移
    showResult();
}

function calculateBodyTypeResult() {
    // 骨格タイプのスコアに基づいて最終的な骨格タイプを決定
    let maxScore = Math.max(bodyTypeScores.straight, bodyTypeScores.wave, bodyTypeScores.natural);
    let finalBodyType = '';

    // 同点のタイプを検出
    let tiedTypes = [];
    if (maxScore === bodyTypeScores.straight) tiedTypes.push('straight');
    if (maxScore === bodyTypeScores.wave) tiedTypes.push('wave');
    if (maxScore === bodyTypeScores.natural) tiedTypes.push('natural');
    
    // 同点がない場合は通常通り判定
    if (tiedTypes.length === 1) {
        if (tiedTypes[0] === 'straight') {
            finalBodyType = 'Straight';
        } else if (tiedTypes[0] === 'wave') {
            finalBodyType = 'Wave';
        } else {
            finalBodyType = 'Natural';
        }
    } 
    // 同点の場合（通常は質問12で解決済みのはず）
    else {
        // もし質問12を通過したのに同点の場合は、優先順位をつける
        // 例: straight > wave > natural の優先順位
        if (tiedTypes.includes('straight')) {
            finalBodyType = 'Straight';
        } else if (tiedTypes.includes('wave')) {
            finalBodyType = 'Wave';
        } else {
            finalBodyType = 'Natural';
        }
    }
    
    // 計算した結果を返す
    return {
        bodyType: finalBodyType,
        scores: bodyTypeScores,
        // 同点情報も返すと便利
        hasTie: tiedTypes.length > 1,
        tiedTypes: tiedTypes
    };
}

// 骨格診断の前の質問に戻る
function prevBodyQuestion() {
    if (currentBodyQuestionId > 1) {
        const currentQuestion = document.getElementById(`body-question-${currentBodyQuestionId}`);
        const prevQuestion = document.getElementById(`body-question-${currentBodyQuestionId - 1}`);
        
        if (currentQuestion && prevQuestion) {
            currentQuestion.classList.add('hidden');
            prevQuestion.classList.remove('hidden');
            currentBodyQuestionId--;
        }
    } else {
        // 最初の質問の場合は前のステップに戻る
        prevStep(4, 3);
    }
}

//=============================================================================
// 結果ページ
//=============================================================================

function showResult() {
    // パーソナルカラーと骨格診断の結果を計算
    const colorResult = calculateColorTypeResult();
    const bodyResult = calculateBodyTypeResult();
    // console.log('Final Color Type:', colorResult.colorType);
    let finalColorType = colorResult.colorType;
    // 1. パーソナルカラー診断結果の表示
    document.getElementById('result-color').textContent = colorResult.colorType;
    
    // 2. 骨格診断結果の表示
    document.getElementById('result-body-type').textContent = bodyResult.bodyType;
    
    // 3. 骨格タイプのスコアバーの更新
    const totalScore = bodyResult.scores.straight + bodyResult.scores.wave + bodyResult.scores.natural;
    const straightPercent = Math.min((bodyResult.scores.straight / totalScore * 100), 100) || 0;
    const wavePercent = Math.min((bodyResult.scores.wave / totalScore * 100), 100) || 0;
    const naturalPercent = Math.min((bodyResult.scores.natural / totalScore * 100), 100) || 0;

    document.getElementById('straight-bar').style.width = straightPercent + '%';
    document.getElementById('wave-bar').style.width = wavePercent + '%';
    document.getElementById('natural-bar').style.width = naturalPercent + '%';
    
    // 4. 骨格タイプのアドバイス
    let bodyTypeAdvice = '';
    if (bodyResult.bodyType === 'Straight') {
        bodyTypeAdvice = 'You have a top-heavy silhouette with distinctive body thickness. Jacket styles probably look amazing on you, right? 💯 Focus on straight lines, thicker fabrics, and I-line silhouettes to expand your style options!';
    } else if (bodyResult.bodyType === 'Wave') {
        bodyTypeAdvice = 'You have a bottom-heavy silhouette with a soft, feminine impression. Do you unconsciously gravitate toward deep V-necks? Try styles that draw attention to your upper body to create a more balanced look! ✨';
    } else {
        bodyTypeAdvice = 'Your most striking features are your frame and bone structure. Do oversized clothes feel just right on you? 🙌 Pay attention to necklines and overall looseness to unlock even more styling possibilities!';
    }

    // パーソナルカラーのアドバイスを追加
    let colorAdvice = '';
    if (finalColorType.includes('Spring')) {
        colorAdvice = 'Your color season is Spring! 🍋 Ivory is a safe bet, but yellow-greens and oranges are totally your jam! 🍊 Give them a try!';
    } else if (finalColorType.includes('Summer')) {
        colorAdvice = 'Your color season is Summer! 🦭 Do you find yourself reaching for grays a lot? Cool, refreshing colors 🍋‍🟩 would be a great addition to your wardrobe!';
    } else if (finalColorType.includes('Autumn')) {
        colorAdvice = 'Your color season is Autumn! 🍁 Do you tend to pick black? Browns and other rich, earthy tones 🍂 would be your best bet - give them a shot!';
    } else if (finalColorType.includes('Winter')) {
        colorAdvice = 'Your color season is Winter! ❄️ Is your closet full of black? 🐧 Try incorporating some cool-toned primary colors to expand your style horizons! 💎';
    }
    
    // console.log('Color Type:', finalColorType); // デバッグ用
    // console.log('Color Advice:', colorAdvice); // デバッグ用

    // HTMLを使って段落を分ける
    let advice = '<p class="color-advice">' + colorAdvice + '</p>';
    advice += '<p class="body-advice">' + bodyTypeAdvice + '</p>';

    // innerHTML を使ってHTMLタグを反映させる
    const resultAdviceElement = document.getElementById('result-advice');
    if (resultAdviceElement) {
        resultAdviceElement.innerHTML = advice;
    } else {
        // console.error('result-advice element not found');
    }
    
    // 結果画面に遷移
    nextStep(4, 5);
}

//=============================================================================
// データ整形
//=============================================================================

function getUserEmail() {
    return localStorage.getItem('user_email') || '';
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// フィードバックオプション選択
function selectFeedbackOption(element, option) {
    // 前の選択をクリア
    const options = document.querySelectorAll('.feedback-options .option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    // 選択した要素にselectedクラスを追加
    element.classList.add('selected');
    
    // 選択したオプションのコードを保存
    selectedFeedbackOptionCode = option;
    
    // 選択したオプションのテキスト内容も保存
    selectedFeedbackOption = element.textContent.trim();
    
    // "その他"が選択された場合はテキストエリアを表示
    const otherFeedbackContainer = document.getElementById('other-feedback-container');
    if (option === 'other') {
        otherFeedbackContainer.classList.remove('hidden');
    } else {
        otherFeedbackContainer.classList.add('hidden');
    }

    // 送信ボタンのクリックイベントを設定
    const submitBtn = document.getElementById('submit-feedback-btn');
    if (submitBtn) {
        submitBtn.onclick = completeSubmission;
    }
}

// データ送信と完了処理を行う関数
function completeSubmission() {
    // console.log('completeSubmission called');
    
    // 送信中の表示を更新
    const submitButton = document.querySelector('#feedback-popup .btn') || 
                        document.querySelector('#satisfaction-popup .btn');
    if (submitButton) {
        submitButton.textContent = '送信中...';
        submitButton.disabled = true;
    }

    // データを送信
    submitAllData()
        .then(response => {
            // console.log('データ送信成功:', response);
        })
        .catch(error => {
            // console.error('送信エラー:', error);
        })
        .finally(() => {
            if (submitButton) {
                submitButton.textContent = '送信';
                submitButton.disabled = false;
            }
            
            // エラーの有無に関わらずThanksポップアップに遷移
            // 現在のポップアップを非表示
            const currentPopups = document.querySelectorAll('.popup, .satisfaction-popup, .feedback-popup');
            currentPopups.forEach(popup => popup.classList.add('hidden'));
            
            // サンクスポップアップを表示
            const thanksPopup = document.getElementById('thanks-popup');
            if (thanksPopup) {
                thanksPopup.classList.remove('hidden');
            }
        });
}

// データ送信用関数の改善
function submitAllData() {
    return new Promise((resolve, reject) => {
        // console.log('submitAllData called');
        try {
            // 必須データの検証
            if (!finalColorType) {
                // console.warn('パーソナルカラータイプが設定されていません');
            }

            const bodyResult = calculateBodyTypeResult();
            if (!bodyResult.bodyType) {
                // console.warn('骨格タイプが設定されていません');
            }

            // 現在の診断結果を取得
            const colorResult = { colorType: finalColorType };
            
            // 骨格診断の詳細情報を取得
            const bodyTypeDetails = {
                straight: bodyResult.scores.straight,
                wave: bodyResult.scores.wave,
                natural: bodyResult.scores.natural,
                questions: bodyTypeQuestions
                    .filter(q => userAnswers[`question${q.id}`] === 'comfortable')
                    .map(q => ({
                        question: q.name,
                        answer: 'Yes'
                    }))
            };
            
            // パーソナルカラーの詳細情報を取得
            const colorTypeDetails = {
                undertone: colorChoices.undertone,
                q2: colorChoices.q2,
                q3: colorChoices.q3,
                q4: colorChoices.q4,
                q5: colorChoices.q5
            };

            // ユーザー情報を取得
            const email = getUserEmail();
            const userId = localStorage.getItem('user_id') || generateUserId();

            // 送信データを構造化
            const submitData = {
                type: 'diagnosis_only',
                userId: userId,
                email: email || '',
                gender: userAnswers.gender || '',
                bodyType: bodyResult.bodyType,
                bodyTypeDetails: bodyTypeDetails,
                colorType: finalColorType,
                colorTypeDetails: colorTypeDetails,
                satisfactionLevel: selectedRating || 0,
                feedbackOption: selectedFeedbackOption || '',
                feedbackText: document.getElementById('other-feedback')?.value || '',
                submitted: false,
                timestamp: new Date().toISOString()
            };

            // console.log('送信データ:', submitData);

            // ローカルストレージにバックアップ
            try {
                localStorage.setItem('complete_data', JSON.stringify(submitData));
                localStorage.setItem('user_id', userId);
            } catch (storageError) {
                // console.warn('ローカルストレージへの保存に失敗しました:', storageError);
            }

            // APIにデータを送信
            fetch(GAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
                mode: 'no-cors'
            })
            .then(response => {
                // console.log('API応答:', response);
                resolve(response);
            })
            .catch(error => {
                // console.error('API送信エラー:', error);
                // エラーが発生しても解決とみなす
                resolve();
            });

        } catch (error) {
            // console.error('データ処理エラー:', error);
            // エラーが発生しても解決とみなす
            resolve();
        }
    });
}

// 星評価の選択処理
function selectRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('.star');
    const ratingLabel = document.getElementById('rating-label');
    
    // すべての星をリセット
    stars.forEach(star => {
        star.textContent = '☆';
        star.classList.remove('selected');
    });
    
    // 選択された星数まで塗りつぶす
    for (let i = 0; i < rating; i++) {
        stars[i].textContent = '★';
        stars[i].classList.add('selected');
    }
    
    // ラベルの更新
    if (rating === 1) {
        ratingLabel.textContent = "I'm not convinced 😕";
    } else if (rating === 2) {
        ratingLabel.textContent = "It's pretty good 👍";
    } else if (rating === 3) {
        ratingLabel.textContent = "Totally spot on! 🔥";
    }
}

// フィードバックフォームを表示する関数
function showFeedbackForm() {
    // Get overlay element
    const overlay = document.getElementById('overlay');
    if (overlay) {
        // Make sure display property is explicitly set to 'flex'
        overlay.style.display = 'flex';
    }
    
    // Show the email input popup
    const emailPopup = document.getElementById('email-popup');
    if (emailPopup) {
        emailPopup.classList.remove('hidden');
    }
}

// メールアドレス入力画面を表示
function showEmailInput() {
    // Show email input popup
    const emailPopup = document.getElementById('email-popup');
    if (emailPopup) {
        emailPopup.classList.remove('hidden');
        
        // Set existing email if available
        const emailInput = document.getElementById('user-email');
        if (emailInput) {
            emailInput.value = getUserEmail() || '';
        }
    } else {
        // console.error('email-popup not found');
    }
}

// 診断結果表示後に評価ポップアップを表示
function showSatisfactionPopup() {
    // Hide email input popup
    const emailPopup = document.getElementById('email-popup');
    if (emailPopup) {
        emailPopup.classList.add('hidden');
    }

    // Save email address
    const emailInput = document.getElementById('user-email');
    if (emailInput && emailInput.value.trim()) {
        localStorage.setItem('user_email', emailInput.value.trim());
    }
    
    // Show rating popup
    const satisfactionPopup = document.getElementById('satisfaction-popup');
    if (satisfactionPopup) {
        satisfactionPopup.classList.remove('hidden');
    } else {
        // console.error('satisfaction-popup not found');
    }
    
    // Reset state
    selectedRating = 0;
    selectedFeedbackOption = '';
    selectedFeedbackOptionCode = '';
    
    // Reset star display
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.textContent = '☆';
        star.classList.remove('selected');
    });
    
    const ratingLabel = document.getElementById('rating-label');
    if (ratingLabel) {
        ratingLabel.textContent = 'Select your rating';
    }
}

// 評価送信処理
function submitRating() {
    if (!selectedRating) {
        alert('Please select a rating ⭐');
        return;
    }

    // Show feedback popup if rating is 1
    if (selectedRating === 1) {
        document.getElementById('satisfaction-popup').classList.add('hidden');
        document.getElementById('feedback-popup').classList.remove('hidden');
    } else {
        // Submit data directly if rating is 2 or higher
        completeSubmission();
    }
}

// すべてのポップアップを閉じる
function closeAllPopups() {
    // Hide all popups
    const popups = ['thanks-popup', 'satisfaction-popup', 'feedback-popup'];
    popups.forEach(popupId => {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('hidden');
        }
    });
    
    // Hide overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ページ読み込み時の初期化処理
document.addEventListener('DOMContentLoaded', function() {
    initDiagnosisSection();
});





